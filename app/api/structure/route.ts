import {
  LLM_CONFIGURATION_ERROR,
  LLM_TIMEOUT_ERROR,
  prepareVisitReport,
  structureRequestSchema,
} from "@/lib/llm";

export const maxDuration = 30;
const MAX_BODY_BYTES = 256 * 1024;
const headers = { "Cache-Control": "no-store" };

class BodyAbortError extends Error {}

function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers });
}

async function readChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (signal.aborted) throw new BodyAbortError();
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new BodyAbortError());
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([reader.read(), aborted]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}

export async function POST(request: Request): Promise<Response> {
  const timeout = AbortSignal.timeout(25_000);
  const signal = AbortSignal.any([request.signal, timeout]);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return error("Content-Type must be application/json.", 415);
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return error("Request is too large.", 413);

  const reader = request.body?.getReader();
  if (!reader) return error("Request body is required.", 400);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await readChunk(reader, signal);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return error("Request is too large.", 413);
      }
      chunks.push(value);
    }
  } catch {
    if (signal.aborted) {
      void reader.cancel(signal.reason).catch(() => undefined);
      return timeout.aborted
        ? error("English report preparation timed out. Please retry.", 504)
        : error("Request was cancelled.", 499);
    }
    return error("Request body could not be read.", 400);
  } finally {
    try { reader.releaseLock(); } catch { /* cancellation settles the pending read */ }
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks));

  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return error("Request body must be valid JSON.", 400);
  }
  const parsed = structureRequestSchema.safeParse(input);
  if (!parsed.success) return error("Saved visit data is invalid.", 400);

  try {
    return Response.json(await prepareVisitReport(parsed.data, signal), { headers });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message.includes(LLM_CONFIGURATION_ERROR)) return error("English report preparation is not configured.", 503);
    if (message.includes(LLM_TIMEOUT_ERROR) || signal.aborted) return error("English report preparation timed out. Please retry.", 504);
    return error("English report preparation failed. Please retry.", 502);
  }
}

import {
  LLM_CONFIGURATION_ERROR,
  LLM_TIMEOUT_ERROR,
  prepareVisitReport,
  structureRequestSchema,
} from "@/lib/llm";

export const maxDuration = 30;
const MAX_BODY_BYTES = 256 * 1024;
const headers = { "Cache-Control": "no-store" };

function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers });
}

export async function POST(request: Request): Promise<Response> {
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
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return error("Request is too large.", 413);
      }
      chunks.push(value);
    }
  } catch {
    return error("Request body could not be read.", 400);
  } finally {
    reader.releaseLock();
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

  const timeout = AbortSignal.timeout(25_000);
  const signal = AbortSignal.any([request.signal, timeout]);
  try {
    return Response.json(await prepareVisitReport(parsed.data, signal), { headers });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message.includes(LLM_CONFIGURATION_ERROR)) return error("English report preparation is not configured.", 503);
    if (message.includes(LLM_TIMEOUT_ERROR) || signal.aborted) return error("English report preparation timed out. Please retry.", 504);
    return error("English report preparation failed. Please retry.", 502);
  }
}

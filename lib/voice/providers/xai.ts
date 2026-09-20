import { z } from "zod";
import { xaiApiKey } from "@/lib/voice/xai-key";

export type XaiSttLang = "ur" | "en";

const wordSchema = z.object({
  text: z.string(),
  start: z.number().finite().nonnegative(),
  end: z.number().finite().nonnegative(),
});

const sttSchema = z.object({
  text: z.string().max(20_000),
  language: z.string().nullish(),
  words: z.array(z.unknown()).max(20_000).nullish(),
});

const chatSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.union([
        z.string(),
        z.array(z.object({ text: z.string().optional() })),
      ]).nullish(),
    }),
  })).min(1),
});

export type XaiSttResult = {
  text: string;
  language: string | null;
  words: { text: string; start: number; end: number }[];
};

export class XaiVoiceError extends Error {
  constructor(
    readonly kind:
      | "configuration"
      | "timeout"
      | "busy"
      | "no-speech"
      | "unreadable-audio"
      | "invalid-response"
      | "upstream",
  ) {
    super(`xAI ${kind}`);
  }
}

function abortWithTimeout(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(60_000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function xaiFetch(url: string, init: RequestInit, signal?: AbortSignal) {
  try {
    return await fetch(url, { ...init, signal: abortWithTimeout(signal) });
  } catch (error) {
    if ((error as Error).name === "AbortError" || (error as Error).name === "TimeoutError")
      throw new XaiVoiceError("timeout");
    throw new XaiVoiceError("upstream");
  }
}

function throwForVoiceStatus(status: number) {
  if (status === 401 || status === 403) throw new XaiVoiceError("configuration");
  if (status === 429) throw new XaiVoiceError("busy");
  if (status === 400 || status === 422) throw new XaiVoiceError("unreadable-audio");
  if (status < 200 || status >= 300) throw new XaiVoiceError("upstream");
}

function throwForChatStatus(status: number) {
  if (status === 401 || status === 403) throw new XaiVoiceError("configuration");
  if (status === 429) throw new XaiVoiceError("busy");
  if (status < 200 || status >= 300) throw new XaiVoiceError("upstream");
}

const DEVANAGARI = /[\u0900-\u097F]/;
const ARABIC = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]{3}/;

function unwrap(text: string) {
  return text.replace(/^```(?:\w+)?\s*|\s*```$/g, "").trim();
}

export async function transcribeXaiStt(
  file: File,
  signal?: AbortSignal,
): Promise<XaiSttResult> {
  const key = xaiApiKey();
  if (!key) throw new XaiVoiceError("configuration");
  const form = new FormData();
  form.append("diarize", "false");
  form.append("file", file, file.name);
  const response = await xaiFetch(
    "https://api.x.ai/v1/stt",
    { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form },
    signal,
  );
  throwForVoiceStatus(response.status);
  const parsed = sttSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new XaiVoiceError("invalid-response");
  const text = parsed.data.text;
  if (!text.trim()) throw new XaiVoiceError("no-speech");
  const words = (parsed.data.words ?? []).flatMap((word) => {
    const row = wordSchema.safeParse(word);
    if (!row.success || row.data.end < row.data.start) return [];
    return [{ text: row.data.text, start: row.data.start, end: row.data.end }];
  });
  return {
    text,
    language: parsed.data.language?.trim() || null,
    words,
  };
}

export async function rewriteXaiTranscript(
  text: string,
  language: XaiSttLang,
  signal?: AbortSignal,
): Promise<string> {
  const key = xaiApiKey();
  if (!key) throw new XaiVoiceError("configuration");
  const system = language === "ur"
    ? "You convert a patient's spoken transcript into written Urdu. Output only Urdu in Arabic/Nastaliq script. Never use Devanagari or Hindi. Do not translate into English. Keep medicine brand names as spoken. No quotes, labels or preamble."
    : "You translate a patient's spoken transcript into clear English. Output only English. Do not leave Hindi or Urdu sentences. Keep medicine brand names. No quotes, labels or preamble.";
  const models = ["grok-4-fast-non-reasoning", "grok-4.20-0309-non-reasoning", "grok-4-fast"];
  let response: Response | null = null;
  for (const model of models) {
    response = await xaiFetch(
      "https://api.x.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: "system", content: system },
            { role: "user", content: text.slice(0, 15_000) },
          ],
        }),
      },
      signal,
    );
    if (response.status === 400 || response.status === 404) continue;
    break;
  }
  if (!response) throw new XaiVoiceError("upstream");
  throwForChatStatus(response.status);
  const parsed = chatSchema.safeParse(await response.json().catch(() => null));
  const raw = parsed.success ? parsed.data.choices[0].message.content : "";
  const out = unwrap(
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((part) => part.text ?? "").join("")
        : "",
  );
  if (!out) throw new XaiVoiceError("invalid-response");
  if (language === "ur" && (DEVANAGARI.test(out) || !ARABIC.test(out)))
    throw new XaiVoiceError("invalid-response");
  if (language === "en" && (DEVANAGARI.test(out) || !LATIN.test(out)))
    throw new XaiVoiceError("invalid-response");
  return out;
}

export async function synthesizeXaiSpeech(
  text: string,
  language: XaiSttLang,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const key = xaiApiKey();
  if (!key) throw new XaiVoiceError("configuration");
  const spoken = text.slice(0, 15_000);
  if (!spoken.trim()) throw new XaiVoiceError("no-speech");
  const codes = language === "en" ? ["en"] : ["auto", "ar-SA"];
  let last: XaiVoiceError | null = null;
  for (const code of codes) {
    const response = await xaiFetch(
      "https://api.x.ai/v1/tts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: spoken,
          voice_id: "eve",
          language: code,
          output_format: { codec: "mp3" },
        }),
      },
      signal,
    );
    if (response.status === 400 || response.status === 422) {
      last = new XaiVoiceError("unreadable-audio");
      continue;
    }
    throwForVoiceStatus(response.status);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength) throw new XaiVoiceError("invalid-response");
    return {
      bytes,
      contentType: response.headers.get("content-type") || "audio/mpeg",
    };
  }
  throw last ?? new XaiVoiceError("upstream");
}

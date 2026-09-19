// xAI Grok Voice Transcribe 2.0 (batch). Placeholder vendor until the bake-off decides.
// REST: POST https://api.x.ai/v1/stt, multipart. Plain fetch, no SDK, so no new dependency.
//
// Known gaps (docs.x.ai, 2026-09-19):
// - Urdu is not in the documented language list; Hindi is. We never send language=ur, we
//   let Grok auto-detect and report what it heard, so an unsupported language shows up as
//   `lang: null` instead of a 400.
// - WebM is not a listed container (OGG, Opus, MKV are). Chrome's MediaRecorder emits webm/opus.
// - No per-word confidence and no language probability in the response.

import { parseLang } from "../lang";
import { SttError, type ProviderRequest, type ProviderResult } from "../types";

const URL = "https://api.x.ai/v1/stt";
export const GROK_MODELS = ["grok-voice-transcribe-2.0"] as const;
const GROK_LANGS = new Set(["hi", "en"]); // of ours, the ones xAI documents
const TIMEOUT_MS = 40_000; // same per-provider budget as the others; see the route's maxDuration

type GrokResponse = {
  text: string;
  language?: string;
  duration?: number;
  words?: { text: string; start?: number; end?: number }[];
};

export const hasGrokKey = () => Boolean(process.env.XAI_API_KEY);

export async function transcribeGrok(audio: Blob, req: ProviderRequest): Promise<ProviderResult> {
  const model = req.model ?? GROK_MODELS[0];
  const sendLang = req.lang && GROK_LANGS.has(req.lang) ? req.lang : null;

  const form = new FormData();
  form.append("model", model);
  if (sendLang) {
    form.append("language", sendLang);
    form.append("format", "true"); // punctuation + casing; xAI requires `language` with it
  }
  // Max 100 keyterms, 50 chars each; the field repeats once per term.
  for (const term of req.keyterms.slice(0, 100)) form.append("keyterm", term);
  // xAI: `file` must be the last field. The filename's extension helps format detection.
  form.append("file", audio, audio instanceof File && audio.name ? audio.name : "audio.webm");

  let res: Response;
  try {
    res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") throw new SttError("grok", "timeout");
    throw err;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SttError("grok", "upstream", res.status, res.headers.get("x-request-id") ?? undefined, body.slice(0, 500));
  }

  const data = (await res.json()) as GrokResponse;
  return {
    text: data.text.trim(),
    lang: parseLang(data.language),
    languageCode: data.language ?? "",
    languageProbability: null,
    seconds: data.duration ?? null,
    words: (data.words ?? []).map(w => ({ text: w.text, start: w.start ?? null, end: w.end ?? null, logprob: null })),
    model,
    source: "grok",
  };
}

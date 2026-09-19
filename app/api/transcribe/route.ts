import { NextResponse } from "next/server";
import { demoKeyterms } from "@/lib/voice/keyterms";
import { isSttLang } from "@/lib/voice/lang";
import { allowedOn, MODELS, STT_PROVIDERS, SttChainError, SttError, transcribe, type SttProvider } from "@/lib/voice/stt";

// Up to three providers at 40 s each in the worst case; a normal clip takes seconds.
export const maxDuration = 130;

// Recording 1 is ~3 min of webm/opus, well under 5 MB. Gemini takes at most 20 MB inline.
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * POST multipart/form-data
 *   audio     File, required (webm/opus from MediaRecorder, or any major format)
 *   lang      "ur" | "hi" | "en", optional. Set "ur" for Recording 1 (P2); omit to auto-detect (P3).
 *   keyterms  "demo" (default) | "none"
 *   provider  bake-off only: run one provider, no fallback (grok only with lang=en)
 *   model     bake-off only, with provider: a model of that provider
 * → 200 Transcript, with `attempts` showing every provider tried.
 *   `source: "canned"` when no provider in the chain has a key.
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "audio file required" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "audio too large" }, { status: 413 });
  }

  const lang = form.get("lang");
  if (lang !== null && !isSttLang(lang)) {
    return NextResponse.json({ error: "lang must be ur, hi or en" }, { status: 400 });
  }

  const provider = form.get("provider");
  if (provider !== null && !STT_PROVIDERS.includes(provider as SttProvider)) {
    return NextResponse.json({ error: `provider must be one of ${STT_PROVIDERS.join(", ")}` }, { status: 400 });
  }
  if (provider !== null && !allowedOn(provider as SttProvider, lang ?? undefined)) {
    return NextResponse.json({ error: `${provider} is English-only; set lang=en` }, { status: 400 });
  }

  const model = form.get("model");
  if (model !== null) {
    if (provider === null) {
      return NextResponse.json({ error: "model needs provider" }, { status: 400 });
    }
    const models = MODELS[provider as SttProvider];
    if (!models.includes(model as string)) {
      return NextResponse.json({ error: `model for ${provider} must be one of ${models.join(", ")}` }, { status: 400 });
    }
  }

  const keyterms = form.get("keyterms") === "none" ? [] : demoKeyterms();

  try {
    const transcript = await transcribe(audio, {
      lang: lang ?? undefined,
      keyterms,
      only: (provider as SttProvider | null) ?? undefined,
      model: (model as string | null) ?? undefined,
    });
    return NextResponse.json(transcript);
  } catch (err) {
    if (err instanceof SttChainError) {
      console.error("[transcribe]", err.message);
      return NextResponse.json({ error: "transcription failed", attempts: err.attempts }, { status: 502 });
    }
    if (err instanceof SttError) {
      console.error("[transcribe]", err.provider, err.kind, err.status, err.requestId, err.body);
      return NextResponse.json(
        { error: err.kind === "timeout" ? "transcription timed out" : "transcription failed", provider: err.provider, upstream: err.status ?? null },
        { status: err.kind === "timeout" ? 504 : 502 },
      );
    }
    throw err;
  }
}

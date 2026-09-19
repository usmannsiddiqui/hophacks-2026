// Server-only. The one seam between the app and speech-to-text vendors (docs/elevenlabs/plan.md).
//
// A fallback chain, chosen by the language we expect:
//   her voice (ur, hi, or auto-detect)  STT_CHAIN_URDU     default "gemini,scribe"
//   English only (lang=en)              STT_CHAIN_ENGLISH  default "grok,scribe,gemini"
// Each provider is tried in order; a missing key, an error, or a transcript that fails
// accept.ts (empty, wrong language, wrong script) moves to the next. Grok is never used
// on her voice: Urdu is not in its documented languages. Put the Urdu bake-off winner first.
// If no provider has a key, the canned transcript comes back so every screen still renders.

import { rejectReason } from "./accept";
import { cannedTranscript } from "./canned";
import type { SttLang } from "./lang";
import { GEMINI_MODELS, hasGeminiKey, transcribeGemini } from "./providers/gemini";
import { GROK_MODELS, hasGrokKey, transcribeGrok } from "./providers/grok";
import { hasScribeKey, SCRIBE_MODELS, transcribeScribe } from "./providers/scribe";
import {
  SttChainError, SttError,
  type Attempt, type ProviderRequest, type ProviderResult, type SttProvider, type Transcript,
} from "./types";

export { scribeRealtimeToken, hasScribeKey } from "./providers/scribe";
export { SttChainError, SttError, type Attempt, type SttProvider, type Transcript, type Word } from "./types";

export const STT_PROVIDERS: SttProvider[] = ["scribe", "gemini", "grok"];

export const MODELS: Record<SttProvider, readonly string[]> = {
  scribe: SCRIBE_MODELS,
  gemini: GEMINI_MODELS,
  grok: GROK_MODELS,
};

/** Providers allowed on her voice. Enforced here, not in config. */
const HER_VOICE_OK: ReadonlySet<SttProvider> = new Set(["scribe", "gemini"]);

const PROVIDERS: Record<SttProvider, {
  hasKey: () => boolean;
  run: (audio: Blob, req: ProviderRequest) => Promise<ProviderResult>;
}> = {
  scribe: { hasKey: hasScribeKey, run: transcribeScribe },
  gemini: { hasKey: hasGeminiKey, run: transcribeGemini },
  grok: { hasKey: hasGrokKey, run: transcribeGrok },
};

export type TranscribeOptions = {
  /** Omit to auto-detect (P3 live translate). Set it for Recording 1 (P2). */
  lang?: SttLang;
  keyterms?: string[];
  /** Bake-off only: one provider, no fallback, no acceptance check. */
  only?: SttProvider;
  /** With `only`: a model belonging to that provider (see MODELS). */
  model?: string;
};

function parseChain(env: string | undefined, fallback: SttProvider[]): SttProvider[] {
  const list = (env ?? "").split(",").map(s => s.trim()).filter((s): s is SttProvider => s in PROVIDERS);
  return list.length ? [...new Set(list)] : fallback;
}

/** The ordered providers for a call. Her voice never gets Grok, whatever the env says. */
export function chainFor(lang?: SttLang): SttProvider[] {
  if (lang === "en") return parseChain(process.env.STT_CHAIN_ENGLISH, ["grok", "scribe", "gemini"]);
  return parseChain(process.env.STT_CHAIN_URDU, ["gemini", "scribe"]).filter(p => HER_VOICE_OK.has(p));
}

/** Grok only on English; everything else may take any language. */
export function allowedOn(provider: SttProvider, lang?: SttLang): boolean {
  return lang === "en" || HER_VOICE_OK.has(provider);
}

function failure(err: unknown): Pick<Attempt, "outcome" | "detail"> {
  if (err instanceof SttError) {
    return { outcome: err.kind, detail: [err.status, err.requestId, typeof err.body === "string" ? err.body : ""].filter(Boolean).join(" ") || undefined };
  }
  return { outcome: "upstream", detail: err instanceof Error ? err.message : String(err) };
}

/** Transcribe one clip in its original language. Translation is a separate step (ADR 0003). */
export async function transcribe(audio: Blob, opts: TranscribeOptions = {}): Promise<Transcript> {
  const req: ProviderRequest = { lang: opts.lang, keyterms: opts.keyterms ?? [], model: opts.model };

  if (opts.only) {
    const p = PROVIDERS[opts.only];
    if (!p.hasKey()) return cannedTranscript(opts.lang, [{ provider: opts.only, outcome: "no-key" }]);
    const result = await p.run(audio, req);
    const reason = rejectReason(result, opts.lang);
    return { ...result, attempts: [{ provider: opts.only, outcome: reason ? "rejected" : "ok", detail: reason ?? undefined }] };
  }

  const attempts: Attempt[] = [];
  for (const provider of chainFor(opts.lang)) {
    const p = PROVIDERS[provider];
    if (!p.hasKey()) {
      attempts.push({ provider, outcome: "no-key" });
      continue;
    }
    try {
      const result = await p.run(audio, { ...req, model: undefined });
      const reason = rejectReason(result, opts.lang);
      if (reason) {
        attempts.push({ provider, outcome: "rejected", detail: reason });
        continue;
      }
      attempts.push({ provider, outcome: "ok" });
      return { ...result, attempts };
    } catch (err) {
      attempts.push({ provider, ...failure(err) });
      console.warn("[stt]", provider, "failed, trying next:", err);
    }
  }

  if (attempts.every(a => a.outcome === "no-key")) return cannedTranscript(opts.lang, attempts);
  throw new SttChainError(attempts);
}

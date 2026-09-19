import type { SttLang } from "./lang";

export type SttProvider = "scribe" | "gemini" | "grok";

export type Word = { text: string; start: number | null; end: number | null; logprob: number | null };

/** One try in the fallback chain, in order. Kept on the result so failures are visible. */
export type Attempt = {
  provider: SttProvider;
  outcome: "ok" | "no-key" | "timeout" | "upstream" | "rejected";
  detail?: string;
};

/** The one shape every caller sees, whichever vendor produced it. */
export type Transcript = {
  text: string;
  lang: SttLang | null; // null: the vendor heard something we do not handle
  languageCode: string; // raw vendor label, for debugging
  languageProbability: number | null; // only Scribe reports one
  seconds: number | null;
  words: Word[]; // empty for Gemini (no word timings)
  model: string;
  source: SttProvider | "canned";
  attempts: Attempt[];
};

/** A provider's raw result, before the chain adds `attempts`. */
export type ProviderResult = Omit<Transcript, "attempts">;

/** What stt.ts hands a provider after resolving defaults. */
export type ProviderRequest = { lang?: SttLang; keyterms: string[]; model?: string };

/** Vendor failure, normalised so the routes never import a vendor's error classes. */
export class SttError extends Error {
  constructor(
    readonly provider: SttProvider,
    readonly kind: "timeout" | "upstream",
    readonly status?: number,
    readonly requestId?: string,
    readonly body?: unknown,
  ) {
    super(`${provider} ${kind}${status ? ` ${status}` : ""}`);
  }
}

/** Every provider in the chain failed or was skipped. */
export class SttChainError extends Error {
  constructor(readonly attempts: Attempt[]) {
    super(`all STT providers failed: ${attempts.map(a => `${a.provider}=${a.outcome}`).join(", ")}`);
  }
}

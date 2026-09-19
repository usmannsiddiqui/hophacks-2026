// The app speaks ISO-639-1. Vendors disagree: Scribe returns ISO-639-3 ("urd", "eng"),
// Grok takes BCP-47 ("en", "hi"). Hindi is the ADR 0003 fallback, so STT knows it even
// though `Lang` in lib/types.ts does not (yet).

export type SttLang = "ur" | "hi" | "en";

const TO_ISO3: Record<SttLang, string> = { ur: "urd", hi: "hin", en: "eng" };

const PARSE: Record<string, SttLang> = {
  ur: "ur", urd: "ur", urdu: "ur",
  hi: "hi", hin: "hi", hindi: "hi",
  en: "en", eng: "en", english: "en",
};

export const STT_LANGS = Object.keys(TO_ISO3) as SttLang[];

export function isSttLang(x: unknown): x is SttLang {
  return typeof x === "string" && x in TO_ISO3;
}

export function toIso3(lang: SttLang): string {
  return TO_ISO3[lang];
}

/** Any vendor's language label ("urd", "en-US", "Hindi") → ours, or null if we do not handle it. */
export function parseLang(code: string | undefined | null): SttLang | null {
  if (!code) return null;
  return PARSE[code.toLowerCase().split(/[-_]/)[0]] ?? null;
}

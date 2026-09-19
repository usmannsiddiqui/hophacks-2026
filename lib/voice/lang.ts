// Normalize Scribe language labels so the Urdu-only provider can reject an explicit
// non-Urdu result. Keep English and Hindi aliases for that rejection path.

export type SttLang = "ur" | "hi" | "en";

const PARSE: Record<string, SttLang> = {
  ur: "ur",
  urd: "ur",
  urdu: "ur",
  hi: "hi",
  hin: "hi",
  hindi: "hi",
  en: "en",
  eng: "en",
  english: "en",
};

/** Any vendor's language label ("urd", "en-US", "Hindi") → ours, or null if we do not handle it. */
export function parseLang(code: string | undefined | null): SttLang | null {
  if (!code) return null;
  return PARSE[code.toLowerCase().split(/[-_]/)[0]] ?? null;
}

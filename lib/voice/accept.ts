// Does a transcript look like what we asked for? The chain moves on when it does not.
// The script check matters most: spoken Urdu and Hindi are close enough that an engine can
// "hear Hindi" and return Devanagari for Nani's Urdu. That must never reach `herWords`.

import type { SttLang } from "./lang";
import type { ProviderResult } from "./types";

const SCRIPT: Record<SttLang, RegExp> = {
  ur: /\p{Script=Arabic}/u,
  hi: /\p{Script=Devanagari}/u,
  en: /\p{Script=Latin}/u,
};

// Urdu speech often carries Latin brand names ("Panadol"), so demand a majority, not all.
const MIN_SHARE = 0.6;

function scriptShare(text: string, lang: SttLang): number {
  const letters = [...text].filter(c => /\p{L}/u.test(c));
  if (!letters.length) return 0;
  return letters.filter(c => SCRIPT[lang].test(c)).length / letters.length;
}

/** null when acceptable, otherwise the reason it was rejected. */
export function rejectReason(t: ProviderResult, want?: SttLang): string | null {
  if (!t.text) return "empty transcript";
  const lang = want ?? t.lang;
  if (!lang) return `unhandled language "${t.languageCode}"`;
  if (want && t.lang && t.lang !== want) return `heard ${t.lang}, wanted ${want}`;
  // Auto-detect is for live translate: Urdu is hers, English is yours. Hindi there is a misheard Urdu.
  if (!want && lang === "hi") return "heard hi on auto-detect; expected ur or en";
  const share = scriptShare(t.text, lang);
  if (share < MIN_SHARE) return `only ${Math.round(share * 100)}% ${lang} script`;
  return null;
}

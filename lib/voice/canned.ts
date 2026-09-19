import canned from "@/data/files/mw-1042.json";
import type { SttLang } from "./lang";
import type { Attempt, Transcript } from "./types";

const rec = (canned as { recordings: { seconds: number; urdu: string; english: string }[] }).recordings[0];

/**
 * What /api/transcribe returns when no provider in the chain has a key: Recording 1 of the
 * canned file, so P2 and P3 render on a fresh clone. Marked `source: "canned"` so no one
 * mistakes it for a real transcript.
 */
export function cannedTranscript(lang: SttLang | undefined, attempts: Attempt[]): Transcript {
  const english = lang === "en";
  return {
    text: english ? rec.english : rec.urdu,
    lang: english ? "en" : "ur",
    languageCode: english ? "eng" : "urd",
    languageProbability: 1,
    seconds: rec.seconds,
    words: [],
    model: "canned",
    source: "canned",
    attempts,
  };
}

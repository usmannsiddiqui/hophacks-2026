// The boundary with ElevenLabs Scribe. Stream B has not built the mic path yet, so this
// file states what the structure step expects to be handed, and nothing here calls out.
//
// Two things matter downstream: the Urdu text (what she actually said, per ADR 0003 —
// never a dub) and the word timings, which are what let a med item point back at the
// second of the recording it came from instead of carrying `t: 0`.

import type { Recording, SourceRef } from "@/lib/types";

/** A word as Scribe returns it. `speaker_id` is deliberately ignored — ADR 0007. */
export type ScribeWord = {
  text: string;
  start: number;
  end: number;
  type?: "word" | "spacing" | "audio_event";
};

/** The shape of a Scribe speech-to-text response, narrowed to the parts we use. */
export type ScribeTranscript = {
  language_code: string;
  language_probability?: number;
  text: string;
  words?: ScribeWord[];
};

/** What the structure step needs: her words, the English of them, and the timings. */
export type TranscriptInput = {
  n: number;
  seconds: number;
  urdu: string;
  english: string;
  words?: ScribeWord[];
};

const isWord = (w: ScribeWord) => w.type === undefined || w.type === "word";

/**
 * Scribe result + its English translation -> the Recording the contract expects.
 * `speaker` is hard-coded, never inferred: the app opened the mic for her alone.
 */
export function toRecording(input: TranscriptInput): Recording {
  return {
    n: input.n,
    speaker: "patient",
    seconds: Math.round(input.seconds),
    urdu: input.urdu.trim(),
    english: input.english.trim(),
    answers: [],
  };
}

/** Strip Urdu diacritics and punctuation so a quote matches the word stream loosely. */
function normalise(s: string): string {
  return s
    .replace(/[ً-ٰٟۖ-ۭ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find the second of the recording where `quote` was spoken, by sliding the quote's
 * words over the Scribe word stream. Returns null rather than guessing when the quote
 * is not in the stream — a wrong timestamp is worse than an absent one, because the
 * pharmacist uses it to replay the audio and check us.
 */
export function locate(words: ScribeWord[] | undefined, quote: string): number | null {
  if (!words?.length || !quote.trim()) return null;
  const stream = words.filter(isWord);
  const target = normalise(quote).split(" ").filter(Boolean);
  if (!target.length) return null;

  const tokens = stream.map(w => normalise(w.text));
  let best: { at: number; hits: number } | null = null;

  for (let i = 0; i + target.length <= tokens.length; i++) {
    let hits = 0;
    for (let k = 0; k < target.length; k++) if (tokens[i + k] === target[k]) hits++;
    if (!best || hits > best.hits) best = { at: i, hits };
  }
  // Demand most of the quote, so a one-word coincidence does not win.
  if (!best || best.hits < Math.ceil(target.length * 0.6)) return null;
  return Math.round(stream[best.at].start);
}

/** Where a med item or question came from, resolved against the word stream. */
export function sourceRef(n: number, words: ScribeWord[] | undefined, quote: string): SourceRef {
  return { recording: n, t: locate(words, quote) ?? 0 };
}

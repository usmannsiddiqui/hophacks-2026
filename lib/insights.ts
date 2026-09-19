// What the interaction table says about a med list, worked out without the model.
//
// computeFlags (lib/flags.ts) answers "what is citable". This answers the other half:
// which pairs the table knows about but cannot cite, and which items we could not name
// at all. Both are questions, never flags -- but they are questions we can prove are
// owed, so we can check whether the model actually raised them.

import { computeFlags } from "@/lib/flags";
import type { Flag, MedItem, Question } from "@/lib/types";
import { UNIDENTIFIED, canFlag, displayOf, interactionBetween, type Interaction } from "@/lib/vocab";

export type OwedQuestion =
  | { kind: "pair"; a: MedItem; b: MedItem; row: Interaction }
  | { kind: "unidentified"; item: MedItem };

export type Insights = {
  flags: Flag[];
  /** Questions the table says are owed, whether or not anyone has asked them. */
  owed: OwedQuestion[];
  /** Owed questions with nothing in `questions` that plausibly covers them. */
  uncovered: OwedQuestion[];
};

/**
 * Pairs the table knows about but will not flag -- either too minor to raise on its own,
 * or clinically real but without a source we can put on screen. ADR 0001 says those
 * become questions. This finds them.
 */
export function owedQuestions(medList: MedItem[]): OwedQuestion[] {
  const owed: OwedQuestion[] = [];

  for (let i = 0; i < medList.length; i++) {
    for (let j = i + 1; j < medList.length; j++) {
      const a = medList[i], b = medList[j];
      const row = interactionBetween(a.term, b.term);
      if (row && !canFlag(row)) owed.push({ kind: "pair", a, b, row });
    }
  }

  for (const item of medList) {
    if (item.term === UNIDENTIFIED) owed.push({ kind: "unidentified", item });
  }

  return owed;
}

/** Content words, punctuation and Urdu diacritics removed, for loose comparison. */
function tokens(s: string): string[] {
  return s
    .replace(/[ً-ٰٟۖ-ۭ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * A loose check: does any question already point at this thing? Loose on purpose --
 * she says "the hakeem's powder, at night" and the question asks about "the hakeem's
 * powder", so an exact substring match would report a gap that is not there.
 */
function covers(q: Question, owe: OwedQuestion): boolean {
  const hay = new Set(tokens(`${q.text.english} ${q.text.urdu} ${q.why}`));

  if (owe.kind === "unidentified") {
    const want = tokens(owe.item.herWords ?? "");
    if (!want.length) return false;
    const hits = want.filter(t => hay.has(t)).length;
    return hits >= Math.ceil(want.length * 0.6);
  }

  const named = (term: string) =>
    tokens(displayOf(term)).some(t => hay.has(t)) || hay.has(term.toLowerCase());
  return named(owe.a.term) && named(owe.b.term);
}

/**
 * The whole deterministic read of a med list: what is citable, what is owed, and what
 * is owed but missing. `uncovered` is reported rather than papered over -- inventing
 * the Urdu for a question nobody wrote would be worse than saying it is not there.
 */
export function readMedList(medList: MedItem[], questions: Question[]): Insights {
  const owed = owedQuestions(medList);
  return {
    flags: computeFlags(medList),
    owed,
    uncovered: owed.filter(o => !questions.some(q => covers(q, o))),
  };
}

/** One line per owed question, for the API response and the console. */
export function describe(owe: OwedQuestion): string {
  return owe.kind === "unidentified"
    ? `unidentified: ${owe.item.herWords ?? owe.item.id}`
    : `${displayOf(owe.a.term)} + ${displayOf(owe.b.term)} [${owe.row.severity}] ${owe.row.ask}`;
}

// The closed vocabulary and the interaction table, read from data/substances.json.
// This is the source of truth for "what counts as a substance" and "what mixes badly".
// It is built before a transcript is ever looked at: Gemini may only choose from what
// lives here (ADR 0001), and a flag may only come from a row here that carries a source.

import substances from "@/data/substances.json";

export type Category = "prescription" | "otc" | "supplement" | "herbal" | "lifestyle";
export type TableSeverity = "major" | "moderate" | "minor";

export type Substance = {
  id: string;
  display: string;
  category: Category;
  class?: string;
  aliases?: string[];
  aliases_es?: string[];
  aliases_ur?: string[];
  under_reported?: boolean;
  note?: string;
};

export type Interaction = {
  a: string;
  b: string;
  severity: TableSeverity;
  effect: string;
  ask: string;
  source?: string;
};

const data = substances as unknown as {
  substances: Substance[];
  interactions: Interaction[];
  severity_levels: Record<TableSeverity, string>;
};

/** The term used when she described something we cannot name. Never flags, always asks. */
export const UNIDENTIFIED = "unidentified";

/** One-line ask for an unnamed thing, using her words as X. */
export function unidentifiedAsk(herWords: string | null): string {
  const x = herWords?.replace(/\s+/g, " ").trim();
  if (!x) return "Detected something she takes. What is it?";
  return `Detected some ${x}. What is it?`;
}

export const SUBSTANCES: Substance[] = data.substances;
export const INTERACTIONS: Interaction[] = data.interactions;

const byId = new Map(SUBSTANCES.map(s => [s.id, s]));

export function substanceById(id: string): Substance | null {
  return byId.get(id) ?? null;
}

/** A term Gemini returns is only accepted if it is in this file, or the escape hatch. */
export function isKnownTerm(term: string): boolean {
  return term === UNIDENTIFIED || byId.has(term);
}

export function displayOf(term: string): string {
  return term === UNIDENTIFIED ? "unidentified" : (byId.get(term)?.display ?? term);
}

/**
 * Mirrors the rule in lib/flags.ts: a row becomes a Flag only if it is clinically
 * meaningful AND citable. Everything else is a question, never a flag (ADR 0001).
 */
export function canFlag(row: Interaction): boolean {
  return (row.severity === "major" || row.severity === "moderate") && Boolean(row.source);
}

const pairKey = (a: string, b: string) => [a, b].sort().join("::");
const table = new Map(INTERACTIONS.map(r => [pairKey(r.a, r.b), r]));

export function interactionBetween(a: string, b: string): Interaction | null {
  if (a === UNIDENTIFIED || b === UNIDENTIFIED) return null;
  return table.get(pairKey(a, b)) ?? null;
}

/** Every row in the table that touches at least one of these terms. */
export function interactionsTouching(terms: string[]): Interaction[] {
  const set = new Set(terms.filter(t => t !== UNIDENTIFIED));
  return INTERACTIONS.filter(r => set.has(r.a) || set.has(r.b));
}

/**
 * The closed vocabulary as the model sees it. Urdu aliases come first where we have
 * them, because the transcript is Urdu. `under_reported` is marked: those are the
 * substances people do not volunteer, which is the whole point of the product.
 */
export function vocabularyPrompt(): string {
  return SUBSTANCES.map(s => {
    const urdu = s.aliases_ur?.length ? ` | ur: ${s.aliases_ur.join(", ")}` : "";
    const en = s.aliases?.length ? ` | also: ${s.aliases.join(", ")}` : "";
    const flagged = s.under_reported ? " | under-reported" : "";
    return `${s.id} (${s.display}, ${s.category})${urdu}${en}${flagged}`;
  }).join("\n");
}

/**
 * The interaction table as the model sees it, with each row marked citable or not.
 * A citable row is handled deterministically by computeFlags and the model must not
 * restate it; a non-citable row is exactly the kind of thing worth a question.
 */
export function interactionPrompt(): string {
  return INTERACTIONS.map(r => {
    const mark = canFlag(r) ? "CITABLE" : "ASK-ONLY";
    return `${r.a} + ${r.b} [${r.severity}, ${mark}] ${r.effect} -> ${r.ask}`;
  }).join("\n");
}

export const SEVERITY_LEVELS = data.severity_levels;

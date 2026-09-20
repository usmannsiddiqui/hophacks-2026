import substances from "@/data/substances.json";
import type { Flag, MedItem } from "./types";

type Row = { a: string; b: string; severity: string; effect: string; ask: string; source?: string };
type Substance = { id: string; class?: string };

const data = substances as { interactions: Row[]; substances: Substance[] };
const rows = data.interactions;

/** term -> the `class:*` token the table uses for it, e.g. ibuprofen -> class:nsaid. */
const classToken = new Map(
  data.substances.filter(s => s.class).map(s => [s.id, `class:${s.class}`] as const),
);

const isClass = (token: string) => token.startsWith("class:");

/** The tokens a term can be matched by: its own id, and its class if it has one. */
function tokensFor(term: string): string[] {
  const klass = classToken.get(term);
  return klass ? [term, klass] : [term];
}

/** Map the data file's severity vocabulary onto the contract's. `minor` never becomes a flag. */
function severityOf(s: string): Flag["severity"] | null {
  if (s === "major" || s === "high") return "high";
  if (s === "moderate") return "moderate";
  return null;
}

/**
 * The row for a pair of terms, or null.
 *
 * Two thirds of the table is written against drug classes (`class:nsaid`), not
 * individual ids, so a term has to be matched by its class as well as by its own id or
 * those rows can never fire. Where both a specific row and a class row would match, the
 * specific one wins — "warfarin + aspirin" says more than "warfarin + an NSAID".
 *
 * A row whose two sides are the same token (`acetaminophen + acetaminophen`) is how the
 * table says "this one is dangerous twice over": two products with the same active
 * ingredient, which is the ordinary way people reach a paracetamol overdose.
 */
function rowFor(xTerm: string, yTerm: string): Row | null {
  const xs = tokensFor(xTerm);
  const ys = tokensFor(yTerm);
  let best: { row: Row; specificity: number } | null = null;

  for (const row of rows) {
    const matched =
      (xs.includes(row.a) && ys.includes(row.b)) || (xs.includes(row.b) && ys.includes(row.a));
    if (!matched) continue;
    const specificity = (isClass(row.a) ? 0 : 1) + (isClass(row.b) ? 0 : 1);
    if (!best || specificity > best.specificity) best = { row, specificity };
  }

  return best?.row ?? null;
}

/**
 * The only function that can produce a Flag (ADR 0001).
 * Pure: medList × interactions table → Flag[]. A row without a citation is skipped.
 */
export function computeFlags(medList: Array<Pick<MedItem, "id" | "term">>): Flag[] {
  const out: Flag[] = [];
  for (let i = 0; i < medList.length; i++) {
    for (let j = i + 1; j < medList.length; j++) {
      const x = medList[i], y = medList[j];
      if (x.term === "unidentified" || y.term === "unidentified") continue;
      const row = rowFor(x.term, y.term);
      if (!row) continue;
      const severity = severityOf(row.severity);
      if (!severity || !row.source) continue;
      out.push({ id: `flag_${x.id}_${y.id}`, severity, a: x.id, b: y.id, reason: row.effect, citation: row.source });
    }
  }
  return out.sort((p, q) => (p.severity === q.severity ? 0 : p.severity === "high" ? -1 : 1));
}

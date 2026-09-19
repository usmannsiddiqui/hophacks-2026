import substances from "@/data/substances.json";
import type { Flag, MedItem } from "./types";

type Row = { a: string; b: string; severity: string; effect: string; ask: string; source?: string };
const rows = (substances as { interactions: Row[] }).interactions;

/** Map the data file's severity vocabulary onto the contract's. `minor` never becomes a flag. */
function severityOf(s: string): Flag["severity"] | null {
  if (s === "major" || s === "high") return "high";
  if (s === "moderate") return "moderate";
  return null;
}

/**
 * The only function that can produce a Flag (ADR 0001).
 * Pure: medList × interactions table → Flag[]. A row without a citation is skipped.
 */
export function computeFlags(medList: MedItem[]): Flag[] {
  const out: Flag[] = [];
  for (let i = 0; i < medList.length; i++) {
    for (let j = i + 1; j < medList.length; j++) {
      const x = medList[i], y = medList[j];
      if (x.term === "unidentified" || y.term === "unidentified") continue;
      const row = rows.find(r => (r.a === x.term && r.b === y.term) || (r.a === y.term && r.b === x.term));
      if (!row) continue;
      const severity = severityOf(row.severity);
      if (!severity || !row.source) continue;
      out.push({ id: `flag_${x.id}_${y.id}`, severity, a: x.id, b: y.id, reason: row.effect, citation: row.source });
    }
  }
  return out.sort((p, q) => (p.severity === q.severity ? 0 : p.severity === "high" ? -1 : 1));
}

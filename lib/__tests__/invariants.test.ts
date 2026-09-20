import { describe, expect, it } from "vitest";
import file from "@/data/files/mw-1042.json";
import substances from "@/data/substances.json";
import { computeFlags } from "@/lib/flags";
import { STATUS_ORDER, speakerFor, type PatientFile } from "@/lib/types";

const f = file as unknown as PatientFile;
const table = (substances as { interactions: Array<{ a: string; b: string }> }).interactions;

describe("PatientFile contract invariants", () => {
  it("1. a turn's speaker is derived from the language heard", () => {
    for (const t of f.turns) expect(t.by).toBe(speakerFor(t.heard));
    for (const r of f.recordings) expect(r.speaker).toBe("patient");
  });

  it("2. voice and photo items carry her words; document items may not", () => {
    for (const m of f.medList) {
      if (m.source === "document") continue;
      expect(m.herWords, m.term).toBeTruthy();
    }
  });

  it("3. every flag is a table row with a citation; every question is a question", () => {
    const byId = Object.fromEntries(f.medList.map(m => [m.id, m]));
    for (const fl of f.flags) {
      expect(fl.citation).toBeTruthy();
      const a = byId[fl.a].term, b = byId[fl.b].term;
      expect(table.some(r => (r.a === a && r.b === b) || (r.a === b && r.b === a)), `${a}+${b}`).toBe(true);
    }
    for (const q of f.questions) expect(q.text.english.trim().endsWith("?")).toBe(true);
    // and computeFlags agrees with the canned file
    expect(computeFlags(f.medList).map(x => [x.a, x.b].sort().join("+")).sort())
      .toEqual(f.flags.map(x => [x.a, x.b].sort().join("+")).sort());
  });

  it("4. status is a known forward-only value", () => {
    expect(STATUS_ORDER).toContain(f.status);
  });
});

import { describe, expect, it } from "vitest";
import canned from "@/data/files/mw-1042.json";
import { applyFilePatch, validateFile } from "@/lib/validation";
import { computeFlags } from "@/lib/flags";
import type { PatientFile } from "@/lib/types";

const fixture = () => structuredClone(canned) as PatientFile;
function signed() {
  const f = fixture();
  const at = "2026-09-19T20:00:00Z";
  f.status = "signed";
  f.reviewedBy = {
    name: "Test pharmacist",
    qualification: "Pharm-D",
    registration: "TEST",
    at,
  };
  f.advice = {
    english: "Test advice",
    urdu: "نمونہ",
    by: "Test pharmacist",
    at,
    verdicts: Object.fromEntries(f.medList.map((m) => [m.id, "keep"])),
  };
  return f;
}
describe("clinical file invariants at write time", () => {
  it("requires a decision on every item before signing", () => {
    const f = signed();
    delete f.advice!.verdicts.m1;
    expect(() => validateFile(f)).toThrow(/Review every medicine/);
  });
  it("accepts a complete review but closes subsequent edits", () => {
    const f = validateFile(signed());
    expect(f.status).toBe("signed");
    expect(() =>
      applyFilePatch(f, { impression: "Changed after signature" }),
    ).toThrow(/closed/);
  });
  it("rejects a reviewer different from the advice author", () => {
    const f = signed();
    f.advice!.by = "Someone else";
    expect(() => validateFile(f)).toThrow(/identity/);
  });
  it("rejects unsupported terms and incorrect speaker attribution", () => {
    const f = fixture();
    f.medList[0].term = "invented_medication";
    expect(() => validateFile(f)).toThrow(/Unknown medicine/);
    const g = fixture();
    g.turns[0].by = "patient";
    expect(() => validateFile(g)).toThrow(/Speaker/);
  });
  it("rejects an answer marker with no actual matching answer", () => {
    const f = fixture();
    f.questions[1].answeredIn = "t1";
    expect(() => validateFile(f)).toThrow(/recorded answer/);
  });
  it("does not flag unidentified or unsourced interactions", () => {
    const f = fixture();
    expect(computeFlags([f.medList[0], f.medList[5]])).toEqual([]);
    expect(
      computeFlags([
        { ...f.medList[0], term: "warfarin" },
        { ...f.medList[1], term: "aspirin" },
      ]),
    ).toEqual([]);
  });
});

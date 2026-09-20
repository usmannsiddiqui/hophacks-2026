import { describe, expect, it } from "vitest";
import file from "@/data/files/mw-1042.json";
import { validateFile } from "@/lib/validation";
import { REVIEW_SCHEMA_VERSION, reviewSchema, blankDecisions } from "@/lib/review";
import type { PatientFile } from "@/lib/types";

const base = validateFile(structuredClone(file));

function signed(advice: Partial<PatientFile["advice"]> & { verdicts: Record<string, "keep" | "stop" | "swap"> }) {
  const at = "2026-09-20T12:00:00+05:00";
  return {
    ...base,
    status: "signed" as const,
    impression: "",
    advice: { urdu: "", english: "", by: "Sana Qureshi", at, ...advice },
    reviewedBy: { name: "Sana Qureshi", qualification: "Pharm-D", registration: "TEST-1", at },
  };
}

const allKeep = Object.fromEntries(base.medList.map((m) => [m.id, "keep" as const]));

describe("a pharmacist can approve without writing anything", () => {
  it("signs with every medicine kept and no advice text", () => {
    const f = signed({ verdicts: allKeep });
    expect(() => validateFile(f)).not.toThrow();
  });

  it("still requires a decision on every medicine", () => {
    const missing = { ...allKeep };
    delete (missing as Record<string, unknown>)[base.medList[0].id];
    expect(() => validateFile(signed({ verdicts: missing }))).toThrow(/every medicine/i);
  });

  it("still requires the reviewing pharmacist's identity", () => {
    const f = signed({ verdicts: allKeep });
    expect(() => validateFile({ ...f, reviewedBy: undefined })).toThrow(/identity/i);
  });
});

describe("but taking something away has to be explained", () => {
  it("rejects a stop with no English the counter can repeat", () => {
    const verdicts = { ...allKeep, [base.medList[1].id]: "stop" as const };
    expect(() => validateFile(signed({ verdicts }))).toThrow(/needs a line of English/i);
  });

  it("rejects a swap with no English either", () => {
    const verdicts = { ...allKeep, [base.medList[1].id]: "swap" as const };
    expect(() => validateFile(signed({ verdicts }))).toThrow(/needs a line of English/i);
  });

  it("accepts a stop once it is explained", () => {
    const verdicts = { ...allKeep, [base.medList[1].id]: "stop" as const };
    const f = signed({
      verdicts,
      english: "Do not start the antibiotic without a prescription and a current sugar reading.",
    });
    expect(() => validateFile(f)).not.toThrow();
  });

  it("Urdu is never what makes it valid — a volunteer may not write it", () => {
    const verdicts = { ...allKeep, [base.medList[1].id]: "stop" as const };
    const urduOnly = signed({ verdicts, urdu: "نسخے کے بغیر اینٹی بائیوٹک شروع نہ کریں۔" });
    expect(() => validateFile(urduOnly)).toThrow(/needs a line of English/i);
  });
});

describe("the visit console asks for no prose to authorise", () => {
  const review = (patch: Record<string, unknown> = {}) => ({
    schemaVersion: REVIEW_SCHEMA_VERSION,
    outcome: "authorised",
    items: blankDecisions(["m1", "m2"]),
    note: "",
    urdu: "",
    by: { name: "Sana Qureshi", qualification: "Pharm-D", registration: "TEST-1" },
    at: "2026-09-20T12:00:00.000Z",
    ...patch,
  });

  it("accepts an authorisation with an empty note", () => {
    expect(reviewSchema.safeParse(review()).success).toBe(true);
  });

  it("accepts a missing note entirely", () => {
    const { note: _note, ...withoutNote } = review();
    void _note;
    const parsed = reviewSchema.safeParse(withoutNote);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.note).toBe("");
  });

  it("a declined item still carries its own reason", () => {
    const parsed = reviewSchema.safeParse(
      review({
        outcome: "declined",
        items: [
          { medId: "m1", decision: "authorised", reason: "" },
          { medId: "m2", decision: "declined", reason: "" },
        ],
      }),
    );
    expect(parsed.success).toBe(false);
  });
});

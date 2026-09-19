import { describe, expect, it } from "vitest";
import {
  attachReport,
  visitReportSchema,
} from "@/lib/visit-report";
import { createVisitDraft, reviewVisitDraft } from "@/lib/visit-draft";

const urdu = "میں روز میٹفارمن لیتی ہوں";
const report = {
  schemaVersion: 1 as const,
  draftId: "draft-1",
  rawUrdu: urdu,
  reviewedUrdu: urdu,
  generatedAt: "2026-09-19T18:00:00.000Z",
  model: { provider: "google" as const, name: "gemini-3.6-flash" },
  english: {
    account: "I take metformin every day.",
    summary: "Reports taking metformin daily.",
  },
  medList: [{
    id: "m1",
    term: "metformin",
    name: "Metformin",
    herWords: "میٹفارمن",
    role: "takes" as const,
    source: { kind: "reviewed-urdu" as const, excerpt: "روز میٹفارمن" },
  }],
  questions: [{
    id: "q1",
    text: { urdu: "آپ کتنی مقدار لیتی ہیں؟", english: "What dose do you take?" },
    why: "The dose was not stated.",
    source: { kind: "reviewed-urdu" as const, excerpt: "میٹفارمن" },
    status: "draft" as const,
  }],
  flags: [],
};

describe("VisitReport evidence", () => {
  it("accepts source excerpts grounded in reviewed Urdu", () => {
    expect(visitReportSchema.parse(report).medList[0].source.excerpt).toBe("روز میٹفارمن");
  });

  it("preserves the original Scribe transcript byte-for-byte", () => {
    const rawUrdu = `  ${urdu}\n`;
    expect(visitReportSchema.parse({ ...report, rawUrdu }).rawUrdu).toBe(rawUrdu);
  });

  it("rejects invented evidence and unknown medicine terms", () => {
    expect(visitReportSchema.safeParse({
      ...report,
      medList: [{ ...report.medList[0], herWords: "انسولین" }],
    }).success).toBe(false);
    expect(visitReportSchema.safeParse({
      ...report,
      medList: [{ ...report.medList[0], term: "invented_drug" }],
    }).success).toBe(false);
  });
});

describe("VisitDraft report lifecycle", () => {
  it("attaches only to the same draft and exact Urdu snapshots", () => {
    const draft = reviewVisitDraft(createVisitDraft(
      { name: "Nasreen", age: 64, sex: "F" },
      { text: urdu, language: "ur", words: [] },
      12,
    ), urdu);
    const matching = { ...report, draftId: draft.id };
    expect(attachReport(draft, matching).report).toEqual(matching);
    expect(() => attachReport(draft, { ...matching, draftId: "another" })).toThrow();
    expect(() => attachReport(draft, { ...matching, reviewedUrdu: `${urdu}۔` })).toThrow();
  });

  it("does not attach analysis before transcript review is complete", () => {
    const draft = createVisitDraft(
      { name: "Nasreen", age: 64, sex: "F" },
      { text: urdu, language: "ur", words: [] },
      12,
    );
    expect(() => attachReport(draft, { ...report, draftId: draft.id })).toThrow();
  });

  it("invalidates an attached report when reviewed Urdu changes", () => {
    const draft = reviewVisitDraft(createVisitDraft(
      { name: "Nasreen", age: 64, sex: "F" },
      { text: urdu, language: "ur", words: [] },
      12,
    ), urdu);
    const withReport = attachReport(draft, { ...report, draftId: draft.id });
    expect(reviewVisitDraft(withReport, `${urdu}۔`).report).toBeUndefined();
  });
});

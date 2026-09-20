import { expect, it } from "vitest";
import {
  createVisitDraft,
  reviewVisitDraft,
  readVisitDraft,
} from "@/lib/visit-draft";
import type { VisitReport } from "@/lib/visit-report";
it("keeps raw Scribe output when the volunteer corrects the transcript", () => {
  const original = createVisitDraft(
    { name: "Nasreen", age: 64, sex: "F" },
    { text: "اصل عبارت", language: "ur", words: [] },
    12,
  );
  const corrected = reviewVisitDraft(original, "درست عبارت");
  expect(corrected.transcript.text).toBe("اصل عبارت");
  expect(corrected.reviewedUrdu).toBe("درست عبارت");
  expect(original.reviewedUrdu).toBe("اصل عبارت");
  expect(corrected.status).toBe("transcript-ready");
});
it("rejects blank corrections and malformed saved drafts", () => {
  const draft = createVisitDraft(
    { name: "Nasreen", age: 64, sex: "F" },
    { text: "اصل عبارت", language: "ur", words: [] },
    12,
  );
  expect(() => reviewVisitDraft(draft, " ")).toThrow();
  expect(readVisitDraft("{bad json")).toBeNull();
  expect(
    readVisitDraft(JSON.stringify({ patient: { name: "Nasreen" } })),
  ).toBeNull();
});
it("restores a valid draft without fabricating an English translation or sent status", () => {
  const draft = reviewVisitDraft(
    createVisitDraft(
      { name: "Nasreen", age: 64, sex: "F" },
      { text: "اصل عبارت", language: "ur", words: [] },
      12,
    ),
    "اصل عبارت",
  );
  const restored = readVisitDraft(JSON.stringify(draft));
  expect(restored?.status).toBe("transcript-ready");
  expect(restored?.transcript.language).toBe("ur");
  expect(restored).not.toHaveProperty("english");
});

it("retains previous patients when another visit is saved", async () => {
  const { saveVisitDraft, readVisitHistory, VISIT_HISTORY_KEY } = await import(
    "@/lib/visit-draft"
  );
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const a = createVisitDraft(
    { name: "Nasreen", age: 64, sex: "F" },
    { text: "اصل", language: "ur", words: [] },
    12,
  );
  const b = createVisitDraft(
    { name: "Ali", age: 60, sex: "M" },
    { text: "دوسری", language: "ur", words: [] },
    10,
  );
  saveVisitDraft(storage, a);
  saveVisitDraft(storage, b);
  saveVisitDraft(storage, reviewVisitDraft(a, "درست"));
  const history = readVisitHistory(storage.getItem(VISIT_HISTORY_KEY));
  expect(history).toHaveLength(2);
  expect(history.find((d) => d.id === a.id)?.reviewedUrdu).toBe("درست");
  expect(history.find((d) => d.id === b.id)?.patient.name).toBe("Ali");
});

it("keeps a valid saved transcript but discards a report from another snapshot", () => {
  const draft = reviewVisitDraft(
    createVisitDraft(
      { name: "Nasreen", age: 64, sex: "F" },
      { text: "اصل", language: "ur", words: [] },
      12,
    ),
    "درست",
  );
  const foreignReport = {
    schemaVersion: 1,
    draftId: "another-draft",
    rawUrdu: "اصل",
    reviewedUrdu: "درست",
    generatedAt: "2026-09-19T18:00:00.000Z",
    model: { provider: "google", name: "gemini-3.6-flash" },
    english: { account: "An account.", summary: "No medicines identified. No draft questions." },
    medList: [],
    questions: [],
    flags: [],
  } satisfies VisitReport;
  const restored = readVisitDraft(JSON.stringify({ ...draft, report: foreignReport }));
  expect(restored?.id).toBe(draft.id);
  expect(restored?.reviewedUrdu).toBe("درست");
  expect(restored?.report).toBeUndefined();
});

it("refuses to save a report that does not belong to the draft", async () => {
  const { saveVisitDraft } = await import("@/lib/visit-draft");
  const draft = reviewVisitDraft(
    createVisitDraft(
      { name: "Nasreen", age: 64, sex: "F" },
      { text: "اصل", language: "ur", words: [] },
      12,
    ),
    "درست",
  );
  const invalid = {
    ...draft,
    report: {
      schemaVersion: 1,
      draftId: "another-draft",
      rawUrdu: "اصل",
      reviewedUrdu: "درست",
      generatedAt: "2026-09-19T18:00:00.000Z",
      model: { provider: "google", name: "gemini-3.6-flash" },
      english: { account: "An account.", summary: "No medicines identified. No draft questions." },
      medList: [], questions: [], flags: [],
    },
  } as never;
  expect(() => saveVisitDraft({ getItem: () => null, setItem: () => undefined }, invalid)).toThrow();
});

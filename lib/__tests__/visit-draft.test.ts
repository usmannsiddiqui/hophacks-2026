import { expect, it } from "vitest";
import {
  addFollowUp,
  answeredFollowUps,
  createVisitDraft,
  editFollowUp,
  mergeFollowUps,
  removeFollowUp,
  reviewVisitDraft,
  readVisitDraft,
} from "@/lib/visit-draft";
import { attachReport, type VisitReport } from "@/lib/visit-report";
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

const answerInput = {
  questionId: "q1",
  question: { urdu: "آپ کتنی مقدار لیتی ہیں؟", english: "What dose do you take?" },
  answerUrdu: "صبح ایک گولی",
  seconds: 6,
};

function savedWithReport() {
  const draft = reviewVisitDraft(
    createVisitDraft(
      { name: "Nasreen", age: 64, sex: "F" },
      { text: "میں میٹفارمن لیتی ہوں", language: "ur", words: [] },
      12,
    ),
    "میں میٹفارمن لیتی ہوں",
  );
  return attachReport(draft, {
    schemaVersion: 1,
    draftId: draft.id,
    rawUrdu: draft.transcript.text,
    reviewedUrdu: draft.reviewedUrdu,
    generatedAt: "2026-09-19T18:00:00.000Z",
    model: { provider: "google", name: "gemini-3.6-flash" },
    english: { account: "I take metformin.", summary: "Metformin (takes). 1 question." },
    medList: [{
      id: "m1", term: "metformin", name: "Metformin", herWords: "میٹفارمن", role: "takes",
      source: { kind: "reviewed-urdu", excerpt: "میٹفارمن" },
    }],
    questions: [{
      id: "q1",
      text: answerInput.question,
      why: "The dose was not stated.",
      source: { kind: "reviewed-urdu", excerpt: "میٹفارمن" },
      status: "draft",
    }],
    flags: [],
  });
}

it("holds a recorded answer against its question without touching the report", () => {
  const draft = savedWithReport();
  const withAnswer = addFollowUp(draft, answerInput);
  expect(withAnswer.followUps).toHaveLength(1);
  expect(withAnswer.followUps[0]).toMatchObject({ questionId: "q1", answerUrdu: "صبح ایک گولی" });
  expect(withAnswer.report).toEqual(draft.report);
  expect(withAnswer.reviewedUrdu).toBe(draft.reviewedUrdu);
  const rerecorded = addFollowUp(withAnswer, { ...answerInput, answerUrdu: "رات کو دو گولیاں" });
  expect(rerecorded.followUps).toHaveLength(1);
  expect(rerecorded.followUps[0].answerUrdu).toBe("رات کو دو گولیاں");
  const edited = editFollowUp(rerecorded, rerecorded.followUps[0].id, "  ");
  expect(answeredFollowUps(edited)).toEqual([]);
  expect(removeFollowUp(edited, edited.followUps[0].id).followUps).toEqual([]);
});

it("merges answers into the reviewed account as marked dialogue and clears the stale report", () => {
  const merged = mergeFollowUps(addFollowUp(savedWithReport(), answerInput));
  expect(merged.reviewedUrdu).toBe(
    "میں میٹفارمن لیتی ہوں\n\nسوال: آپ کتنی مقدار لیتی ہیں؟\nجواب: صبح ایک گولی",
  );
  expect(merged.transcript.text).toBe("میں میٹفارمن لیتی ہوں");
  expect(merged.followUps).toEqual([]);
  expect(merged.report).toBeUndefined();
  expect(merged.status).toBe("transcript-ready");
  expect(() => mergeFollowUps(merged)).toThrow("No recorded answers");
});

it("reads drafts saved before follow-ups existed", () => {
  const legacy: Record<string, unknown> = { ...savedWithReport() };
  delete legacy.followUps;
  expect(readVisitDraft(JSON.stringify(legacy))?.followUps).toEqual([]);
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

it("keeps the selected outreach area when a draft is corrected and restored", () => {
  const draft = createVisitDraft({name:"Sample",age:60,sex:"F"}, {text:"اصل عبارت",language:"ur",words:[]}, 12, "pasni");
  expect(readVisitDraft(JSON.stringify(reviewVisitDraft(draft,"درست عبارت")))?.outreachAreaId).toBe("pasni");
});

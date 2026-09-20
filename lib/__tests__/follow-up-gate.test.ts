import { describe, expect, it } from "vitest";
import {
  addFollowUp,
  dismissQuestion,
  mergeFollowUps,
  outstandingQuestions,
  restoreQuestion,
  reviewVisitDraft,
  type VisitDraft,
} from "@/lib/visit-draft";
import fixture from "@/data/visits/mv-2051.json";

// A draft carrying the sample report, so the questions are real ones.
function draftWithReport(): VisitDraft {
  const report = structuredClone(fixture).report;
  const reviewedUrdu = report.reviewedUrdu;
  return {
    id: "draft-1",
    createdAt: "2026-09-20T09:00:00.000Z",
    patient: { name: "Ghulam Fatima", age: 67, sex: "F" },
    seconds: 120,
    transcript: { text: report.rawUrdu, language: "ur", words: [] },
    reviewedUrdu,
    status: "transcript-ready",
    report: { ...report, draftId: "draft-1" },
    followUps: [],
    dismissed: [],
  } as VisitDraft;
}

const answer = (draft: VisitDraft, questionId: string) => {
  const question = draft.report!.questions.find((q) => q.id === questionId)!;
  return addFollowUp(draft, {
    questionId,
    question: { urdu: question.text.urdu, english: question.text.english },
    answerUrdu: "جی، دو مہینے سے",
    seconds: 4,
  });
};

describe("what still needs the volunteer's attention", () => {
  it("starts with every drafted question outstanding", () => {
    const draft = draftWithReport();
    expect(draft.report!.questions.length).toBe(3);
    expect(outstandingQuestions(draft)).toHaveLength(3);
  });

  it("an answered question is no longer outstanding", () => {
    const draft = answer(draftWithReport(), "q1");
    expect(outstandingQuestions(draft)).toEqual(["q2", "q3"]);
  });

  it("a question set aside is no longer outstanding", () => {
    const draft = dismissQuestion(draftWithReport(), "q2");
    expect(outstandingQuestions(draft)).toEqual(["q1", "q3"]);
  });

  it("setting one aside can be undone", () => {
    const aside = dismissQuestion(draftWithReport(), "q2");
    expect(restoreQuestion(aside, "q2").dismissed).toEqual([]);
    expect(outstandingQuestions(restoreQuestion(aside, "q2"))).toHaveLength(3);
  });

  it("dismissing twice does not duplicate", () => {
    const once = dismissQuestion(draftWithReport(), "q1");
    expect(dismissQuestion(once, "q1").dismissed).toEqual(["q1"]);
  });

  it("is empty once every question is answered or set aside", () => {
    let draft = draftWithReport();
    draft = answer(draft, "q1");
    draft = dismissQuestion(draft, "q2");
    draft = dismissQuestion(draft, "q3");
    expect(outstandingQuestions(draft)).toEqual([]);
  });
});

describe("a new report means the old judgements do not carry over", () => {
  it("adding answers to the account clears both the answers and the dismissals", () => {
    let draft = draftWithReport();
    draft = answer(draft, "q1");
    draft = dismissQuestion(draft, "q2");

    const merged = mergeFollowUps(draft);
    expect(merged.followUps).toEqual([]);
    expect(merged.dismissed).toEqual([]);
    // The report is dropped because its source text changed.
    expect(merged.report).toBeUndefined();
    // Her answer is now part of the account, marked as dialogue.
    expect(merged.reviewedUrdu).toContain("سوال:");
    expect(merged.reviewedUrdu).toContain("جواب:");
    expect(merged.reviewedUrdu.startsWith(draft.reviewedUrdu)).toBe(true);
  });

  it("editing the reviewed account clears dismissals too", () => {
    const draft = dismissQuestion(draftWithReport(), "q1");
    const edited = reviewVisitDraft(draft, draft.reviewedUrdu + " اور کچھ نہیں۔");
    expect(edited.dismissed).toEqual([]);
    expect(edited.report).toBeUndefined();
  });

  it("re-saving the same text keeps the report and the dismissals", () => {
    const draft = dismissQuestion(draftWithReport(), "q1");
    const same = reviewVisitDraft(draft, draft.reviewedUrdu);
    expect(same.dismissed).toEqual(["q1"]);
    expect(same.report).toBeDefined();
  });

  it("with no report there is nothing outstanding", () => {
    const draft = { ...draftWithReport(), report: undefined };
    expect(outstandingQuestions(draft)).toEqual([]);
  });
});

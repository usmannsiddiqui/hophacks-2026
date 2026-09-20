import { z } from "zod";
import type { Transcript } from "./audio";
import { visitReportSchema, type VisitReport } from "./visit-report";
export const VISIT_DRAFT_KEY = "mashwara-visit-draft-v1";
const patientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.number().int().min(0).max(120),
  sex: z.enum(["F", "M", "Other"]),
});
// A follow-up answer: the patient's reply to one draft question, recorded after the
// report, held here until the volunteer adds it to the reviewed account.
const followUpSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1).max(20),
  question: z.object({
    urdu: z.string().trim().min(1).max(500),
    english: z.string().trim().min(1).max(500),
  }),
  answerUrdu: z.string().max(5000),
  seconds: z.number().finite().min(0).max(180),
  recordedAt: z.iso.datetime(),
});
const draftSchema = z
  .object({
    id: z.string().min(1),
    createdAt: z.iso.datetime(),
    patient: patientSchema,
    seconds: z.number().finite().min(0).max(180),
    transcript: z.object({
      text: z
        .string()
        .max(20000)
        .refine((value) => Boolean(value.trim())),
      language: z.literal("ur"),
      words: z
        .array(
          z.object({
            text: z.string(),
            start: z.number().nonnegative(),
            end: z.number().nonnegative(),
          }),
        )
        .max(20000),
    }),
    reviewedUrdu: z.string().max(20000),
    status: z.enum(["transcript-review", "transcript-ready"]),
    report: visitReportSchema.optional(),
    followUps: z.array(followUpSchema).max(50).default([]),
    dismissed: z.array(z.string().min(1).max(20)).max(50).default([]),
  })
  .refine(
    (d) => d.status !== "transcript-ready" || Boolean(d.reviewedUrdu.trim()),
  )
  .superRefine((draft, ctx) => {
    if (!draft.report) return;
    if (
      draft.status !== "transcript-ready" ||
      draft.report.draftId !== draft.id ||
      draft.report.rawUrdu !== draft.transcript.text ||
      draft.report.reviewedUrdu !== draft.reviewedUrdu
    ) ctx.addIssue({ code: "custom", path: ["report"], message: "Report does not match this saved visit" });
  });
export type VisitDraft = z.infer<typeof draftSchema>;
export type VisitPatient = z.infer<typeof patientSchema>;
export type FollowUp = z.infer<typeof followUpSchema>;
export function createVisitDraft(
  patient: VisitPatient,
  transcript: Transcript,
  seconds: number,
): VisitDraft {
  return draftSchema.parse({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    patient,
    transcript,
    seconds,
    reviewedUrdu: transcript.text,
    status: "transcript-review",
    followUps: [],
    dismissed: [],
  });
}
export function reviewVisitDraft(draft: VisitDraft, text: string): VisitDraft {
  const reviewedUrdu = z.string().trim().min(1).max(20000).parse(text);
  return draftSchema.parse({
    ...draft,
    reviewedUrdu,
    status: "transcript-ready",
    ...(reviewedUrdu === draft.reviewedUrdu ? {} : { report: undefined, dismissed: [] }),
  });
}

// Dialogue markers. The reviewed account may end with follow-up turns written as
// "سوال: <volunteer question>" and "جواب: <patient answer>" so Gemini can tell whose
// words they are. Only جواب lines count as the patient's account.
export const DIALOGUE_QUESTION_MARK = "سوال:";
export const DIALOGUE_ANSWER_MARK = "جواب:";

export function answeredFollowUps(draft: VisitDraft): FollowUp[] {
  return draft.followUps.filter((item) => Boolean(item.answerUrdu.trim()));
}

export function renderDialogue(followUps: FollowUp[]): string {
  return followUps
    .filter((item) => item.answerUrdu.trim())
    .map(
      (item) =>
        `${DIALOGUE_QUESTION_MARK} ${item.question.urdu.trim()}\n${DIALOGUE_ANSWER_MARK} ${item.answerUrdu.trim()}`,
    )
    .join("\n\n");
}

export function addFollowUp(
  draft: VisitDraft,
  input: Pick<FollowUp, "questionId" | "question" | "answerUrdu" | "seconds">,
): VisitDraft {
  const followUp = followUpSchema.parse({
    ...input,
    id: crypto.randomUUID(),
    recordedAt: new Date().toISOString(),
  });
  return draftSchema.parse({
    ...draft,
    followUps: [
      ...draft.followUps.filter((item) => item.questionId !== input.questionId),
      followUp,
    ],
  });
}

export function editFollowUp(draft: VisitDraft, id: string, answerUrdu: string): VisitDraft {
  return draftSchema.parse({
    ...draft,
    followUps: draft.followUps.map((item) =>
      item.id === id ? { ...item, answerUrdu } : item,
    ),
  });
}

export function removeFollowUp(draft: VisitDraft, id: string): VisitDraft {
  return draftSchema.parse({
    ...draft,
    followUps: draft.followUps.filter((item) => item.id !== id),
  });
}

// Appends every answered follow-up to the reviewed account as marked dialogue. The raw
// Scribe transcript is untouched; the report is cleared because its source changed.
export function mergeFollowUps(draft: VisitDraft): VisitDraft {
  const dialogue = renderDialogue(draft.followUps);
  if (!dialogue) throw new Error("No recorded answers to add.");
  return draftSchema.parse({
    ...draft,
    reviewedUrdu: `${draft.reviewedUrdu.trimEnd()}\n\n${dialogue}`,
    status: "transcript-ready",
    followUps: [],
    dismissed: [],
    report: undefined,
  });
}

/** Set a question aside as not worth asking. Reversible until the report is sent. */
export function dismissQuestion(draft: VisitDraft, questionId: string): VisitDraft {
  if (draft.dismissed.includes(questionId)) return draft;
  return draftSchema.parse({ ...draft, dismissed: [...draft.dismissed, questionId] });
}

export function restoreQuestion(draft: VisitDraft, questionId: string): VisitDraft {
  return draftSchema.parse({
    ...draft,
    dismissed: draft.dismissed.filter((id) => id !== questionId),
  });
}

/**
 * The questions the volunteer has neither asked nor set aside.
 *
 * The pharmacist should get a file someone has actually worked through, not the first
 * draft the model produced. While this is non-empty the report is not ready to send.
 */
export function outstandingQuestions(draft: VisitDraft): string[] {
  const questions = draft.report?.questions ?? [];
  const answered = new Set(answeredFollowUps(draft).map((item) => item.questionId));
  return questions
    .filter((q) => !draft.dismissed.includes(q.id) && !answered.has(q.id))
    .map((q) => q.id);
}

export type { VisitReport };
export function readVisitDraft(value: string | null): VisitDraft | null {
  if (!value) return null;
  try {
    const candidate: unknown = JSON.parse(value);
    const parsed = draftSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
    if (candidate && typeof candidate === "object" && "report" in candidate) {
      const withoutReport = { ...(candidate as Record<string, unknown>) };
      delete withoutReport.report;
      const recovered = draftSchema.safeParse(withoutReport);
      return recovered.success ? recovered.data : null;
    }
    return null;
  } catch {
    return null;
  }
}

export const VISIT_HISTORY_KEY = "mashwara-visit-history-v1";
export function readVisitHistory(value: string | null): VisitDraft[] {
  try {
    const list = JSON.parse(value ?? "[]");
    return Array.isArray(list)
      ? list
          .map((item) => readVisitDraft(JSON.stringify(item)))
          .filter((item): item is VisitDraft => item !== null)
      : [];
  } catch {
    return [];
  }
}
export function saveVisitDraft(
  storage: Pick<Storage, "getItem" | "setItem">,
  draft: VisitDraft,
) {
  const valid = draftSchema.parse(draft);
  const history = readVisitHistory(storage.getItem(VISIT_HISTORY_KEY)).filter(
    (item) => item.id !== valid.id,
  );
  storage.setItem(VISIT_HISTORY_KEY, JSON.stringify([valid, ...history]));
  storage.setItem(VISIT_DRAFT_KEY, JSON.stringify(valid));
}

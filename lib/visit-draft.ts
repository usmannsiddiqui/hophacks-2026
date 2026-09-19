import { z } from "zod";
import type { Transcript } from "./audio";
import { visitReportSchema, type VisitReport } from "./visit-report";
export const VISIT_DRAFT_KEY = "mashwara-visit-draft-v1";
const patientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.number().int().min(0).max(120),
  sex: z.enum(["F", "M", "Other"]),
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
  });
}
export function reviewVisitDraft(draft: VisitDraft, text: string): VisitDraft {
  const reviewedUrdu = z.string().trim().min(1).max(20000).parse(text);
  return draftSchema.parse({
    ...draft,
    reviewedUrdu,
    status: "transcript-ready",
    ...(reviewedUrdu === draft.reviewedUrdu ? {} : { report: undefined }),
  });
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

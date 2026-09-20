// The pharmacist's decision on a visit report, and the shape it travels back in.
//
// The counter needs one plain answer — may she take this or not — so `outcome` is the
// yes/no the volunteer sees. Per-medicine decisions sit under it so the answer can be
// explained rather than asserted.
//
// A pharmacist may decline everything and still write nothing useful, so a declined
// item must carry a reason. The safety rule is in `reviewSchema` below: the overall
// answer cannot be "authorised" while any single item is declined.

import { z } from "zod";
import { visitReportSchema } from "./visit-report";

export const REVIEW_SCHEMA_VERSION = 1 as const;

const boundedText = (max: number) => z.string().trim().min(1).max(max);

/** One medicine, authorised or not. `medId` matches VisitReport.medList[].id. */
export const itemDecisionSchema = z
  .object({
    medId: z.string().regex(/^m[1-9]\d*$/),
    decision: z.enum(["authorised", "declined"]),
    // Required when declined: a refusal the patient cannot act on is not advice.
    reason: z.string().trim().max(500).default(""),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.decision === "declined" && !item.reason.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Say why it is declined — the counter has to explain it to her",
      });
    }
  });

export const pharmacistSchema = z
  .object({
    name: boundedText(120),
    qualification: boundedText(120),
    registration: boundedText(120),
  })
  .strict();

export const reviewSchema = z
  .object({
    schemaVersion: z.literal(REVIEW_SCHEMA_VERSION),
    // The yes/no the counter screen shows.
    outcome: z.enum(["authorised", "declined"]),
    items: z.array(itemDecisionSchema).max(100),
    /**
     * Plain English for the volunteer. Optional: authorising a file with nothing to
     * change is a real answer, and every decline already carries its own reason, so
     * there is nothing left for a note to be load-bearing about.
     */
    note: z.string().trim().max(4000).default(""),
    /** What the patient hears, in her language. Never a Latin fallback (ADR 0006). */
    urdu: z.string().trim().max(4000).default(""),
    by: pharmacistSchema,
    at: z.iso.datetime(),
  })
  .strict()
  .superRefine((review, ctx) => {
    if (review.outcome === "authorised" && review.items.some((i) => i.decision === "declined")) {
      ctx.addIssue({
        code: "custom",
        path: ["outcome"],
        message: "Cannot authorise overall while an item is declined",
      });
    }
    const seen = new Set<string>();
    for (const [index, item] of review.items.entries()) {
      if (seen.has(item.medId)) {
        ctx.addIssue({ code: "custom", path: ["items", index, "medId"], message: "Duplicate decision for one medicine" });
      }
      seen.add(item.medId);
    }
  });

export type ItemDecision = z.infer<typeof itemDecisionSchema>;
export type PharmacistReview = z.infer<typeof reviewSchema>;
export type Pharmacist = z.infer<typeof pharmacistSchema>;

/** A report sent to the queue, before anyone has looked at it. */
export const visitSubmissionSchema = z
  .object({
    patient: z
      .object({
        name: boundedText(120),
        age: z.number().int().min(0).max(120),
        sex: z.enum(["F", "M", "Other"]),
      })
      .strict(),
    report: visitReportSchema,
  })
  .strict();

export type VisitSubmission = z.infer<typeof visitSubmissionSchema>;

export const visitRecordSchema = z
  .object({
    id: z.string().min(1).max(200),
    createdAt: z.iso.datetime(),
    patient: visitSubmissionSchema.shape.patient,
    report: visitReportSchema,
    status: z.enum(["waiting", "reviewed"]),
    review: reviewSchema.optional(),
  })
  .strict()
  .superRefine((visit, ctx) => {
    if (visit.status === "reviewed" && !visit.review) {
      ctx.addIssue({ code: "custom", path: ["review"], message: "A reviewed visit must carry its review" });
    }
  });

export type VisitRecord = z.infer<typeof visitRecordSchema>;

/**
 * The default answer before the pharmacist touches anything: everything authorised,
 * because the report itself makes no claim either way. They change what they disagree
 * with rather than re-entering the whole list.
 */
export function blankDecisions(medIds: string[]): ItemDecision[] {
  return medIds.map((medId) => ({ medId, decision: "authorised" as const, reason: "" }));
}

/** Any decline makes the whole visit a decline. Used to keep the two in step in the UI. */
export function outcomeFor(items: ItemDecision[]): PharmacistReview["outcome"] {
  return items.some((i) => i.decision === "declined") ? "declined" : "authorised";
}

/** One line for the counter: "2 of 5 declined". */
export function decisionSummary(review: PharmacistReview): string {
  const declined = review.items.filter((i) => i.decision === "declined").length;
  if (!review.items.length) return review.outcome === "authorised" ? "Authorised" : "Not authorised";
  return declined
    ? `${declined} of ${review.items.length} not authorised`
    : `All ${review.items.length} authorised`;
}

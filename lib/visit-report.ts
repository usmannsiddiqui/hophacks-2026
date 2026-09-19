import { z } from "zod";
import { computeFlags } from "./flags";
import { displayOf, isKnownTerm } from "./vocab";
import type { VisitDraft } from "./visit-draft";

export const VISIT_REPORT_SCHEMA_VERSION = 1 as const;

const boundedText = (max: number) => z.string().trim().min(1).max(max);
const exactNonemptyText = (max: number) => z.string().max(max).refine((value) => Boolean(value.trim()));
const sourceExcerptSchema = z.object({
  kind: z.literal("reviewed-urdu"),
  excerpt: boundedText(500),
}).strict();

const reportMedSchema = z.object({
  id: z.string().regex(/^m[1-9]\d*$/),
  term: boundedText(100).refine(isKnownTerm, "Unknown medicine term"),
  name: boundedText(160),
  herWords: boundedText(500),
  role: z.enum(["requested", "takes", "remedy"]),
  source: sourceExcerptSchema,
}).strict();

const reportQuestionSchema = z.object({
  id: z.string().regex(/^q[1-9]\d*$/),
  text: z.object({
    urdu: boundedText(500),
    english: boundedText(500).refine((text) => text.endsWith("?"), "Question must end with ?"),
  }).strict(),
  why: boundedText(500),
  source: sourceExcerptSchema,
  status: z.literal("draft"),
}).strict();

const flagSchema = z.object({
  id: z.string().min(1).max(200),
  severity: z.enum(["high", "moderate"]),
  a: z.string().min(1).max(100),
  b: z.string().min(1).max(100),
  reason: boundedText(500),
  citation: boundedText(2000),
}).strict();

export const visitReportSchema = z.object({
  schemaVersion: z.literal(VISIT_REPORT_SCHEMA_VERSION),
  draftId: z.string().min(1).max(200),
  rawUrdu: exactNonemptyText(20_000),
  reviewedUrdu: exactNonemptyText(20_000),
  generatedAt: z.iso.datetime(),
  model: z.object({
    provider: z.literal("google"),
    name: z.string().min(1).max(100),
  }).strict(),
  english: z.object({
    account: boundedText(20_000),
    summary: boundedText(2_000),
  }).strict(),
  medList: z.array(reportMedSchema).max(100),
  questions: z.array(reportQuestionSchema).max(50),
  flags: z.array(flagSchema).max(200),
}).strict().superRefine((report, ctx) => {
  for (const [index, item] of report.medList.entries()) {
    if (!report.reviewedUrdu.includes(item.herWords)) {
      ctx.addIssue({ code: "custom", path: ["medList", index, "herWords"], message: "Medicine words are not in reviewed Urdu" });
    }
    if (!report.reviewedUrdu.includes(item.source.excerpt)) {
      ctx.addIssue({ code: "custom", path: ["medList", index, "source", "excerpt"], message: "Source excerpt is not in reviewed Urdu" });
    }
    if (item.name !== displayOf(item.term)) {
      ctx.addIssue({ code: "custom", path: ["medList", index, "name"], message: "Medicine name does not match vocabulary" });
    }
  }
  for (const [index, item] of report.questions.entries()) {
    if (!report.reviewedUrdu.includes(item.source.excerpt)) {
      ctx.addIssue({ code: "custom", path: ["questions", index, "source", "excerpt"], message: "Source excerpt is not in reviewed Urdu" });
    }
  }
  const expected = computeFlags(report.medList);
  if (JSON.stringify(report.flags) !== JSON.stringify(expected)) {
    ctx.addIssue({ code: "custom", path: ["flags"], message: "Flags must match the sourced interaction table" });
  }
});

export type VisitReport = z.infer<typeof visitReportSchema>;
export type ReportMedItem = VisitReport["medList"][number];
export type ReportQuestion = VisitReport["questions"][number];

export function attachReport(draft: VisitDraft, candidate: VisitReport): VisitDraft {
  const report = visitReportSchema.parse(candidate);
  if (
    draft.status !== "transcript-ready" ||
    report.draftId !== draft.id ||
    report.rawUrdu !== draft.transcript.text ||
    report.reviewedUrdu !== draft.reviewedUrdu
  ) throw new Error("Report does not match the saved visit snapshot");
  return { ...draft, report };
}

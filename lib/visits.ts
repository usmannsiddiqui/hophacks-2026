// The shared store for visits sent to the pharmacist.
//
// The volunteer's draft lives in their own browser (localStorage). A pharmacist is a
// different person on a different device (ADR 0004), so the moment a report is sent for
// review it has to leave that browser. This is the only place it lives in between.
//
// Mirrors lib/files.ts: Neon when DATABASE_URL is set, otherwise an in-memory map so
// the whole flow works on a fresh clone with no database.

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { visits } from "@/lib/db/schema";
import {
  outcomeFor,
  reviewSchema,
  visitRecordSchema,
  type PharmacistReview,
  type VisitRecord,
  type VisitSubmission,
} from "@/lib/review";
import { FileError } from "@/lib/validation";

const hasDb = () => Boolean(process.env.DATABASE_URL);

/**
 * In-memory fallback. Survives between requests in one `next dev` process, which is
 * enough for two tabs or two laptops pointed at the same dev server. It does NOT
 * survive a restart, and on a multi-instance deploy each instance keeps its own copy —
 * set DATABASE_URL before deploying or the pharmacist will not see the queue.
 */
const memory = new Map<string, VisitRecord>();

function newId(): string {
  // Short and sayable out loud across a room during the demo.
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `MV-${n}`;
}

export async function submitVisit(input: VisitSubmission): Promise<VisitRecord> {
  const record = visitRecordSchema.parse({
    id: newId(),
    createdAt: new Date().toISOString(),
    patient: input.patient,
    report: input.report,
    status: "waiting",
  } satisfies VisitRecord);

  if (!hasDb()) {
    memory.set(record.id, record);
    return record;
  }

  await getDb()
    .insert(visits)
    .values({
      id: record.id,
      status: record.status,
      outcome: null,
      data: record,
      updatedAt: new Date(),
    });
  return record;
}

export async function getVisit(id: string): Promise<VisitRecord | null> {
  if (!hasDb()) return memory.get(id) ?? null;
  const row = await getDb().query.visits.findFirst({ where: eq(visits.id, id) });
  return row?.data ?? null;
}

export type VisitSummary = {
  id: string;
  createdAt: string;
  patient: VisitRecord["patient"];
  status: VisitRecord["status"];
  outcome: PharmacistReview["outcome"] | null;
  medicines: number;
  flags: number;
  questions: number;
};

function summarise(v: VisitRecord): VisitSummary {
  return {
    id: v.id,
    createdAt: v.createdAt,
    patient: v.patient,
    status: v.status,
    outcome: v.review?.outcome ?? null,
    medicines: v.report.medList.length,
    flags: v.report.flags.length,
    questions: v.report.questions.length,
  };
}

export async function listVisits(): Promise<VisitSummary[]> {
  const all = !hasDb()
    ? [...memory.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    : (await getDb().select().from(visits).orderBy(desc(visits.createdAt))).map((r) => r.data);
  return all.map(summarise);
}

/**
 * Attach the pharmacist's decision. Rejects a second review rather than overwriting:
 * a signed decision is the thing the counter acted on, and silently replacing it would
 * make "what was she told?" unanswerable.
 */
export async function reviewVisit(id: string, candidate: unknown): Promise<VisitRecord> {
  const current = await getVisit(id);
  if (!current) throw new FileError("Visit not found", 404);
  if (current.status === "reviewed") throw new FileError("This visit has already been reviewed", 409);

  const review = reviewSchema.parse(candidate);

  const known = new Set(current.report.medList.map((m) => m.id));
  for (const item of review.items) {
    if (!known.has(item.medId)) throw new FileError(`No medicine ${item.medId} on this report`, 400);
  }
  if (review.outcome !== outcomeFor(review.items)) {
    // The schema already blocks authorised-with-a-decline; this catches the other way
    // round, where the list says yes but the answer says no with no item to point at.
    if (review.outcome === "declined" && !review.note.trim()) {
      throw new FileError("Declining with nothing declined needs a reason in the note", 400);
    }
  }

  const next = visitRecordSchema.parse({ ...current, status: "reviewed", review } satisfies VisitRecord);

  if (!hasDb()) {
    memory.set(id, next);
    return next;
  }

  await getDb()
    .update(visits)
    .set({ status: next.status, outcome: review.outcome, data: next, updatedAt: new Date() })
    .where(eq(visits.id, id));
  return next;
}

/** Test seam: the in-memory store is process-global, so tests must be able to clear it. */
export function __resetVisits() {
  memory.clear();
}

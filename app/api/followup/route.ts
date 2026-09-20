/**
 * She came back.
 *
 * POST, not GET, and the phone number goes in the body: a number in a query string ends
 * up in server logs, browser history and referrers.
 *
 * Returns two different things from two different places:
 *   - `visits` — her previous reports, exact and complete, from Neon
 *   - `memory` — the facts Backboard extracted across those visits
 *
 * Neon retrieves, Backboard remembers. Transcripts are never read back out of Backboard:
 * it summarises and compresses, which is right for narrative and wrong for a record.
 *
 * `memory` is CONTEXT FOR A PHARMACIST, never an answer. Nothing here may be spoken to
 * the patient until a pharmacist has reviewed it (ADR 0001).
 */

import { hasBackboard, recallMemories, type Memory } from "@/lib/backboard";
import { findPatientVisits, findVisitAssistantId, phoneHash } from "@/lib/patients";
import { apiError } from "@/lib/api-response";

const EMPTY = { found: false, visits: [], open: null, memory: [] as Memory[] };

export async function POST(req: Request) {
  try {
    const { phone } = (await req.json()) as { phone?: string };
    if (!phone?.trim()) {
      return Response.json({ error: "A phone number is required" }, { status: 400 });
    }

    // No pepper configured, or an unusable number: treat her as a first-time patient
    // rather than hashing with a guessable key.
    const hash = phoneHash(phone);
    if (!hash) return Response.json(EMPTY);

    const visits = await findPatientVisits(hash);
    if (!visits.length) return Response.json(EMPTY);

    let memory: Memory[] = [];
    if (hasBackboard()) {
      const assistantId = await findVisitAssistantId(hash);
      if (assistantId) memory = await recallMemories(assistantId);
    }

    // A visit still waiting on a pharmacist is the one to pick back up.
    const open = visits.find((v) => v.status === "waiting") ?? null;

    return Response.json(
      {
        found: true,
        visits: visits.map((v) => ({
          id: v.id,
          createdAt: v.createdAt,
          status: v.status,
          outcome: v.review?.outcome ?? null,
          account: v.report.english.account,
          summary: v.report.english.summary,
          medList: v.report.medList.map((m) => ({ id: m.id, term: m.term, herWords: m.herWords })),
          flags: v.report.flags.length,
          questions: v.report.questions.map((q) => q.text),
          // What the pharmacist actually decided, so a follow-up can start from the answer
          // she was given rather than from nothing.
          decisions:
            v.review?.items.map((i) => ({
              term: v.report.medList.find((m) => m.id === i.medId)?.term ?? i.medId,
              decision: i.decision,
              reason: i.reason,
            })) ?? [],
          note: v.review?.note ?? "",
        })),
        open: open ? { id: open.id, status: open.status } : null,
        memory,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

/**
 * She came back.
 *
 * POST, not GET, and the phone number goes in the body: a number in a query string ends
 * up in server logs, browser history and referrers.
 *
 * Returns three different things from two different places:
 *   - `cases`      — her previous visits, exact and complete, from Neon
 *   - `unfinished` — the visit she is mid-way through, and the screen to resume on
 *   - `memory`     — Backboard's synthesis across visits, for a PHARMACIST to read
 *
 * `memory` is context, never an answer. Nothing here may be spoken to the patient until a
 * pharmacist has reviewed and signed it (ADR 0001).
 */

import { hasBackboard, recallMemories } from "@/lib/backboard";
import {
  findAssistantId,
  findPatientCases,
  findUnfinishedCase,
  phoneHash,
} from "@/lib/patients";
import { apiError } from "@/lib/api-response";
import type { PatientFile } from "@/lib/types";

/** Where a half-finished visit picks up, straight from its status. */
function resumeTo(file: PatientFile): string {
  switch (file.status) {
    case "new":
    case "recording":
      return `/file/${file.id}/record`;
    case "structured":
      return `/file/${file.id}/findings`;
    case "asking":
      return `/file/${file.id}/ask`;
    case "sent":
      return `/file/${file.id}`;
    default:
      return `/file/${file.id}`;
  }
}

export async function POST(req: Request) {
  try {
    const { phone } = (await req.json()) as { phone?: string };
    if (!phone?.trim()) {
      return Response.json({ error: "A phone number is required" }, { status: 400 });
    }

    const hash = phoneHash(phone);
    // No pepper configured, or an unusable number: treat her as a first-time patient
    // rather than hashing with a guessable key.
    if (!hash) return Response.json({ found: false, cases: [], unfinished: null, memory: [] });

    const cases = await findPatientCases(hash);
    if (!cases.length) {
      return Response.json({ found: false, cases: [], unfinished: null, memory: [] });
    }

    const unfinished = await findUnfinishedCase(hash);

    let memory: Awaited<ReturnType<typeof recallMemories>> = [];
    if (hasBackboard()) {
      const assistantId = await findAssistantId(hash);
      if (assistantId) memory = await recallMemories(assistantId);
    }

    return Response.json(
      {
        found: true,
        cases: cases.map((c) => ({
          id: c.id,
          createdAt: c.createdAt,
          status: c.status,
          history: c.history,
          medList: c.medList,
          flags: c.flags.length,
          advice: c.advice ?? null,
          openQuestions: c.questions.filter((q) => !q.answeredIn).map((q) => q.text),
        })),
        unfinished: unfinished ? { id: unfinished.id, status: unfinished.status, resumeTo: resumeTo(unfinished) } : null,
        memory,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

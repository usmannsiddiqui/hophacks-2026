/**
 * Writing a reviewed visit into Backboard.
 *
 * The `visits` counterpart of lib/remember-visit.ts, and the one that matters: reports
 * live in `visits`, so this is the hook that actually fires in the demo.
 *
 * Called with `void` from the review path — a failure here must never delay or fail a
 * pharmacist's decision. The visit is already safe in Neon by that point.
 */

import { createAssistant, hasBackboard, remember, reviewedVisitMemo } from "@/lib/backboard";
import { findVisitAssistantId, linkVisit, visitLink } from "@/lib/patients";
import type { VisitRecord } from "@/lib/review";

export async function rememberReviewedVisit(
  visit: VisitRecord,
): Promise<"written" | "skipped" | "failed"> {
  if (!hasBackboard()) return "skipped";

  try {
    const link = await visitLink(visit.id);

    // A visit with no phone number has no patient to remember against. Without an
    // assistant to attach it to, the memory would be unreachable on any later visit.
    if (!link.assistantId && !link.phoneHash) return "skipped";

    let assistantId = link.assistantId;
    if (!assistantId && link.phoneHash) {
      // Reuse the assistant an earlier visit created, so memory accumulates per patient.
      assistantId = await findVisitAssistantId(link.phoneHash);
    }
    if (!assistantId) {
      assistantId = await createAssistant(visit.id);
      if (!assistantId) return "failed";
    }

    // Store it on the row either way, so a follow-up finds it without another round trip.
    if (assistantId !== link.assistantId) {
      await linkVisit(visit.id, null, assistantId);
    }

    return (await remember(assistantId, reviewedVisitMemo(visit))) ? "written" : "failed";
  } catch (error) {
    console.error("[backboard] rememberReviewedVisit failed:", (error as Error).message);
    return "failed";
  }
}

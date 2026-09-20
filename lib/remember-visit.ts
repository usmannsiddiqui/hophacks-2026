/**
 * Writing a signed visit into Backboard.
 *
 * Kept out of the route handler so the route stays readable and so this can be tested
 * without HTTP. Called with `void` from the PATCH handler: a failure here must never
 * delay or fail a pharmacist's signature. The case is already safe in Neon by this point.
 */

import { createAssistant, hasBackboard, remember, signedVisitMemo } from "@/lib/backboard";
import { caseLink, findAssistantId, linkCase } from "@/lib/patients";
import type { PatientFile } from "@/lib/types";

/**
 * Resolve this patient's assistant, creating one on her first signed visit, then write
 * the visit into it.
 *
 * Returns what happened so tests and logs can tell "skipped" from "failed".
 */
export async function rememberSignedVisit(
  file: PatientFile,
): Promise<"written" | "skipped" | "failed"> {
  if (!hasBackboard()) return "skipped";

  try {
    const link = await caseLink(file.id);

    // A case with no phone number has no patient to remember against. Without an
    // assistant to attach it to, a memory would be unreachable on any future visit.
    if (!link.assistantId && !link.phoneHash) return "skipped";

    let assistantId = link.assistantId;
    if (!assistantId && link.phoneHash) {
      // Reuse the assistant a previous visit created, so memory accumulates per patient.
      assistantId = await findAssistantId(link.phoneHash);
    }
    if (!assistantId) {
      assistantId = await createAssistant(file.id);
      if (!assistantId) return "failed";
    }

    // Store it on the row either way, so a follow-up finds it without another round trip.
    if (assistantId !== link.assistantId) {
      await linkCase(file.id, null, assistantId);
    }

    return (await remember(assistantId, signedVisitMemo(file))) ? "written" : "failed";
  } catch (error) {
    console.error("[backboard] rememberSignedVisit failed:", (error as Error).message);
    return "failed";
  }
}

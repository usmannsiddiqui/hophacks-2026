import { apiError } from "@/lib/api-response";
import { visitSubmissionSchema } from "@/lib/review";
import { listVisits, submitVisit } from "@/lib/visits";
import { findVisitAssistantId, linkVisit, phoneHash } from "@/lib/patients";

/** The pharmacist queue. Polled from the console. */
export async function GET() {
  try {
    return Response.json(await listVisits());
  } catch (error) {
    return apiError(error);
  }
}

/** The counter sends a report for review. The draft stays in the volunteer's browser;
 *  this is the copy the pharmacist sees. */
export async function POST(request: Request) {
  try {
    // `phone` identifies a returning patient. It is not part of the review contract, and
    // visitSubmissionSchema is strict, so peel it off before validating the submission.
    const { phone, ...rest } = (await request.json()) as { phone?: unknown };
    const submission = visitSubmissionSchema.parse(rest);
    const visit = await submitVisit(submission);

    if (typeof phone === "string" && phone.trim()) {
      const hash = phoneHash(phone);
      if (hash) {
        // Reuse the assistant an earlier visit created. A new one is NOT minted here —
        // that happens on the first review, so unreviewed visits leave nothing behind.
        await linkVisit(visit.id, hash, await findVisitAssistantId(hash));
      }
    }
    return Response.json(visit, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

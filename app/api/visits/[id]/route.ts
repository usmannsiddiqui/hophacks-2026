import { apiError } from "@/lib/api-response";
import { FileError } from "@/lib/validation";
import { getVisit, reviewVisit } from "@/lib/visits";
import { rememberReviewedVisit } from "@/lib/remember-review";

type Ctx = { params: Promise<{ id: string }> };

/** The pharmacist opens a visit; the counter polls the same route for the answer. */
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const visit = await getVisit(id);
    if (!visit) throw new FileError("Visit not found", 404);
    return Response.json(visit);
  } catch (error) {
    return apiError(error);
  }
}

/** The pharmacist's decision. Rejects a second review rather than overwriting. */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const reviewed = await reviewVisit(id, await request.json());
    // The one place a visit enters Backboard. reviewVisit rejects a second review, so
    // this fires once per visit. Not awaited: memory must never delay or fail a decision.
    void rememberReviewedVisit(reviewed);
    return Response.json(reviewed);
  } catch (error) {
    return apiError(error);
  }
}

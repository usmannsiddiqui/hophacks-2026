import { apiError } from "@/lib/api-response";
import { FileError } from "@/lib/validation";
import { getVisit, reviewVisit } from "@/lib/visits";

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
    return Response.json(await reviewVisit(id, await request.json()));
  } catch (error) {
    return apiError(error);
  }
}

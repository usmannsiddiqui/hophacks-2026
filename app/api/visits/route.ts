import { apiError } from "@/lib/api-response";
import { visitSubmissionSchema } from "@/lib/review";
import { listVisits, submitVisit } from "@/lib/visits";

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
    const submission = visitSubmissionSchema.parse(await request.json());
    const visit = await submitVisit(submission);
    return Response.json(visit, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

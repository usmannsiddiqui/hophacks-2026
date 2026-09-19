import { attachReport, visitReportSchema } from "./visit-report";
import type { VisitDraft } from "./visit-draft";

type FetchReport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type OwnedReportRequest = {
  readonly draftId: string;
  readonly signal: AbortSignal;
};

export class ReportRequestOwner {
  private active: (OwnedReportRequest & { controller: AbortController }) | null =
    null;

  begin(draftId: string): OwnedReportRequest {
    this.cancel();
    const controller = new AbortController();
    const request = { draftId, signal: controller.signal, controller };
    this.active = request;
    return request;
  }

  isCurrent(request: OwnedReportRequest): boolean {
    return this.active === request && !request.signal.aborted;
  }

  cancel(): void {
    this.active?.controller.abort();
    this.active = null;
  }
}

export async function requestVisitReport(
  draft: VisitDraft,
  signal: AbortSignal,
  fetchReport: FetchReport = fetch,
): Promise<VisitDraft> {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), 35_000);
  const requestSignal = AbortSignal.any([signal, deadline.signal]);
  let response: Response;
  try {
    response = await fetchReport("/api/structure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draftId: draft.id,
        rawUrdu: draft.transcript.text,
        reviewedUrdu: draft.reviewedUrdu,
      }),
      signal: requestSignal,
    });
  } catch (cause) {
    if (deadline.signal.aborted && !signal.aborted) {
      throw new Error("English report preparation timed out. Please retry.");
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an invalid report. Please retry."
        : "English report preparation failed. Please retry.",
    );
  }

  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "English report preparation failed. Please retry.";
    throw new Error(message);
  }

  const parsed = visitReportSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("The server returned an invalid report. Please retry.");
  }
  return attachReport(draft, parsed.data);
}

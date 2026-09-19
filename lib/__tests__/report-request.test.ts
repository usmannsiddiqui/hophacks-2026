import { describe, expect, it, vi } from "vitest";
import { attachReport, type VisitReport } from "@/lib/visit-report";
import {
  ReportRequestOwner,
  requestVisitReport,
} from "@/lib/report-request";
import {
  createVisitDraft,
  reviewVisitDraft,
  type VisitDraft,
} from "@/lib/visit-draft";

const urdu = "میں روز میٹفارمن لیتی ہوں";

function savedDraft(): VisitDraft {
  return reviewVisitDraft(
    createVisitDraft(
      { name: "Nasreen", age: 64, sex: "F" },
      { text: urdu, language: "ur", words: [] },
      12,
    ),
    urdu,
  );
}

function reportFor(draft: VisitDraft): VisitReport {
  return {
    schemaVersion: 1,
    draftId: draft.id,
    rawUrdu: draft.transcript.text,
    reviewedUrdu: draft.reviewedUrdu,
    generatedAt: "2026-09-19T18:00:00.000Z",
    model: { provider: "google", name: "gemini-3.6-flash" },
    english: {
      account: "I take metformin every day.",
      summary: "Reports taking metformin daily.",
    },
    medList: [
      {
        id: "m1",
        term: "metformin",
        name: "Metformin",
        herWords: "میٹفارمن",
        role: "takes",
        source: { kind: "reviewed-urdu", excerpt: "روز میٹفارمن" },
      },
    ],
    questions: [],
    flags: [],
  };
}

describe("ReportRequestOwner", () => {
  it("aborts the prior request and rejects its late result", () => {
    const owner = new ReportRequestOwner();
    const first = owner.begin("visit-a");
    const second = owner.begin("visit-b");

    expect(first.signal.aborted).toBe(true);
    expect(owner.isCurrent(first)).toBe(false);
    expect(owner.isCurrent(second)).toBe(true);
  });

  it("cancels the active request during cleanup", () => {
    const owner = new ReportRequestOwner();
    const request = owner.begin("visit-a");

    owner.cancel();

    expect(request.signal.aborted).toBe(true);
    expect(owner.isCurrent(request)).toBe(false);
  });
});

describe("requestVisitReport", () => {
  it("posts only the saved Urdu snapshot and attaches the validated report", async () => {
    const draft = savedDraft();
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify(reportFor(draft)), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const next = await requestVisitReport(draft, new AbortController().signal, fetcher);

    expect(next.report?.draftId).toBe(draft.id);
    expect(fetcher).toHaveBeenCalledWith("/api/structure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draftId: draft.id,
        rawUrdu: urdu,
        reviewedUrdu: urdu,
      }),
      signal: expect.any(AbortSignal),
    });
  });

  it("rejects a successful response with an invalid report schema", async () => {
    const draft = savedDraft();
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ ...reportFor(draft), medList: [{ term: "invented" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      requestVisitReport(draft, new AbortController().signal, fetcher),
    ).rejects.toThrow("invalid report");
  });

  it("keeps the existing transcript and report when regeneration fails", async () => {
    const draft = savedDraft();
    const previous = attachReport(draft, reportFor(draft));
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Provider busy" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      requestVisitReport(previous, new AbortController().signal, fetcher),
    ).rejects.toThrow("Provider busy");
    expect(previous.reviewedUrdu).toBe(urdu);
    expect(previous.report).toEqual(reportFor(draft));
  });

  it("ends a hung client request after the report deadline", async () => {
    vi.useFakeTimers();
    try {
      const draft = savedDraft();
      const fetcher = vi.fn(
        async (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const error = new Error("request aborted");
              error.name = "TimeoutError";
              reject(error);
            });
          }),
      );

      const result = expect(
        requestVisitReport(draft, new AbortController().signal, fetcher),
      ).rejects.toThrow("timed out");
      await vi.advanceTimersByTimeAsync(35_000);
      await result;
    } finally {
      vi.useRealTimers();
    }
  });
});

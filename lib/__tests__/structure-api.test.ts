import { beforeEach, describe, expect, it, vi } from "vitest";

const prepareVisitReport = vi.fn();
vi.mock("@/lib/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/llm")>();
  return {
    ...actual,
    prepareVisitReport: (...args: unknown[]) => prepareVisitReport(...args),
  };
});

import { POST } from "@/app/api/structure/route";

const validBody = {
  draftId: "draft-1",
  rawUrdu: "اصل عبارت",
  reviewedUrdu: "میں میٹفارمن لیتی ہوں",
};

function request(body: string, headers: HeadersInit = {}) {
  return new Request("http://localhost/api/structure", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

function nonJsonRequest(body: string) {
  return new Request("http://localhost/api/structure", { method: "POST", body });
}

beforeEach(() => {
  prepareVisitReport.mockReset();
  prepareVisitReport.mockResolvedValue({ ok: true });
});

describe("POST /api/structure", () => {
  it("passes only the validated saved-visit snapshot and cancellation signal", async () => {
    const response = await POST(request(JSON.stringify(validBody)));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(prepareVisitReport).toHaveBeenCalledWith(validBody, expect.any(AbortSignal));
  });

  it("rejects malformed, extra, blank, and oversized input without calling Gemini", async () => {
    const cases = [
      request("{"),
      request(JSON.stringify({ ...validBody, provider: "xai" })),
      request(JSON.stringify({ ...validBody, reviewedUrdu: " " })),
      request(JSON.stringify(validBody), { "content-length": "300000" }),
      nonJsonRequest(JSON.stringify(validBody)),
    ];
    for (const item of cases) expect((await POST(item)).status).toBeGreaterThanOrEqual(400);
    expect(prepareVisitReport).not.toHaveBeenCalled();
  });

  it("maps configuration, timeout, and provider failures to safe errors", async () => {
    for (const [error, status] of [
      [new Error("LLM_CONFIGURATION_ERROR: secret-key"), 503],
      [new Error("LLM_TIMEOUT_ERROR: upstream detail"), 504],
      [new Error("LLM_QUOTA_ERROR"), 429],
      [new Error("LLM_BUSY_ERROR"), 503],
      [new Error("provider leaked GOOGLE_GENERATIVE_AI_API_KEY"), 502],
    ] as const) {
      prepareVisitReport.mockRejectedValueOnce(error);
      const response = await POST(request(JSON.stringify(validBody)));
      expect(response.status).toBe(status);
      const text = await response.text();
      expect(text).not.toContain("secret-key");
      expect(text).not.toContain("GOOGLE_GENERATIVE_AI_API_KEY");
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
  });

  it("cancels a stalled body when the absolute request deadline expires", async () => {
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(deadline.signal);
    const cancel = vi.fn();
    const stalled = new ReadableStream<Uint8Array>({
      pull: () => new Promise(() => undefined),
      cancel,
    });
    const pending = POST(new Request("http://localhost/api/structure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stalled,
      duplex: "half",
    } as RequestInit & { duplex: "half" }));
    deadline.abort(new DOMException("deadline", "TimeoutError"));
    const response = await pending;
    expect(response.status).toBe(504);
    expect(cancel).toHaveBeenCalled();
    expect(prepareVisitReport).not.toHaveBeenCalled();
    timeout.mockRestore();
  });
});

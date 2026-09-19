import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { convert } = vi.hoisted(() => ({ convert: vi.fn() }));
vi.mock("@elevenlabs/elevenlabs-js", () => ({
  ElevenLabsClient: class {
    speechToText = { convert };
  },
}));
import { POST } from "@/app/api/transcribe/route";

function request(bytes = 100, type = "audio/webm") {
  const form = new FormData();
  form.set(
    "audio",
    new File([new Uint8Array(bytes)], "patient.webm", { type }),
  );
  return new Request("http://localhost/api/transcribe", {
    method: "POST",
    body: form,
  });
}
beforeEach(() => {
  vi.stubEnv("ELEVENLABS_API_KEY", "test-only-key");
  convert.mockReset();
  convert.mockResolvedValue({
    text: "مجھے چکر آتے ہیں۔",
    languageCode: "ur",
    words: [
      { text: "مجھے", type: "word", start: 0, end: 0.4 },
      { text: " ", type: "spacing", start: 0.4, end: 0.4 },
      { text: "چکر", type: "word", start: 0.4, end: 0.8 },
    ],
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("POST /api/transcribe", () => {
  it("preserves Urdu and real word timestamps without requesting diarization", async () => {
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(await result.json()).toEqual({
      text: "مجھے چکر آتے ہیں۔",
      language: "ur",
      words: [
        { text: "مجھے", start: 0, end: 0.4 },
        { text: "چکر", start: 0.4, end: 0.8 },
      ],
    });
    expect(convert).toHaveBeenCalledWith(
      expect.objectContaining({
        file: expect.any(File),
        languageCode: "ur",
        diarize: false,
        tagAudioEvents: false,
        modelId: "scribe_v2",
      }),
      expect.objectContaining({ maxRetries: 0, timeoutInSeconds: 45 }),
    );
  });
  it("rejects missing audio before paying for a provider call", async () => {
    const response = await POST(
      new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: new FormData(),
      }),
    );
    expect(response.status).toBe(400);
    expect(convert).not.toHaveBeenCalled();
  });
  it.each([
    [0, "audio/webm", 400],
    [100, "text/html", 415],
    [4 * 1024 * 1024 + 1, "audio/webm", 413],
  ])("rejects invalid audio (%s bytes, %s)", async (bytes, type, status) => {
    expect((await POST(request(bytes, type))).status).toBe(status);
    expect(convert).not.toHaveBeenCalled();
  });
  it("bounds streamed bodies even without a content-length header", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(5 * 1024 * 1024));
        controller.close();
      },
    });
    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x" },
      body,
      duplex: "half",
    } as RequestInit);
    expect((await POST(req)).status).toBe(413);
    expect(convert).not.toHaveBeenCalled();
  });
  it("rejects malformed multipart", async () => {
    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      headers: { "content-type": "multipart/form-data" },
      body: "invalid",
    });
    expect((await POST(req)).status).toBe(400);
  });
  it("reports missing configuration without pretending transcription succeeded", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect((await POST(request())).status).toBe(503);
    expect(convert).not.toHaveBeenCalled();
  });
  it.each([
    [429, 429],
    [401, 503],
    [500, 502],
  ])(
    "maps upstream %s without leaking its error body",
    async (upstream, status) => {
      convert.mockRejectedValue(
        Object.assign(new Error("secret provider details"), {
          statusCode: upstream,
        }),
      );
      const result = await POST(request());
      expect(result.status).toBe(status);
      expect(JSON.stringify(await result.json())).not.toContain(
        "secret provider details",
      );
    },
  );
  it("maps provider timeouts", async () => {
    convert.mockRejectedValue(
      Object.assign(new Error("secret"), { name: "ElevenLabsTimeoutError" }),
    );
    expect((await POST(request())).status).toBe(504);
  });
  it("rejects silence rather than creating an empty account", async () => {
    convert.mockResolvedValue({ text: " ", words: [] });
    expect((await POST(request())).status).toBe(422);
  });
  it("rejects malformed provider responses", async () => {
    convert.mockResolvedValue({ transcripts: [] });
    expect((await POST(request())).status).toBe(502);
  });
});

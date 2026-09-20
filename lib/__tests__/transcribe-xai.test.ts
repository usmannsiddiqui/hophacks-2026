import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { stt, tts, rewrite } = vi.hoisted(() => ({
  stt: vi.fn(),
  tts: vi.fn(),
  rewrite: vi.fn(),
}));
vi.mock("@/lib/voice/providers/xai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/voice/providers/xai")>()),
  transcribeXaiStt: (...args: unknown[]) => stt(...args),
  synthesizeXaiSpeech: (...args: unknown[]) => tts(...args),
  rewriteXaiTranscript: (...args: unknown[]) => rewrite(...args),
}));

import { POST as transcribeXai } from "@/app/api/transcribe/xai/route";
import { POST as speakXai } from "@/app/api/tts/xai/route";

function audioRequest(lang: string, bytes = 100) {
  const form = new FormData();
  form.set(
    "audio",
    new File([new Uint8Array(bytes)], "patient.webm", { type: "audio/webm" }),
  );
  return new Request(`http://localhost/api/transcribe/xai?lang=${lang}`, {
    method: "POST",
    body: form,
  });
}

beforeEach(() => {
  vi.stubEnv("XAI_API_KEY", "test-only-key");
  stt.mockReset();
  tts.mockReset();
  rewrite.mockReset();
  stt.mockResolvedValue({
    text: "मेरा नाम",
    language: "hi",
    words: [{ text: "मेरा", start: 0, end: 0.4 }],
  });
  rewrite.mockImplementation((_text: string, lang: string) =>
    Promise.resolve(lang === "ur" ? "مجھے چکر آتے ہیں۔" : "I feel dizzy."),
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/transcribe/xai", () => {
  it("returns rewritten Urdu without touching Scribe", async () => {
    const result = await transcribeXai(audioRequest("ur"));
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(await result.json()).toEqual({
      text: "مجھے چکر آتے ہیں۔",
      language: "ur",
      words: [{ text: "मेरा", start: 0, end: 0.4 }],
    });
    expect(stt).toHaveBeenCalledWith(expect.any(File), expect.any(AbortSignal));
    expect(rewrite).toHaveBeenCalledWith("मेरा नाम", "ur", expect.any(AbortSignal));
  });

  it("returns an English translation when requested", async () => {
    const result = await transcribeXai(audioRequest("en"));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({
      text: "I feel dizzy.",
      language: "en",
      words: [{ text: "मेरा", start: 0, end: 0.4 }],
    });
    expect(stt).toHaveBeenCalledWith(expect.any(File), expect.any(AbortSignal));
    expect(rewrite).toHaveBeenCalledWith("मेरा नाम", "en", expect.any(AbortSignal));
  });

  it("rejects a missing language choice before paying xAI", async () => {
    const result = await transcribeXai(audioRequest("hi"));
    expect(result.status).toBe(400);
    expect(stt).not.toHaveBeenCalled();
    expect(rewrite).not.toHaveBeenCalled();
  });

  it("reports missing configuration without pretending transcription succeeded", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    expect((await transcribeXai(audioRequest("ur"))).status).toBe(503);
    expect(stt).not.toHaveBeenCalled();
  });
});

describe("POST /api/tts/xai", () => {
  it("returns audio for the requested language", async () => {
    tts.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "audio/mpeg",
    });
    const result = await speakXai(
      new Request("http://localhost/api/tts/xai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "hello", language: "en" }),
      }),
    );
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("audio/mpeg");
    expect(Buffer.from(await result.arrayBuffer())).toEqual(Buffer.from([1, 2, 3]));
    expect(tts).toHaveBeenCalledWith("hello", "en", expect.any(AbortSignal));
  });

  it("rejects a missing language before paying xAI", async () => {
    const result = await speakXai(
      new Request("http://localhost/api/tts/xai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "hello", language: "hi" }),
      }),
    );
    expect(result.status).toBe(400);
    expect(tts).not.toHaveBeenCalled();
  });
});

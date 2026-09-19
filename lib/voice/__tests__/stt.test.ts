import { afterEach, describe, expect, it, vi } from "vitest";

const { scribe } = vi.hoisted(() => ({ scribe: vi.fn() }));
vi.mock("@/lib/voice/providers/scribe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/voice/providers/scribe")>()),
  transcribeScribe: (...args: unknown[]) => scribe(...args),
}));

import { transcribeAudio, TranscriptionError } from "@/lib/voice/stt";

afterEach(() => {
  vi.unstubAllEnvs();
  scribe.mockReset();
});

describe("transcribeAudio", () => {
  it("uses only Scribe with fixed Urdu policy and no keyterm hints", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    const expected = { text: "raw", language: "ur", words: [] } as const;
    scribe.mockResolvedValue(expected);
    const signal = new AbortController().signal;
    const file = new File(["audio"], "patient.wav", { type: "audio/wav" });
    await expect(transcribeAudio(file, signal)).resolves.toBe(expected);
    expect(scribe).toHaveBeenCalledOnce();
    expect(scribe).toHaveBeenCalledWith(file, signal);
  });

  it("fails clearly without configuration and never contacts Scribe", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "  ");
    await expect(
      transcribeAudio(new File(["x"], "x.wav")),
    ).rejects.toMatchObject({ status: 503 });
    expect(scribe).not.toHaveBeenCalled();
  });

  it("does not expose provider diagnostics", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    scribe.mockRejectedValue(
      Object.assign(new Error("secret body request-id-123"), {
        statusCode: 500,
      }),
    );
    const error = await transcribeAudio(new File(["x"], "x.wav")).catch(
      (value) => value,
    );
    expect(error).toBeInstanceOf(TranscriptionError);
    expect(error).toMatchObject({ status: 502 });
    expect(error.message).not.toMatch(/secret|request-id-123/);
    expect(scribe).toHaveBeenCalledOnce();
  });
});

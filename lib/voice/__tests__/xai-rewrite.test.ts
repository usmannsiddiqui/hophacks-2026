import { afterEach, describe, expect, it, vi } from "vitest";
import { rewriteXaiTranscript, XaiVoiceError } from "@/lib/voice/providers/xai";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("rewriteXaiTranscript", () => {
  it("rejects leftover Devanagari for Urdu", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ choices: [{ message: { content: "मेरा नाम" } }] }),
      }),
    );
    await expect(rewriteXaiTranscript("raw", "ur")).rejects.toMatchObject({
      kind: "invalid-response",
    });
  });

  it("keeps Arabic-script Urdu", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "میرا نام عثمان ہے۔" } }],
        }),
      }),
    );
    await expect(rewriteXaiTranscript("मेरा नाम", "ur")).resolves.toBe(
      "میرا نام عثمان ہے۔",
    );
  });

  it("rejects non-English output for the English rewrite", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "میرا نام عثمان ہے۔" } }],
        }),
      }),
    );
    await expect(rewriteXaiTranscript("raw", "en")).rejects.toBeInstanceOf(
      XaiVoiceError,
    );
  });
});

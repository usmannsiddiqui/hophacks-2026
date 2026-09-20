import { afterEach, describe, expect, it, vi } from "vitest";

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

import { transcribeWithXai, speakWithXai, parseXaiLang } from "@/lib/voice/xai";
import { TranscriptionError } from "@/lib/voice/stt";
import { XaiVoiceError } from "@/lib/voice/providers/xai";

afterEach(() => {
  vi.unstubAllEnvs();
  stt.mockReset();
  tts.mockReset();
  rewrite.mockReset();
});

describe("transcribeWithXai", () => {
  it("rewrites Grok STT into Urdu script without replacing Scribe", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key");
    const file = new File(["audio"], "patient.webm", { type: "audio/webm" });
    stt.mockResolvedValue({ text: "मेरा नाम", language: "hi", words: [] });
    rewrite.mockResolvedValue("میرا نام");
    await expect(transcribeWithXai(file, "ur")).resolves.toEqual({
      text: "میرا نام",
      language: "ur",
      words: [],
    });
    expect(stt).toHaveBeenCalledWith(file, undefined);
    expect(rewrite).toHaveBeenCalledWith("मेरा नाम", "ur", undefined);
  });

  it("asks Grok to translate the same speech into English", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key");
    const file = new File(["audio"], "patient.webm", { type: "audio/webm" });
    stt.mockResolvedValue({ text: "मेरा नाम", language: "hi", words: [] });
    rewrite.mockResolvedValue("My name is Usman.");
    await expect(transcribeWithXai(file, "en")).resolves.toMatchObject({
      text: "My name is Usman.",
      language: "en",
    });
    expect(stt).toHaveBeenCalledWith(file, undefined);
    expect(rewrite).toHaveBeenCalledWith("मेरा नाम", "en", undefined);
  });

  it("fails clearly without a key and never contacts xAI", async () => {
    vi.stubEnv("XAI_API_KEY", "  ");
    await expect(
      transcribeWithXai(new File(["x"], "x.wav"), "en"),
    ).rejects.toMatchObject({ status: 503 });
    expect(stt).not.toHaveBeenCalled();
    expect(rewrite).not.toHaveBeenCalled();
  });

  it("does not expose provider diagnostics", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key");
    stt.mockRejectedValue(new XaiVoiceError("upstream"));
    const error = await transcribeWithXai(new File(["x"], "x.wav"), "en").catch(
      (value) => value,
    );
    expect(error).toBeInstanceOf(TranscriptionError);
    expect(error).toMatchObject({ status: 502 });
    expect(error.message).not.toMatch(/secret|request-id/);
  });
});

describe("speakWithXai", () => {
  it("synthesizes the chosen language", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key");
    tts.mockResolvedValue({ bytes: new Uint8Array([1, 2]), contentType: "audio/mpeg" });
    await expect(speakWithXai("hello", "en")).resolves.toEqual({
      bytes: new Uint8Array([1, 2]),
      contentType: "audio/mpeg",
    });
    expect(tts).toHaveBeenCalledWith("hello", "en", undefined);
  });
});

describe("parseXaiLang", () => {
  it("only accepts ur or en", () => {
    expect(parseXaiLang("ur")).toBe("ur");
    expect(parseXaiLang("en")).toBe("en");
    expect(parseXaiLang("hi")).toBeNull();
    expect(parseXaiLang(null)).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rejectReason } from "@/lib/voice/accept";
import type { ProviderResult } from "@/lib/voice/types";

// Vendors are mocked: these tests never touch the network or spend credits.
const run = { scribe: vi.fn(), gemini: vi.fn(), grok: vi.fn() };
vi.mock("@/lib/voice/providers/scribe", () => ({
  SCRIBE_MODELS: ["scribe_v2"], hasScribeKey: () => Boolean(process.env.ELEVENLABS_API_KEY),
  transcribeScribe: (...a: unknown[]) => run.scribe(...a), scribeRealtimeToken: vi.fn(),
}));
vi.mock("@/lib/voice/providers/gemini", () => ({
  GEMINI_MODELS: ["gemini-3.8-flash"], hasGeminiKey: () => Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
  transcribeGemini: (...a: unknown[]) => run.gemini(...a),
}));
vi.mock("@/lib/voice/providers/grok", () => ({
  GROK_MODELS: ["grok-voice-transcribe-2.0"], hasGrokKey: () => Boolean(process.env.XAI_API_KEY),
  transcribeGrok: (...a: unknown[]) => run.grok(...a),
}));

const { chainFor, transcribe, SttChainError, SttError } = await import("@/lib/voice/stt");

const URDU = "پیناڈول اور سیپروکسن لینے آئی ہوں";
const HINDI = "पैनाडोल और सिप्रोक्सिन लेने आई हूँ";
const result = (over: Partial<ProviderResult>): ProviderResult => ({
  text: URDU, lang: "ur", languageCode: "urd", languageProbability: 0.9, seconds: 3,
  words: [], model: "m", source: "scribe", ...over,
});
const audio = new Blob([new Uint8Array(10)], { type: "audio/webm" });

const KEYS = ["ELEVENLABS_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "XAI_API_KEY", "STT_CHAIN_URDU", "STT_CHAIN_ENGLISH"];
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  Object.values(run).forEach(f => f.mockReset());
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("rejectReason", () => {
  it("accepts Urdu script, including Latin brand names", () => {
    expect(rejectReason(result({ text: `${URDU} Panadol` }), "ur")).toBeNull();
  });
  it("rejects Devanagari when Urdu was asked for", () => {
    expect(rejectReason(result({ text: HINDI, lang: "ur" }), "ur")).toMatch(/script/);
  });
  it("rejects a language mismatch, an empty text and Hindi on auto-detect", () => {
    expect(rejectReason(result({ lang: "hi" }), "ur")).toMatch(/heard hi/);
    expect(rejectReason(result({ text: "" }), "ur")).toMatch(/empty/);
    expect(rejectReason(result({ text: HINDI, lang: "hi" }))).toMatch(/auto-detect/);
  });
});

describe("chainFor", () => {
  it("never puts Grok on her voice, even if the env asks", () => {
    process.env.STT_CHAIN_URDU = "grok,gemini,scribe";
    expect(chainFor("ur")).toEqual(["gemini", "scribe"]);
    expect(chainFor(undefined)).toEqual(["gemini", "scribe"]);
  });
  it("uses Gemini first for her voice by default (Urdu verdict, 2026-09-19)", () => {
    expect(chainFor("ur")).toEqual(["gemini", "scribe"]);
    expect(chainFor(undefined)).toEqual(["gemini", "scribe"]);
  });
  it("lets the env flip the Urdu order after the bake-off", () => {
    process.env.STT_CHAIN_URDU = "scribe,gemini";
    expect(chainFor("ur")).toEqual(["scribe", "gemini"]);
  });
  it("uses Grok first for English by default", () => {
    expect(chainFor("en")).toEqual(["grok", "scribe", "gemini"]);
  });
});

describe("transcribe", () => {
  it("returns canned when no provider has a key", async () => {
    const t = await transcribe(audio, { lang: "ur" });
    expect(t.source).toBe("canned");
    expect(t.attempts.map(a => a.outcome)).toEqual(["no-key", "no-key"]);
  });

  it("uses Gemini for Urdu and does not call Scribe when Gemini succeeds", async () => {
    process.env.ELEVENLABS_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY = "k";
    run.gemini.mockResolvedValue(result({ source: "gemini" }));
    const t = await transcribe(audio, { lang: "ur" });
    expect(t.source).toBe("gemini");
    expect(t.attempts).toEqual([{ provider: "gemini", outcome: "ok" }]);
    expect(run.scribe).not.toHaveBeenCalled();
  });

  it("works with only a Gemini key", async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "k";
    run.gemini.mockResolvedValue(result({ source: "gemini" }));
    expect((await transcribe(audio, { lang: "ur" })).source).toBe("gemini");
  });

  it("falls back to Scribe when Gemini errors", async () => {
    process.env.ELEVENLABS_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY = "k";
    run.gemini.mockRejectedValue(new SttError("gemini", "upstream", 500));
    run.scribe.mockResolvedValue(result({}));
    const t = await transcribe(audio, { lang: "ur" });
    expect(t.source).toBe("scribe");
    expect(t.attempts.map(a => `${a.provider}:${a.outcome}`)).toEqual(["gemini:upstream", "scribe:ok"]);
  });

  it("falls back when Gemini returns Devanagari or Roman Urdu for Urdu", async () => {
    process.env.ELEVENLABS_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY = "k";
    run.scribe.mockResolvedValue(result({}));
    for (const text of [HINDI, "Panadol aur Ciproxin lene aayi hoon"]) {
      run.gemini.mockResolvedValueOnce(result({ text, source: "gemini" }));
      const t = await transcribe(audio, { lang: "ur" });
      expect(t.source).toBe("scribe");
      expect(t.attempts[0].outcome).toBe("rejected");
    }
  });

  it("throws with every attempt when all providers fail", async () => {
    process.env.ELEVENLABS_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY = "k";
    run.gemini.mockResolvedValue(result({ text: "" }));
    run.scribe.mockRejectedValue(new SttError("scribe", "timeout"));
    await expect(transcribe(audio, { lang: "ur" })).rejects.toBeInstanceOf(SttChainError);
  });

  it("uses Grok for English and never calls it for Urdu", async () => {
    process.env.XAI_API_KEY = process.env.ELEVENLABS_API_KEY = "k";
    run.grok.mockResolvedValue(result({ text: "I take metformin", lang: "en", source: "grok" }));
    run.scribe.mockResolvedValue(result({}));
    expect((await transcribe(audio, { lang: "en" })).source).toBe("grok");
    await transcribe(audio, { lang: "ur" });
    expect(run.grok).toHaveBeenCalledTimes(1);
  });
});

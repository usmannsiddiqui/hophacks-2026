// Live tests: real Urdu speech through the real Gemini API. Opt-in, because they cost
// (a few cents) and need the network:
//
//   PowerShell:  $env:STT_LIVE="1"; pnpm test lib/voice
//   bash:        STT_LIVE=1 pnpm test lib/voice
//
// Reads GOOGLE_GENERATIVE_AI_API_KEY from the environment or .env.local. Without STT_LIVE
// the suite is skipped; with STT_LIVE but no key it fails, so a skip is never mistaken for a pass.
//
// Fixtures: two clips from Google FLEURS (ur_pk, test split), CC BY 4.0; see fixtures/urdu.json.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rejectReason } from "@/lib/voice/accept";
import { demoKeyterms } from "@/lib/voice/keyterms";
import { transcribeGemini } from "@/lib/voice/providers/gemini";
import { SttChainError, transcribe } from "@/lib/voice/stt";
import { POST } from "@/app/api/transcribe/route";

try { process.loadEnvFile(".env.local"); } catch { /* no .env.local: rely on the shell */ }

const LIVE = process.env.STT_LIVE === "1";
const HAS_KEY = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const TIMEOUT = 60_000;

// FLEURS clips are clean read speech; the counter will be noisier. 20% is a sanity bar for
// "this is a correct Urdu transcript", not our accuracy target (that is the bake-off).
const MAX_CER = 0.2;

const DIR = path.join(__dirname, "fixtures");
const FIXTURES = JSON.parse(readFileSync(path.join(DIR, "urdu.json"), "utf8")) as { file: string; reference: string }[];
const clip = (file: string) => new File([readFileSync(path.join(DIR, file))], file, { type: "audio/wav" });

/** Fold spelling variants, strip diacritics and punctuation, so CER measures words, not typography. */
function normalise(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[ً-ٰٟـ‌‍]/g, "") // harakat, superscript alef, tatweel, ZWNJ/ZWJ
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[هە]/g, "ہ").replace(/ۃ/g, "ہ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Character error rate: edit distance / reference length. */
function cer(hyp: string, ref: string): number {
  const a = [...normalise(hyp)], b = [...normalise(ref)];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length] / Math.max(b.length, 1);
}

/** 16 kHz mono 16-bit PCM WAV of silence. */
function silence(seconds: number): File {
  const n = 16_000 * seconds, buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(16_000, 24); buf.writeUInt32LE(32_000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  return new File([buf], "silence.wav", { type: "audio/wav" });
}

describe("cer helper (offline)", () => {
  it("ignores diacritics, punctuation and yeh/kaf/heh variants", () => {
    expect(cer("بچّے، اور بُوڑھے", "بچے اور بوڑھے")).toBe(0);
    expect(cer("كيا", "کیا")).toBe(0);
    expect(cer("", "abc")).toBe(1);
  });
});

describe.runIf(LIVE)("Gemini Urdu transcription (live)", () => {
  it("has GOOGLE_GENERATIVE_AI_API_KEY (set it in .env.local)", () => {
    expect(HAS_KEY).toBe(true);
  });

  it.each(FIXTURES)("transcribes $file verbatim in Urdu script", async ({ file, reference }) => {
    const t = await transcribeGemini(clip(file), { lang: "ur", keyterms: [] });
    const score = cer(t.text, reference);
    console.info(`[live] ${file} CER=${(score * 100).toFixed(1)}%\n  ref: ${reference}\n  hyp: ${t.text}`);
    expect(t.source).toBe("gemini");
    expect(t.lang).toBe("ur");
    expect(rejectReason(t, "ur")).toBeNull(); // Urdu script, not Devanagari or Roman Urdu
    expect(score).toBeLessThanOrEqual(MAX_CER);
  }, TIMEOUT);

  it("does not invent drug names from the keyterm hints", async () => {
    const { file, reference } = FIXTURES[0];
    const t = await transcribeGemini(clip(file), { lang: "ur", keyterms: demoKeyterms() });
    const invented = demoKeyterms().filter(k => t.text.includes(k) && !reference.includes(k));
    expect(invented).toEqual([]);
    expect(cer(t.text, reference)).toBeLessThanOrEqual(MAX_CER);
  }, TIMEOUT);

  it("detects Urdu without a language hint (live translate path)", async () => {
    const { file } = FIXTURES[1];
    const t = await transcribeGemini(clip(file), { keyterms: [] });
    expect(t.lang).toBe("ur"); // not "hi": spoken Urdu and Hindi are close
    expect(rejectReason(t)).toBeNull();
  }, TIMEOUT);

  it("returns nothing usable for silence instead of inventing speech", async () => {
    const t = await transcribeGemini(silence(2), { lang: "ur", keyterms: demoKeyterms() });
    expect(rejectReason(t, "ur")).not.toBeNull();
  }, TIMEOUT);

  it("the chain uses Gemini first for Urdu", async () => {
    const { file, reference } = FIXTURES[0];
    const t = await transcribe(clip(file), { lang: "ur", keyterms: demoKeyterms() });
    expect(t.source).toBe("gemini");
    expect(t.attempts[0]).toEqual({ provider: "gemini", outcome: "ok" });
    expect(cer(t.text, reference)).toBeLessThanOrEqual(MAX_CER);
  }, TIMEOUT);

  it("the chain fails loudly on silence rather than returning a fake transcript", async () => {
    const run = transcribe(silence(2), { lang: "ur", keyterms: [] });
    // Gemini rejects; Scribe then either has no key (chain error) or also returns nothing usable.
    await expect(run).rejects.toBeInstanceOf(SttChainError);
  }, TIMEOUT * 2);

  it("POST /api/transcribe returns Urdu from Gemini end to end", async () => {
    const { file, reference } = FIXTURES[1];
    const form = new FormData();
    form.append("audio", clip(file));
    form.append("lang", "ur");
    const res = await POST(new Request("http://test/api/transcribe", { method: "POST", body: form }));
    expect(res.status).toBe(200);
    const t = await res.json();
    expect(t.source).toBe("gemini");
    expect(t.lang).toBe("ur");
    expect(cer(t.text, reference)).toBeLessThanOrEqual(MAX_CER);
  }, TIMEOUT);
});

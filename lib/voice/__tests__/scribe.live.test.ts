// Opt-in paid test: SCRIBE_LIVE=1 ELEVENLABS_API_KEY=... pnpm test lib/voice
// The default suite does not load .env files and never contacts a provider.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { transcribeScribe } from "@/lib/voice/providers/scribe";

const LIVE = process.env.SCRIBE_LIVE === "1";
const HAS_KEY = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
const TIMEOUT = 60_000;
const MAX_CER = 0.3;
const DIR = path.join(__dirname, "fixtures");
const FIXTURES = JSON.parse(
  readFileSync(path.join(DIR, "urdu.json"), "utf8"),
) as { file: string; reference: string }[];
const clip = (file: string) =>
  new File([readFileSync(path.join(DIR, file))], file, { type: "audio/wav" });

function normalise(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[ً-ٰٟـ‌‍]/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[هە]/g, "ہ")
    .replace(/ۃ/g, "ہ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function characterErrorRate(
  hypothesis: string,
  reference: string,
): number {
  const a = [...normalise(hypothesis)],
    b = [...normalise(reference)];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length] / Math.max(b.length, 1);
}

describe("characterErrorRate (offline)", () => {
  it("normalizes Urdu spelling marks and punctuation", () => {
    expect(characterErrorRate("بچّے، اور بُوڑھے", "بچے اور بوڑھے")).toBe(0);
    expect(characterErrorRate("كيا", "کیا")).toBe(0);
    expect(characterErrorRate("", "abc")).toBe(1);
  });
});
describe.runIf(LIVE)("Scribe Urdu transcription (live)", () => {
  it("requires ELEVENLABS_API_KEY", () => {
    expect(
      HAS_KEY,
      "Set ELEVENLABS_API_KEY in the shell; this suite never reads .env.local.",
    ).toBe(true);
  });
});

describe.runIf(LIVE && HAS_KEY)("Scribe Urdu fixture accuracy (live)", () => {
  it.each(FIXTURES)(
    "transcribes $file as usable Urdu",
    async ({ file, reference }) => {
      const transcript = await transcribeScribe(clip(file));
      const score = characterErrorRate(transcript.text, reference);
      console.info(`[scribe-live] ${file} CER=${(score * 100).toFixed(1)}%`);
      expect(transcript.language).toBe("ur");
      expect(score).toBeLessThanOrEqual(MAX_CER);
    },
    TIMEOUT,
  );
});

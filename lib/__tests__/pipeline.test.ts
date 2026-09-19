// End-to-end over the structure step with Gemini mocked out.
//
// This is the test that proves the pipeline's central claim: whatever the model returns,
// a flag can only come from a cited row in data/substances.json. It runs with no API key,
// so it runs in CI and on a fresh clone.

import { beforeEach, describe, expect, it, vi } from "vitest";

const generateObject = vi.fn();
vi.mock("ai", () => ({ generateObject: (...args: unknown[]) => generateObject(...args) }));
vi.mock("@ai-sdk/google", () => ({ google: (id: string) => ({ modelId: id }) }));

import { computeFlags } from "@/lib/flags";
import { describe as describeOwed, readMedList } from "@/lib/insights";
import { STRUCTURE_MODEL, structureTranscript } from "@/lib/structure";
import type { ScribeWord } from "@/lib/transcript";

/** Nasreen Bibi's account, trimmed to the phrases the med items come from. */
const words: ScribeWord[] = [
  { text: "مجھے", start: 8, end: 8.4 },
  { text: "پیناڈول", start: 9, end: 9.6 },
  { text: "اور", start: 10, end: 10.3 },
  { text: "سیپروکسن", start: 11, end: 11.8 },
  { text: "چاہیے", start: 12, end: 12.5 },
  { text: "روز", start: 124, end: 124.4 },
  { text: "صبح", start: 124.5, end: 125 },
  { text: "ایک", start: 125.1, end: 125.4 },
  { text: "سفید", start: 125.5, end: 126 },
  { text: "گولی", start: 126.1, end: 126.6 },
  { text: "کریلے", start: 130, end: 130.6 },
  { text: "کا", start: 130.7, end: 130.9 },
  { text: "جوس", start: 131, end: 131.5 },
  { text: "حکیم", start: 141, end: 141.5 },
  { text: "صاحب", start: 141.6, end: 142 },
  { text: "کا", start: 142.1, end: 142.3 },
  { text: "سفوف", start: 142.4, end: 143 },
];

/** What a well-behaved model returns — plus one term that is not in the vocabulary. */
const modelOutput = {
  request: ["Panadol", "Ciproxin"],
  medList: [
    { term: "acetaminophen", herWords: "پیناڈول", role: "requested", quote: "پیناڈول" },
    { term: "ciprofloxacin", herWords: "سیپروکسن", role: "requested", quote: "سیپروکسن" },
    { term: "metformin", herWords: "روز صبح ایک سفید گولی", role: "takes", since: "about six years", quote: "روز صبح ایک سفید گولی" },
    { term: "bitter_gourd", herWords: "کریلے کا جوس", role: "remedy", quote: "کریلے کا جوس" },
    { term: "hakeem_powder_nightly", herWords: "حکیم صاحب کا سفوف", role: "remedy", quote: "حکیم صاحب کا سفوف" },
  ],
  questions: [
    { urdu: "حکیم صاحب کا سفوف کس چیز کے لیے ہے؟", english: "What is the hakeem's powder for?", why: "An unidentified nightly remedy in a diabetic on metformin.", quote: "حکیم صاحب کا سفوف" },
  ],
};

const input = {
  recordingN: 1,
  urdu: "مجھے پیناڈول اور سیپروکسن چاہیے",
  english: "I need Panadol and Ciproxin",
  words,
};

beforeEach(() => {
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key-not-real");
  generateObject.mockReset();
  generateObject.mockResolvedValue({ object: modelOutput });
});

describe("the source of truth goes in before the transcript", () => {
  it("sends the vocabulary and the interaction table with the call", async () => {
    await structureTranscript(input);

    const call = generateObject.mock.calls[0][0] as { model: { modelId: string }; prompt: string; temperature: number };
    expect(call.model.modelId).toBe(STRUCTURE_MODEL);
    expect(call.temperature).toBe(0);
    // The closed vocabulary and the table are both in the prompt, ahead of her words.
    expect(call.prompt).toContain("bitter_gourd");
    expect(call.prompt).toContain("CITABLE");
    expect(call.prompt).toContain("ASK-ONLY");
    expect(call.prompt.indexOf("Closed vocabulary")).toBeLessThan(call.prompt.indexOf("her words"));
  });
});

describe("what comes back is not trusted", () => {
  it("keeps the terms that exist and downgrades the one that does not", async () => {
    const out = await structureTranscript(input);

    expect(out.medList.map(m => m.term)).toEqual([
      "acetaminophen",
      "ciprofloxacin",
      "metformin",
      "bitter_gourd",
      "unidentified", // hakeem_powder_nightly is not in the vocabulary
    ]);
    expect(out.rejectedTerms).toEqual(["hakeem_powder_nightly"]);
  });

  it("keeps her own words on every item", async () => {
    const out = await structureTranscript(input);
    for (const m of out.medList) expect(m.herWords).toBeTruthy();
    expect(out.medList[4].herWords).toBe("حکیم صاحب کا سفوف");
  });

  it("resolves each item to the second it was spoken", async () => {
    const out = await structureTranscript(input);
    expect(out.medList.map(m => ("recording" in m.at ? m.at.t : null))).toEqual([9, 11, 124, 130, 141]);
  });
});

describe("flags come from the table, never from the model", () => {
  it("finds exactly the two cited pairs, with their sources", async () => {
    const out = await structureTranscript(input);
    const flags = computeFlags(out.medList);

    expect(flags).toHaveLength(2);
    expect(flags[0].severity).toBe("high"); // sorted, high first
    for (const f of flags) expect(f.citation).toBeTruthy();

    const named = flags.map(f => {
      const byId = Object.fromEntries(out.medList.map(m => [m.id, m.term]));
      return [byId[f.a], byId[f.b]].sort().join("+");
    }).sort();
    expect(named).toEqual(["bitter_gourd+metformin", "ciprofloxacin+metformin"]);
  });

  it("will not flag a real, serious interaction that has no citation", async () => {
    // warfarin + st_johns_wort is major and in the table, but carries no source.
    // ADR 0001 says an uncited row cannot go on screen as a flag, however real it is.
    generateObject.mockResolvedValue({
      object: {
        request: [],
        medList: [
          { term: "warfarin", herWords: "خون پتلا کرنے والی گولی", role: "takes", quote: "گولی" },
          { term: "st_johns_wort", herWords: "ایک جڑی بوٹی", role: "remedy", quote: "بوٹی" },
        ],
        questions: [],
      },
    });

    const out = await structureTranscript(input);
    expect(out.medList.map(m => m.term)).toEqual(["warfarin", "st_johns_wort"]);
    expect(computeFlags(out.medList)).toEqual([]);

    // It is not dropped, though — the table still owes a question about it.
    const { owed } = readMedList(out.medList, out.questions);
    const pair = owed.filter(o => o.kind === "pair");
    expect(pair).toHaveLength(1);
    expect(describeOwed(pair[0])).toContain("St. John");
  });

  it("produces no flag when the model invents an interaction in prose", async () => {
    generateObject.mockResolvedValue({
      object: {
        ...modelOutput,
        medList: [modelOutput.medList[0]], // paracetamol alone
        questions: [{
          urdu: "کیا؟",
          english: "Does she know Panadol is dangerous with her sugar tablet?",
          why: "DANGER: severe interaction, contraindicated.",
        }],
      },
    });

    const out = await structureTranscript(input);
    // The model shouted about a risk. The table says nothing, so nothing is flagged.
    expect(computeFlags(out.medList)).toEqual([]);
    expect(out.questions[0].text.english.endsWith("?")).toBe(true);
  });
});

describe("the table's own reading of the result", () => {
  it("owes a question for the thing we could not name", async () => {
    const out = await structureTranscript(input);
    const { owed, uncovered } = readMedList(out.medList, out.questions);

    const unidentified = owed.filter(o => o.kind === "unidentified");
    expect(unidentified).toHaveLength(1);
    expect(describeOwed(unidentified[0])).toContain("حکیم صاحب کا سفوف");
    // The model did ask about it, so nothing is left uncovered.
    expect(uncovered).toEqual([]);
  });

  it("reports an owed question nobody asked instead of inventing one", async () => {
    generateObject.mockResolvedValue({ object: { ...modelOutput, questions: [] } });

    const out = await structureTranscript(input);
    const { uncovered } = readMedList(out.medList, out.questions);

    expect(uncovered).toHaveLength(1);
    expect(uncovered[0].kind).toBe("unidentified");
  });

  it("never owes a question for a pair that already flags", async () => {
    const out = await structureTranscript(input);
    const { flags, owed } = readMedList(out.medList, out.questions);
    const flagged = new Set(flags.map(f => [f.a, f.b].sort().join("+")));

    for (const o of owed) {
      if (o.kind !== "pair") continue;
      expect(flagged.has([o.a.id, o.b.id].sort().join("+"))).toBe(false);
    }
  });
});

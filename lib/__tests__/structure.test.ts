import { describe, expect, it } from "vitest";
import file from "@/data/files/mw-1042.json";
import { owedQuestions, readMedList } from "@/lib/insights";
import { normalise } from "@/lib/structure";
import { locate } from "@/lib/transcript";
import type { PatientFile } from "@/lib/types";
import { INTERACTIONS, canFlag, isKnownTerm, vocabularyPrompt } from "@/lib/vocab";

const f = file as unknown as PatientFile;
const input = { recordingN: 1, urdu: "", english: "" };

describe("closed vocabulary", () => {
  it("accepts ids from the file and the escape hatch, nothing else", () => {
    expect(isKnownTerm("metformin")).toBe(true);
    expect(isKnownTerm("bitter_gourd")).toBe(true);
    expect(isKnownTerm("unidentified")).toBe(true);
    expect(isKnownTerm("Metformin")).toBe(false);
    expect(isKnownTerm("paracetamol-ish")).toBe(false);
  });

  it("puts every substance in the prompt", () => {
    const prompt = vocabularyPrompt();
    for (const m of f.medList) {
      if (m.term === "unidentified") continue;
      expect(prompt, m.term).toContain(m.term);
    }
  });
});

describe("the model cannot create a flag", () => {
  it("downgrades a term that is not in the vocabulary", () => {
    const out = normalise(
      {
        request: [],
        medList: [{ term: "st_johns_wort_extract", herWords: "کوئی چیز", role: "remedy", quote: "کوئی چیز" }],
        questions: [],
      },
      input,
    );
    expect(out.medList[0].term).toBe("unidentified");
    expect(out.rejectedTerms).toEqual(["st_johns_wort_extract"]);
  });

  it("drops an item with no words of hers (contract rule 2)", () => {
    const out = normalise(
      {
        request: [],
        medList: [
          { term: "metformin", herWords: "  ", role: "takes", quote: "x" },
          { term: "metformin", herWords: "سفید گولی", role: "takes", quote: "x" },
        ],
        questions: [],
      },
      input,
    );
    expect(out.medList).toHaveLength(1);
    expect(out.medList[0].herWords).toBe("سفید گولی");
  });

  it("forces every question to read as a question (contract rule 3)", () => {
    const out = normalise(
      {
        request: [],
        medList: [],
        questions: [
          { urdu: "کیا؟", english: "She takes the powder daily.", why: "w" },
          { urdu: "کیا؟", english: "How long has she taken it?", why: "w" },
        ],
        questions_note: undefined,
      } as never,
      input,
    );
    for (const q of out.questions) expect(q.text.english.endsWith("?")).toBe(true);
    expect(out.questions[0].text.english).toBe("She takes the powder daily?");
  });

  it("does not reuse ids already on the file", () => {
    const out = normalise(
      {
        request: [],
        medList: [{ term: "metformin", herWords: "گولی", role: "takes", quote: "گولی" }],
        questions: [{ urdu: "کیا؟", english: "Which one?", why: "w" }],
      },
      { ...input, existingMedIds: ["m1", "m2"], existingQuestionIds: ["q1"] },
    );
    expect(out.medList[0].id).toBe("m3");
    expect(out.questions[0].id).toBe("q2");
  });
});

describe("timestamps come from the word stream, not a guess", () => {
  const words = [
    { text: "روز", start: 120, end: 120.4 },
    { text: "صبح", start: 120.5, end: 121 },
    { text: "ایک", start: 121.1, end: 121.5 },
    { text: "سفید", start: 121.6, end: 122 },
    { text: "گولی", start: 122.1, end: 122.6 },
  ];

  it("finds a phrase and returns the second it started", () => {
    expect(locate(words, "ایک سفید گولی")).toBe(121);
  });

  it("returns null rather than a wrong timestamp", () => {
    expect(locate(words, "کریلے کا جوس")).toBeNull();
    expect(locate([], "کچھ بھی")).toBeNull();
    expect(locate(undefined, "کچھ بھی")).toBeNull();
  });
});

describe("what the table owes, independent of the model", () => {
  it("only citable rows can flag; the rest are owed as questions", () => {
    for (const row of INTERACTIONS) {
      if (canFlag(row)) expect(row.source).toBeTruthy();
      else expect(row.severity === "minor" || !row.source).toBe(true);
    }
  });

  it("owes a question for every unidentified item", () => {
    const owed = owedQuestions(f.medList);
    const unidentified = f.medList.filter(m => m.term === "unidentified");
    expect(unidentified.length).toBeGreaterThan(0);
    for (const item of unidentified) {
      expect(owed.some(o => o.kind === "unidentified" && o.item.id === item.id)).toBe(true);
    }
  });

  it("never owes a pair that already flags", () => {
    const { flags, owed } = readMedList(f.medList, f.questions);
    const flagged = new Set(flags.map(x => [x.a, x.b].sort().join("+")));
    for (const o of owed) {
      if (o.kind !== "pair") continue;
      expect(flagged.has([o.a.id, o.b.id].sort().join("+"))).toBe(false);
    }
  });

  it("the canned file's questions cover what the table owes", () => {
    const { uncovered } = readMedList(f.medList, f.questions);
    expect(uncovered.map(o => (o.kind === "unidentified" ? o.item.id : `${o.a.id}+${o.b.id}`))).toEqual([]);
  });
});

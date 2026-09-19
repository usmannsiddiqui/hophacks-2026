// Legacy PatientFile normalisation retained for its table and provenance tests.
// The active Gemini provider boundary is lib/llm.ts and produces VisitReport.

import type { MedItem, Question } from "@/lib/types";
import { sourceRef, type ScribeWord } from "@/lib/transcript";
import { isKnownTerm, UNIDENTIFIED } from "@/lib/vocab";

type LegacyModelOutput = {
  request: string[];
  medList: Array<{
    term: string;
    herWords: string;
    role: "requested" | "takes" | "remedy" | "prescribed";
    since?: string;
    quote: string;
  }>;
  questions: Array<{
    urdu: string;
    english: string;
    why: string;
    quote?: string;
  }>;
};

export type StructureInput = {
  recordingN: number;
  urdu: string;
  english: string;
  words?: ScribeWord[];
  existingMedIds?: string[];
  existingQuestionIds?: string[];
};

export type StructureResult = {
  request: string[];
  medList: MedItem[];
  questions: Question[];
  rejectedTerms: string[];
};

function nextId(prefix: string, existing: string[]): () => string {
  const used = new Set(existing);
  let n = 0;
  return () => {
    let id: string;
    do id = `${prefix}${++n}`; while (used.has(id));
    used.add(id);
    return id;
  };
}

function asQuestion(value: string): string {
  const text = value.trim().replace(/[.!\s]+$/, "");
  return text.endsWith("?") ? text : `${text}?`;
}

export function normalise(object: LegacyModelOutput, input: StructureInput): StructureResult {
  const medId = nextId("m", input.existingMedIds ?? []);
  const qId = nextId("q", input.existingQuestionIds ?? []);
  const rejectedTerms: string[] = [];
  const medList: MedItem[] = [];
  for (const row of object.medList) {
    const herWords = row.herWords?.trim();
    if (!herWords) continue;
    let term = row.term.trim();
    if (!isKnownTerm(term)) {
      rejectedTerms.push(term);
      term = UNIDENTIFIED;
    }
    medList.push({
      id: medId(),
      term,
      herWords,
      source: "voice",
      role: row.role === "prescribed" ? "takes" : row.role,
      ...(row.since?.trim() ? { since: row.since.trim() } : {}),
      at: sourceRef(input.recordingN, input.words, row.quote || herWords),
    });
  }
  const questions = object.questions
    .filter((item) => item.urdu?.trim() && item.english?.trim())
    .map((item) => ({
      id: qId(),
      text: { urdu: item.urdu.trim(), english: asQuestion(item.english) },
      why: item.why.trim(),
      from: [sourceRef(input.recordingN, input.words, item.quote || "")],
    }));
  return {
    request: object.request.map((item) => item.trim()).filter(Boolean),
    medList,
    questions,
    rejectedTerms,
  };
}

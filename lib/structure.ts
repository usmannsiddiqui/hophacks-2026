// Step 2 of the pipeline: her transcript becomes the three lists the file is built from.
//
// Gemini has exactly two jobs here (ADR 0001): map what she said onto a term that already
// exists in data/substances.json, and raise a question when something is missing or the
// table cannot settle it. It is never asked for a flag, and the schema below gives it
// nowhere to put one. Flags are computed afterwards, by lib/flags.ts, from the table.

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { MedItem, Question } from "@/lib/types";
import { sourceRef, type ScribeWord } from "@/lib/transcript";
import { UNIDENTIFIED, interactionPrompt, isKnownTerm, vocabularyPrompt } from "@/lib/vocab";

export const STRUCTURE_MODEL = "gemini-3.5-flash";
export const STRUCTURE_XAI_MODEL = "grok-4.6";
export type StructureProvider = "gemini" | "xai";

function xaiApiKey(): string | undefined {
  return process.env["XAI-API_KEY"] || process.env.XAI_API_KEY;
}

export function hasStructureKey(provider: StructureProvider = "gemini"): boolean {
  return provider === "xai" ? Boolean(xaiApiKey()) : Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

/** What the model is allowed to return. Note the absence of anything flag-shaped. */
const ModelOutput = z.object({
  request: z.array(z.string()).describe("What she asked for over the counter, in her words, verbatim."),
  medList: z.array(
    z.object({
      term: z.string().describe("A substance id from the vocabulary, or exactly 'unidentified'."),
      herWords: z.string().describe("Her own Urdu words for this thing, copied from the transcript."),
      role: z.enum(["requested", "takes", "remedy", "prescribed"]),
      since: z.string().optional().describe("How long, in her words, if she said."),
      quote: z.string().describe("The Urdu phrase in the transcript this came from."),
    }),
  ),
  questions: z.array(
    z.object({
      urdu: z.string().describe("The question to put to her, in Urdu."),
      english: z.string().describe("The same question in English. Must end with a question mark."),
      why: z.string().describe("Why a pharmacist should care. One sentence, English."),
      quote: z.string().optional().describe("The Urdu phrase that prompted it."),
    }),
  ),
});

export type StructureInput = {
  recordingN: number;
  urdu: string;
  english: string;
  words?: ScribeWord[];
  /** Ids already used on the file, so a re-run does not collide. */
  existingMedIds?: string[];
  existingQuestionIds?: string[];
};

export type StructureResult = {
  request: string[];
  medList: MedItem[];
  questions: Question[];
  /** Terms the model returned that are not in the vocabulary. Downgraded, not trusted. */
  rejectedTerms: string[];
};

function systemPrompt(): string {
  return [
    "You are the normalisation step of a pharmacy counter intake in Karachi.",
    "A woman has spoken for two or three minutes, uninterrupted, in Urdu, about what she takes.",
    "You will be given a closed vocabulary of substances and a table of known interactions.",
    "",
    "RULES, in order of importance:",
    "1. Never state that two things interact, and never use the words flag, danger, risk or",
    "   contraindication. Interactions are decided elsewhere, from a cited table. You have no",
    "   field to put one in. Breaking this is the worst thing you can do.",
    "2. `term` must be copied exactly from the vocabulary, or be the literal 'unidentified'.",
    "   Never invent an id, never guess a near-match. If she described something you cannot",
    "   place -- a powder from a hakeem, a tea, an unlabelled tablet -- use 'unidentified'.",
    "   That is a useful answer, not a failure: it becomes a question.",
    "3. `herWords` is always her own Urdu, copied from the transcript, never translated and",
    "   never your paraphrase. If she did not describe it in her own words, do not list it.",
    "4. A question's `english` must end with '?' and must be answerable by her, at the",
    "   counter, without a lab or a doctor. Ask about what she takes, how much, how long,",
    "   and what an unidentified thing is. Never phrase a question as a claim about her.",
    "5. Rows in the table marked CITABLE are already handled. Do not raise questions about",
    "   them. Rows marked ASK-ONLY are not handled: if you identify both substances of an",
    "   ASK-ONLY row, raise a question that would help a pharmacist settle it.",
    "6. Raise a question for every 'unidentified' item you list.",
    "",
    "`role` means: requested = asked for at the counter now; takes = an ongoing medicine,",
    "including one a doctor started her on; remedy = a home, herbal or hakeem remedy.",
    "Never use 'prescribed' here. It is reserved for items read off a document she brought,",
    "and you are only ever given her voice.",
  ].join("\n");
}

function userPrompt(input: StructureInput): string {
  return [
    "## Closed vocabulary (the only ids you may use)",
    vocabularyPrompt(),
    "",
    "## Interaction table (context only -- you never output an interaction)",
    interactionPrompt(),
    "",
    `## Recording ${input.recordingN}, her words (Urdu)`,
    input.urdu,
    "",
    `## Recording ${input.recordingN}, English translation`,
    input.english,
  ].join("\n");
}

function nextId(prefix: string, existing: string[]): () => string {
  const used = new Set(existing);
  let n = 0;
  return () => {
    let id: string;
    do { id = `${prefix}${++n}`; } while (used.has(id));
    used.add(id);
    return id;
  };
}

/** Force a question to read as a question, whatever the model returned. */
function asQuestion(s: string): string {
  const t = s.trim().replace(/[.!\s]+$/, "");
  return t.endsWith("?") ? t : `${t}?`;
}

/**
 * Run the model, then distrust it. Every term is checked against the vocabulary, every
 * question is forced interrogative, and anything without her words is dropped -- the
 * contract says a voice item must carry them.
 */
export async function structureTranscript(
  input: StructureInput,
  provider: StructureProvider = "gemini",
): Promise<StructureResult> {
  if (provider === "xai") return structureWithXai(input);

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  const { object } = await generateObject({
    model: google(STRUCTURE_MODEL),
    schema: ModelOutput,
    system: systemPrompt(),
    prompt: userPrompt(input),
    temperature: 0,
  });

  return normalise(object, input);
}

const XAI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["request", "medList", "questions"],
  properties: {
    request: { type: "array", items: { type: "string" } },
    medList: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "herWords", "role", "since", "quote"],
        properties: {
          term: { type: "string" },
          herWords: { type: "string" },
          role: { type: "string", enum: ["requested", "takes", "remedy", "prescribed"] },
          since: { type: "string" },
          quote: { type: "string" },
        },
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["urdu", "english", "why", "quote"],
        properties: {
          urdu: { type: "string" },
          english: { type: "string" },
          why: { type: "string" },
          quote: { type: "string" },
        },
      },
    },
  },
} as const;

async function structureWithXai(input: StructureInput): Promise<StructureResult> {
  const apiKey = xaiApiKey();
  if (!apiKey) throw new Error("XAI-API_KEY is not set");

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: STRUCTURE_XAI_MODEL,
      temperature: 0,
      reasoning_effort: "low",
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: userPrompt(input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "structure_output", schema: XAI_SCHEMA, strict: true },
      },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`xAI ${res.status}: ${raw.slice(0, 400)}`);
  }

  const payload = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("xAI returned no content");

  const parsed = JSON.parse(content) as z.infer<typeof ModelOutput>;
  const object = ModelOutput.parse({
    request: parsed.request ?? [],
    medList: (parsed.medList ?? []).map(row => ({
      ...row,
      since: row.since?.trim() ? row.since : undefined,
    })),
    questions: (parsed.questions ?? []).map(q => ({
      ...q,
      quote: q.quote?.trim() ? q.quote : undefined,
    })),
  });

  return normalise(object, input);
}

/** The validation half, split out so it can be tested without an API key. */
export function normalise(object: z.infer<typeof ModelOutput>, input: StructureInput): StructureResult {
  const medId = nextId("m", input.existingMedIds ?? []);
  const qId = nextId("q", input.existingQuestionIds ?? []);
  const rejectedTerms: string[] = [];

  const medList: MedItem[] = [];
  for (const row of object.medList) {
    const herWords = row.herWords?.trim();
    // Contract rule 2: a voice item without her words cannot exist.
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
      // `prescribed` means "read off a document she brought" (CONTEXT.md). Everything
      // here came from her voice, so a doctor-started medicine is `takes`.
      role: row.role === "prescribed" ? "takes" : row.role,
      ...(row.since?.trim() ? { since: row.since.trim() } : {}),
      at: sourceRef(input.recordingN, input.words, row.quote || herWords),
    });
  }

  const questions: Question[] = object.questions
    .filter(q => q.urdu?.trim() && q.english?.trim())
    .map(q => ({
      id: qId(),
      text: { urdu: q.urdu.trim(), english: asQuestion(q.english) },
      why: q.why.trim(),
      from: [sourceRef(input.recordingN, input.words, q.quote || "")],
    }));

  const request = object.request.map(r => r.trim()).filter(Boolean);

  return { request, medList, questions, rejectedTerms };
}

import { z } from "zod";
import substances from "@/data/substances.json";
import { computeFlags } from "./flags";
import { STATUS_ORDER, speakerFor, type PatientFile } from "./types";

const text = z.string().trim().min(1).max(20000);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const date = z.iso.datetime({ offset: true });
const pair = z.object({
  urdu: z.string().max(20000),
  english: z.string().max(20000),
});
const source = z.union([
  z.object({
    recording: z.number().int().positive(),
    t: z.number().nonnegative(),
  }),
  z.object({ attachment: id }),
]);
const terms = new Set([
  ...substances.substances.map((s) => s.id),
  "unidentified",
]);
const medicine = z
  .object({
    id,
    term: text.refine((t) => terms.has(t), "Unknown medicine term"),
    herWords: text.nullable(),
    english: z.string().trim().min(1).max(300).optional(),
    source: z.enum(["voice", "photo", "document"]),
    role: z.enum(["requested", "takes", "remedy", "prescribed"]),
    since: text.optional(),
    at: source,
  })
  .refine(
    (m) => m.source === "document" || Boolean(m.herWords),
    "Voice and photo items need the patient's words",
  );
const shape = z.object({
  id,
  createdAt: date,
  patient: z.object({
    name: text.max(120),
    age: z.number().int().min(0).max(120),
    sex: z.enum(["F", "M", "Other"]),
    language: z.literal("ur"),
  }),
  place: z.object({ shop: text, area: text, city: text }),
  takenBy: text,
  reviewedBy: z
    .object({ name: text, qualification: text, registration: text, at: date })
    .optional(),
  request: z.array(text).max(100),
  recordings: z
    .array(
      z.object({
        n: z.number().int().positive(),
        speaker: z.literal("patient"),
        seconds: z.number().nonnegative(),
        urdu: text,
        english: text,
        answers: z.array(id),
      }),
    )
    .max(100),
  turns: z
    .array(
      z
        .object({
          id,
          by: z.enum(["patient", "volunteer"]),
          heard: z.enum(["ur", "en"]),
          spoken: text,
          translated: text,
          at: date,
          answers: id.optional(),
        })
        .refine(
          (t) => t.by === speakerFor(t.heard),
          "Speaker must match the language heard",
        ),
    )
    .max(500),
  history: pair,
  medList: z.array(medicine).max(100),
  flags: z.unknown().optional(),
  questions: z
    .array(
      z.object({
        id,
        text: pair.extend({
          urdu: text,
          english: text.refine(
            (s) => s.endsWith("?"),
            "Questions must end with ?",
          ),
        }),
        why: text,
        from: z.array(source).min(1),
        asked: date.optional(),
        answeredIn: text.optional(),
      }),
    )
    .max(100),
  impression: z.string().max(20000).optional(),
  advice: z
    .object({
      // Prose is not required to approve. A pharmacist who reads the file and finds
      // nothing to change should be able to say so; making them write two paragraphs,
      // one of them in Urdu they may not speak, is a toll on a volunteer's ten minutes.
      // What is required is written below: anything other than `keep` has to be
      // explained, because "stop this" with no reason is not something the counter can
      // repeat to her.
      urdu: z.string().max(20000),
      english: z.string().max(20000),
      verdicts: z.record(id, z.enum(["keep", "stop", "swap"])),
      by: text,
      at: date,
      audioUrl: z.url().optional(),
    })
    .optional()
    .refine(
      (a) =>
        !a ||
        Object.values(a.verdicts).every((v) => v === "keep") ||
        Boolean(a.english.trim()),
      "Stopping or swapping something needs a line of English the counter can repeat",
    ),
  attachments: z
    .array(
      z.object({
        id,
        kind: z.enum(["prescription", "report", "photo"]),
        label: text,
        date: text.optional(),
        url: text,
        extracted: z.array(medicine),
      }),
    )
    .max(30),
  status: z.enum([
    "new",
    "recording",
    "structured",
    "asking",
    "sent",
    "signed",
  ]),
});

export class FileError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function validateFile(input: unknown): PatientFile {
  const parsed = shape.safeParse(input);
  if (!parsed.success)
    throw new FileError(
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  const f = parsed.data;
  for (const collection of [f.medList, f.questions, f.turns, f.attachments]) {
    if (new Set(collection.map((x) => x.id)).size !== collection.length)
      throw new FileError("Duplicate identifiers in file");
  }
  for (const q of f.questions) {
    if (
      q.answeredIn &&
      !f.turns.some((t) => t.id === q.answeredIn && t.answers === q.id) &&
      !f.recordings.some(
        (r) => String(r.n) === q.answeredIn && r.answers.includes(q.id),
      )
    )
      throw new FileError(
        "A question answer must reference its recorded answer",
      );
  }
  if (f.status === "signed") {
    if (!f.advice || !f.reviewedBy || f.advice.by !== f.reviewedBy.name)
      throw new FileError(
        "Signing requires a decision on every medicine and the reviewing pharmacist's identity",
      );
    if (f.medList.some((m) => !f.advice?.verdicts[m.id]))
      throw new FileError("Review every medicine before signing");
  }
  return { ...f, flags: computeFlags(f.medList) } as PatientFile;
}
export function applyFilePatch(
  current: PatientFile,
  input: unknown,
): PatientFile {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new FileError("Expected a file patch");
  const patch = input as Partial<PatientFile>;
  if (
    (patch.id !== undefined && patch.id !== current.id) ||
    (patch.createdAt !== undefined && patch.createdAt !== current.createdAt)
  )
    throw new FileError("File identity cannot change");
  if (current.status === "signed")
    throw new FileError("A signed file is closed", 409);
  const next = validateFile({ ...current, ...patch });
  if (STATUS_ORDER.indexOf(next.status) < STATUS_ORDER.indexOf(current.status))
    throw new FileError("Status only moves forward", 409);
  if (next.status === "signed" && current.status !== "sent")
    throw new FileError("Send the file for review before signing", 409);
  return next;
}

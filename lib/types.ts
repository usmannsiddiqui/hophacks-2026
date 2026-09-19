// Executable copy of docs/specs/contracts.md. Change both together.

export type Lang = "ur" | "en";
export type Status = "new" | "recording" | "structured" | "asking" | "sent" | "signed";
export const STATUS_ORDER: Status[] = ["new", "recording", "structured", "asking", "sent", "signed"];

export type SourceRef = { recording: number; t: number } | { attachment: string };

export type Recording = {
  n: number;
  speaker: "patient"; // set by the app before the mic opens — never inferred
  seconds: number;
  urdu: string;
  english: string;
  answers: string[]; // Question ids; empty for Recording 1
};

export type Turn = {
  id: string;
  by: "patient" | "volunteer"; // derived from `heard`, never from the voice
  heard: Lang; // Urdu is hers, English is yours
  spoken: string;
  translated: string;
  at: string;
  answers?: string;
};

export type MedItem = {
  id: string;
  term: string; // substances.json id, or "unidentified"
  herWords: string | null; // null ONLY when source is "document"
  source: "voice" | "photo" | "document";
  role: "requested" | "takes" | "remedy" | "prescribed";
  since?: string;
  at: SourceRef;
};

export type Flag = {
  id: string;
  severity: "high" | "moderate";
  a: string; // MedItem.id
  b: string; // MedItem.id
  reason: string;
  citation: string;
};

export type Question = {
  id: string;
  text: { urdu: string; english: string };
  why: string;
  from: SourceRef[];
  asked?: string;
  answeredIn?: string;
};

export type Advice = {
  urdu: string;
  english: string;
  verdicts: Record<string, "keep" | "stop" | "swap">;
  by: string;
  at: string;
  audioUrl?: string;
};

export type Attachment = {
  id: string;
  kind: "prescription" | "report" | "photo";
  label: string;
  date?: string;
  url: string;
  extracted: MedItem[];
};

export type PatientFile = {
  id: string;
  createdAt: string;
  patient: { name: string; age: number; sex: "F" | "M" | "Other"; language: "ur" };
  place: { shop: string; area: string; city: string };
  takenBy: string;
  reviewedBy?: { name: string; qualification: string; registration: string; at: string };
  request: string[];
  recordings: Recording[];
  turns: Turn[];
  history: { urdu: string; english: string };
  medList: MedItem[];
  flags: Flag[];
  questions: Question[];
  impression?: string;
  advice?: Advice;
  attachments: Attachment[];
  status: Status;
};

/** Turn attribution by language, never by voice (ADR 0007). */
export function speakerFor(heard: Lang): Turn["by"] {
  return heard === "ur" ? "patient" : "volunteer";
}

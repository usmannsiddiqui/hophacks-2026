import substances from "@/data/substances.json";
import type { MedItem, PatientFile, SourceRef } from "./types";

const labels = new Map(substances.substances.map((s) => [s.id, s.display]));
export const medicineName = (term: string) =>
  term === "unidentified"
    ? "Unidentified powder"
    : (labels.get(term) ?? term.replaceAll("_", " "));
export const roleName = (role: MedItem["role"]) =>
  ({
    requested: "Requested",
    takes: "Takes daily",
    remedy: "Remedy",
    prescribed: "Prescribed",
  })[role];
export const cleanCopy = (text: string) => text.replace(/\s*[—–]\s*/g, ", ");
export function answerText(file: PatientFile, questionId: string) {
  return [
    ...file.recordings
      .filter((r) => r.answers.includes(questionId))
      .map((r) => r.english),
    ...file.turns
      .filter((t) => t.answers === questionId)
      .map((t) => t.translated),
  ]
    .map(cleanCopy)
    .join(" ");
}
export function sourceName(source: SourceRef) {
  return "recording" in source
    ? `Recording ${source.recording}, ${Math.floor(source.t / 60)}:${String(source.t % 60).padStart(2, "0")}`
    : "Brought-in document";
}
export function citationName(url: string) {
  if (url.includes("mskcc.org"))
    return "Memorial Sloan Kettering: bitter melon";
  if (url.includes("fda.gov"))
    return "FDA: fluoroquinolone blood sugar warning";
  return url;
}

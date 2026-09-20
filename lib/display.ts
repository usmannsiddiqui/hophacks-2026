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

/** The short English label for a report item — what fits under a bubble. */
export function itemLabel(item: { term: string; name: string }): string {
  return item.term === "unidentified" ? "Unidentified" : item.name;
}

/**
 * The longer English description, shown once someone asks for detail. Only an
 * unidentified item has one: a named medicine is already described by its name, but
 * `Unidentified` plus a line of Urdu tells an English reader nothing about the thing.
 */
export function itemDetail(item: { term: string; english?: string }): string | null {
  if (item.term !== "unidentified") return null;
  return item.english?.trim() || null;
}

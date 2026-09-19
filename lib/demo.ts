import canned from "@/data/files/mw-1042.json";
import type { PatientFile } from "./types";

export const isDemo = (id: string) => id.startsWith("DEMO-");
const key = "mashwara-sample-files-v1";
export function sampleFile(): PatientFile {
  return structuredClone(canned) as PatientFile;
}
export function demoFiles(): PatientFile[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PatientFile[];
  } catch {
    throw new Error(
      "Sample storage could not be read. Clear this site's sample storage and restart the walkthrough.",
    );
  }
}
export function saveDemo(file: PatientFile) {
  if (!isDemo(file.id))
    throw new Error("Only sample files can be stored in this browser");
  const all = demoFiles().filter((f) => f.id !== file.id);
  localStorage.setItem(key, JSON.stringify([...all, file]));
  window.dispatchEvent(new Event("sample-file-change"));
}

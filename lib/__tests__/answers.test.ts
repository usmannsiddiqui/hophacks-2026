import { expect, it } from "vitest";
import { answerText } from "@/lib/display";
import canned from "@/data/files/mw-1042.json";
import type { PatientFile } from "@/lib/types";
it("renders a follow-up recording as an answer in the review and report", () => {
  const f = structuredClone(canned) as PatientFile;
  f.recordings.push({
    n: 2,
    speaker: "patient",
    seconds: 8,
    urdu: "نمونہ",
    english: "One tablet each morning.",
    answers: ["q3"],
  });
  f.questions[2].answeredIn = "2";
  expect(answerText(f, "q3")).toBe("One tablet each morning.");
  expect(answerText(f, "q1")).toBe(
    "He gave it for weakness. I take it at night. No, it's at home. Nothing is written on it.",
  );
  expect(answerText(f, "q4")).toBe("");
});

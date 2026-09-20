// What the counter shows her when the pharmacist wrote nothing.
//
// Advice prose is optional: a pharmacist who finds nothing to change should not have
// to write two paragraphs to say so. But the patient-facing screen is the last step of
// the visit, and an empty box with a Play button that speaks silence is worse than the
// form that used to block.
//
// The fallback is not generated advice. It is the per-item decisions, already made and
// already signed, put into a sentence — so nothing here asserts anything the pharmacist
// did not decide.

import type { PatientFile } from "./types";

/** A fixed sentence, not model output: it restates verdicts the pharmacist signed. */
const NOTHING_TO_CHANGE = {
  english: "The pharmacist reviewed your medicines and had nothing to change.",
  urdu: "فارماسسٹ نے آپ کی دوائیں دیکھ لی ہیں۔ کوئی تبدیلی نہیں کرنی۔",
};

export type AdviceCopy = {
  english: string;
  urdu: string;
  /** True when the words came from the pharmacist rather than from the decisions. */
  written: boolean;
};

export function adviceCopy(file: PatientFile): AdviceCopy | null {
  const advice = file.advice;
  if (!advice) return null;

  const english = advice.english.trim();
  const urdu = advice.urdu.trim();
  if (english || urdu) return { english, urdu, written: true };

  // Nothing written. The schema only permits that when every verdict is `keep`, so the
  // decisions themselves are the whole message.
  return { ...NOTHING_TO_CHANGE, written: false };
}

/** Items the pharmacist did not simply keep — the part she has to act on. */
export function changedItems(file: PatientFile) {
  const verdicts = file.advice?.verdicts ?? {};
  return file.medList.filter((m) => verdicts[m.id] && verdicts[m.id] !== "keep");
}

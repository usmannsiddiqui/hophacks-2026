import { NextResponse } from "next/server";
import { getFile, saveFile } from "@/lib/files";
import { computeFlags } from "@/lib/flags";
import { describe, readMedList } from "@/lib/insights";
import { hasStructureKey, structureTranscript } from "@/lib/structure";
import { laneMeta, parseStructureLane, type StructureLane } from "@/lib/structure-lanes";
import { toRecording, type TranscriptInput } from "@/lib/transcript";
import { STATUS_ORDER, type PatientFile } from "@/lib/types";

export const maxDuration = 60;

type Body = {
  fileId: string;
  transcript: TranscriptInput;
  provider?: StructureLane;
  /** Replace the file's voice-derived lists instead of merging onto canned items. */
  fresh?: boolean;
};

/**
 * Step 2 of the pipeline. Scribe hands us her Urdu and its English; this turns them into
 * the three lists (request, medList, questions), then reads the interaction table over
 * the result. Order matters and is not an accident: the vocabulary and the table are
 * loaded first and constrain the model, rather than the model being checked afterwards.
 */
export async function POST(req: Request) {
  const { fileId, transcript, provider: rawProvider, fresh } = (await req.json()) as Body;
  const provider = parseStructureLane(rawProvider);
  const meta = laneMeta(provider);
  const started = Date.now();

  if (!fileId || !transcript?.urdu?.trim()) {
    return NextResponse.json({ error: "fileId and transcript.urdu are required" }, { status: 400 });
  }

  const current = await getFile(fileId);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!hasStructureKey(provider)) {
    const key = provider === "gemini" ? "GOOGLE_GENERATIVE_AI_API_KEY" : "XAI-API_KEY";
    return NextResponse.json(
      { error: `${key} is not set`, hint: "add it to .env.local" },
      { status: 503 },
    );
  }

  let result;
  try {
    result = await structureTranscript({
      recordingN: transcript.n,
      urdu: transcript.urdu,
      english: transcript.english,
      words: transcript.words,
      existingMedIds: fresh ? [] : current.medList.map(m => m.id),
      existingQuestionIds: fresh ? [] : current.questions.map(q => q.id),
    }, provider);
  } catch (e) {
    return NextResponse.json({ error: "structuring failed", detail: String(e) }, { status: 502 });
  }

  const recording = toRecording(transcript);

  // Re-structuring a recording replaces what that recording produced, it does not add to
  // it. Appending would double every item and put a second edge on the bubble map for
  // one interaction. Items from other recordings and from documents are left alone.
  const fromThisRecording = (ref: { recording: number } | { attachment: string }) =>
    "recording" in ref && ref.recording === recording.n;

  const medList = fresh
    ? result.medList
    : [...current.medList.filter(m => !fromThisRecording(m.at)), ...result.medList];

  // Answered questions survive: the answer cost a real exchange at the counter, and the
  // model has no way to reproduce it. A fresh demo run starts the questions from this
  // transcript alone, so canned follow-ups do not leak onto the bubble map.
  const questions = fresh
    ? result.questions
    : [
        ...current.questions.filter(q => q.answeredIn || !q.from.every(fromThisRecording)),
        ...result.questions,
      ];

  const next: PatientFile = {
    ...current,
    request: fresh ? result.request : [...new Set([...current.request, ...result.request])],
    recordings: fresh
      ? [recording]
      : [...current.recordings.filter(r => r.n !== recording.n), recording].sort((a, b) => a.n - b.n),
    history: { urdu: recording.urdu, english: recording.english },
    medList,
    questions,
    // Never from the model (ADR 0001).
    flags: computeFlags(medList),
    status: STATUS_ORDER.indexOf(current.status) < STATUS_ORDER.indexOf("structured") ? "structured" : current.status,
  };

  await saveFile(next);

  const insights = readMedList(next.medList, next.questions);
  return NextResponse.json({
    file: next,
    insights: {
      flags: insights.flags.length,
      owed: insights.owed.map(describe),
      uncovered: insights.uncovered.map(describe),
      rejectedTerms: result.rejectedTerms,
      provider,
      model: meta.model,
      ms: Date.now() - started,
    },
  });
}

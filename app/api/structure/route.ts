import { NextResponse } from "next/server";
import { getFile, saveFile } from "@/lib/files";
import { computeFlags } from "@/lib/flags";
import { describe, readMedList } from "@/lib/insights";
import { structureTranscript } from "@/lib/structure";
import { toRecording, type TranscriptInput } from "@/lib/transcript";
import { STATUS_ORDER, type PatientFile } from "@/lib/types";

export const maxDuration = 60;

type Body = { fileId: string; transcript: TranscriptInput };

/**
 * Step 2 of the pipeline. Scribe hands us her Urdu and its English; this turns them into
 * the three lists (request, medList, questions), then reads the interaction table over
 * the result. Order matters and is not an accident: the vocabulary and the table are
 * loaded first and constrain the model, rather than the model being checked afterwards.
 */
export async function POST(req: Request) {
  const { fileId, transcript } = (await req.json()) as Body;

  if (!fileId || !transcript?.urdu?.trim()) {
    return NextResponse.json({ error: "fileId and transcript.urdu are required" }, { status: 400 });
  }

  const current = await getFile(fileId);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY is not set", hint: "add it to .env.local" },
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
      existingMedIds: current.medList.map(m => m.id),
      existingQuestionIds: current.questions.map(q => q.id),
    });
  } catch (e) {
    return NextResponse.json({ error: "structuring failed", detail: String(e) }, { status: 502 });
  }

  const recording = toRecording(transcript);
  const medList = [...current.medList, ...result.medList];
  const questions = [...current.questions, ...result.questions];

  const next: PatientFile = {
    ...current,
    request: [...new Set([...current.request, ...result.request])],
    recordings: [...current.recordings.filter(r => r.n !== recording.n), recording].sort((a, b) => a.n - b.n),
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
    },
  });
}

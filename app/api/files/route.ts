import { NextResponse } from "next/server";
import { listFiles, saveFile } from "@/lib/files";
import type { PatientFile } from "@/lib/types";

export async function GET() {
  const all = await listFiles();
  return NextResponse.json(all.map(f => ({ id: f.id, patient: f.patient, place: f.place, status: f.status, flags: f.flags.length, questionsOpen: f.questions.filter(q => !q.answeredIn).length, createdAt: f.createdAt })));
}

export async function POST(req: Request) {
  const file = (await req.json()) as PatientFile;
  await saveFile(file);
  return NextResponse.json(file, { status: 201 });
}

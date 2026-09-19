import { NextResponse } from "next/server";
import { getFile, saveFile } from "@/lib/files";
import { computeFlags } from "@/lib/flags";
import { STATUS_ORDER, type PatientFile } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  return file ? NextResponse.json(file) : NextResponse.json({ error: "not found" }, { status: 404 });
}

/** Shallow merge. Flags are always recomputed from medList (ADR 0001). Status never moves backwards. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const current = await getFile(id);
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });
  const patch = (await req.json()) as Partial<PatientFile>;
  if (patch.status && STATUS_ORDER.indexOf(patch.status) < STATUS_ORDER.indexOf(current.status)) {
    return NextResponse.json({ error: "status only moves forward" }, { status: 409 });
  }
  const next: PatientFile = { ...current, ...patch, flags: computeFlags(patch.medList ?? current.medList) };
  await saveFile(next);
  return NextResponse.json(next);
}

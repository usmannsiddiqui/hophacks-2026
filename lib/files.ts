import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { files } from "@/lib/db/schema";
import canned from "@/data/files/mw-1042.json";
import type { PatientFile } from "@/lib/types";

const CANNED = canned as unknown as PatientFile;
const hasDb = () => Boolean(process.env.DATABASE_URL);

/** Store: Neon when DATABASE_URL is set, otherwise the canned file (so every screen renders on a fresh clone). */
export async function getFile(id: string): Promise<PatientFile | null> {
  if (!hasDb()) return id === CANNED.id ? CANNED : null;
  const row = await getDb().query.files.findFirst({ where: eq(files.id, id) });
  return row?.data ?? null;
}

export async function listFiles(): Promise<PatientFile[]> {
  if (!hasDb()) return [CANNED];
  const rows = await getDb().select().from(files);
  return rows.map(r => r.data);
}

export async function saveFile(file: PatientFile): Promise<void> {
  if (!hasDb()) return; // canned mode is read-only
  await getDb().insert(files).values({ id: file.id, status: file.status, data: file, updatedAt: new Date() })
    .onConflictDoUpdate({ target: files.id, set: { status: file.status, data: file, updatedAt: new Date() } });
}

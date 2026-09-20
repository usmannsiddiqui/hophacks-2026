/**
 * Returning patients.
 *
 * There is no patient identity in PatientFile and there should not be: the contract is
 * frozen (docs/specs/contracts.md) and a corner pharmacy has no ID system. A phone number
 * is the one key that actually exists in that setting — she knows it, it needs no card.
 *
 * We never store it. Only sha256(phone + PATIENT_HASH_PEPPER) reaches the database, and
 * the hash cannot be reversed to a number without the server-side pepper. The raw number
 * lives in the request body and nowhere else.
 *
 * Division of labour:
 *   - previous transcripts, med lists, signed advice  -> Neon (exact, complete, free)
 *   - "what changed since last time"                  -> Backboard (synthesis)
 */

import { createHash } from "node:crypto";
import { desc, eq, isNotNull, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { files } from "@/lib/db/schema";
import type { PatientFile } from "@/lib/types";

const hasDb = () => Boolean(process.env.DATABASE_URL);

/** Digits only, so "0300-1234567" and "03001234567" are the same patient. */
export function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Null when the number is unusable or no pepper is configured — callers then simply treat
 * the case as a first visit rather than hashing with a predictable key.
 */
export function phoneHash(phone: string): string | null {
  const digits = normalisePhone(phone);
  if (digits.length < 7) return null;
  const pepper = process.env.PATIENT_HASH_PEPPER?.trim();
  if (!pepper) return null;
  return createHash("sha256").update(`${digits}${pepper}`).digest("hex");
}

/** Every case this patient has had, newest first. This is the transcript history. */
export async function findPatientCases(hash: string): Promise<PatientFile[]> {
  if (!hasDb()) return [];
  const rows = await getDb()
    .select()
    .from(files)
    .where(eq(files.phoneHash, hash))
    .orderBy(desc(files.createdAt));
  return rows.map((r) => r.data);
}

/**
 * The case she is in the middle of, if any — anything not yet signed. `status` then says
 * which screen to send the volunteer back to, so "continue where we left off" is a lookup
 * and a redirect, with no Backboard involved.
 */
export async function findUnfinishedCase(hash: string): Promise<PatientFile | null> {
  const cases = await findPatientCases(hash);
  return cases.find((c) => c.status !== "signed") ?? null;
}

/** Her Backboard assistant, if a previous visit already created one. */
export async function findAssistantId(hash: string): Promise<string | null> {
  if (!hasDb()) return null;
  const row = await getDb()
    .select({ assistantId: files.assistantId })
    .from(files)
    .where(and(eq(files.phoneHash, hash), isNotNull(files.assistantId)))
    .orderBy(desc(files.createdAt))
    .limit(1);
  return row[0]?.assistantId ?? null;
}

/** Link a case row to a patient and their assistant. Columns only — the JSON is untouched. */
export async function linkCase(
  id: string,
  hash: string | null,
  assistantId: string | null,
): Promise<void> {
  if (!hasDb() || (!hash && !assistantId)) return;
  await getDb()
    .update(files)
    .set({
      ...(hash ? { phoneHash: hash } : {}),
      ...(assistantId ? { assistantId } : {}),
    })
    .where(eq(files.id, id));
}

/** The identity columns stored beside one case row. */
export async function caseLink(
  id: string,
): Promise<{ phoneHash: string | null; assistantId: string | null }> {
  if (!hasDb()) return { phoneHash: null, assistantId: null };
  const row = await getDb()
    .select({ phoneHash: files.phoneHash, assistantId: files.assistantId })
    .from(files)
    .where(eq(files.id, id))
    .limit(1);
  return {
    phoneHash: row[0]?.phoneHash ?? null,
    assistantId: row[0]?.assistantId ?? null,
  };
}

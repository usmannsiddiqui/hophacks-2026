/**
 * Backboard.io — persistent memory only.
 *
 * Backboard remembers what a pharmacist signed, so a follow-up days later does not start
 * from zero. It is deliberately NOT used for anything else:
 *
 *   - Not a model router. Gemini stays the one generation provider (ADR 0005).
 *   - Not the clinical record. Neon holds PatientFile; Backboard compresses and
 *     summarises long threads, which is right for narrative and wrong for a signed record.
 *   - Not a source of flags. Flags come from data/substances.json with a citation (ADR 0001).
 *
 * Scope: memory in Backboard lives on the ASSISTANT and is shared across that assistant's
 * threads. So one assistant per patient is the isolation boundary — without it one
 * patient's history would bleed into the next one's. One thread per visit.
 *
 * Privacy: Backboard receives a case id and clinical narrative. It never receives a name,
 * a phone number or an address — those stay in Neon. Neither store re-identifies a patient
 * on its own.
 *
 * Every call fails soft. If Backboard is slow, down, or unconfigured, the app behaves
 * exactly as it does today.
 */

import type { PatientFile } from "@/lib/types";

const BASE = "https://app.backboard.io/api";
const TIMEOUT_MS = 8000;

export function backboardApiKey(): string | undefined {
  return process.env.BACKBOARD_API_KEY?.trim() || undefined;
}

/** False when no key is configured — every caller then skips Backboard entirely. */
export function hasBackboard(): boolean {
  return Boolean(backboardApiKey());
}

async function call<T>(path: string, body: unknown): Promise<T | null> {
  const key = backboardApiKey();
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[backboard] ${path} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`[backboard] ${path} failed:`, (error as Error).message);
    return null;
  }
}

/**
 * One assistant per patient. Named after the case that created it — never after the
 * patient, so the assistant list carries no identifying information either.
 */
export async function createAssistant(caseId: string): Promise<string | null> {
  const out = await call<{ id?: string; assistant_id?: string }>("/assistants", {
    name: `case-${caseId}`,
    description: "Mashwara patient memory — pharmacist-signed visits only.",
  });
  return out?.id ?? out?.assistant_id ?? null;
}

/**
 * Write one signed visit into the patient's memory.
 *
 * Posting a message is what triggers Backboard's fact extraction, which is the part we
 * want. The same call also tries to generate an assistant reply, and on the hackathon
 * tier — where credit covers Memory & RAG but not LLM chat — that reply comes back
 * `status: "FAILED"`. The memory is still extracted and stored, so a 200 is success and
 * the unused reply is ignored on purpose.
 */
export async function remember(assistantId: string, content: string): Promise<boolean> {
  const out = await call<{ message_id?: string }>("/threads/messages", {
    assistant_id: assistantId,
    content,
    memory: "Auto",
  });
  return out !== null;
}

export type Memory = { id: string; content: string; createdAt: string };

/**
 * Everything this patient's memory holds, newest first.
 *
 * This reads stored facts — it does not ask a model to write a summary. That matters:
 * under ADR 0001 nothing generated may be presented as a clinical claim, and retrieved
 * memories are quotable and attributable in a way a generated paragraph is not. It also
 * needs no LLM credit.
 *
 * Still CONTEXT FOR A PHARMACIST, never an answer for the patient.
 */
export async function recallMemories(assistantId: string): Promise<Memory[]> {
  const key = backboardApiKey();
  if (!key) return [];
  try {
    const res = await fetch(`${BASE}/assistants/${assistantId}/memories`, {
      headers: { "X-API-Key": key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[backboard] memories -> ${res.status}`);
      return [];
    }
    const out = (await res.json()) as {
      memories?: Array<{ id: string; content: string; created_at: string }>;
    };
    return (out.memories ?? [])
      .map((m) => ({ id: m.id, content: m.content, createdAt: m.created_at }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    console.error("[backboard] recallMemories failed:", (error as Error).message);
    return [];
  }
}

/** Forget a patient entirely. One call, so "delete my history" is a real answer. */
export async function forget(assistantId: string): Promise<boolean> {
  const key = backboardApiKey();
  if (!key) return false;
  try {
    const res = await fetch(`${BASE}/assistants/${assistantId}`, {
      method: "DELETE",
      headers: { "X-API-Key": key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch (error) {
    console.error("[backboard] forget failed:", (error as Error).message);
    return false;
  }
}

/**
 * What a signed visit looks like in memory.
 *
 * Only ever built from a file a pharmacist signed, so everything Backboard remembers is
 * content a licensed pharmacist put their name to. Carries no name, phone or address.
 */
export function signedVisitMemo(file: PatientFile): string {
  const lines: string[] = [
    `Visit ${file.id} — ${file.createdAt.slice(0, 10)} at ${file.place.shop}, ${file.place.area}.`,
    `Patient: ${file.patient.age} ${file.patient.sex}, speaks ${file.patient.language}.`,
    "",
    "Her account:",
    file.history.english,
    "",
    "Medicines on this visit:",
    ...file.medList.map(
      (m) =>
        `- ${m.term} (${m.role}, from ${m.source})` +
        (m.herWords ? ` — she called it "${m.herWords}"` : ""),
    ),
  ];

  if (file.flags.length) {
    lines.push("", "Interactions flagged from the curated table:");
    for (const f of file.flags) {
      lines.push(`- ${f.a} + ${f.b} (${f.severity}): ${f.reason} [${f.citation}]`);
    }
  }

  if (file.advice) {
    lines.push("", "Pharmacist advice (signed):", file.advice.english);
    const verdicts = Object.entries(file.advice.verdicts);
    if (verdicts.length) {
      lines.push(
        "Decisions: " +
          verdicts
            .map(([id, v]) => `${file.medList.find((m) => m.id === id)?.term ?? id}: ${v}`)
            .join("; "),
      );
    }
  }

  const unanswered = file.questions.filter((q) => !q.answeredIn);
  if (unanswered.length) {
    lines.push(
      "",
      "Still unanswered after this visit — ask if she returns:",
      ...unanswered.map((q) => `- ${q.text.english} (${q.why})`),
    );
  }

  if (file.reviewedBy) {
    lines.push("", `Reviewed by ${file.reviewedBy.qualification} on ${file.reviewedBy.at}.`);
  }

  return lines.join("\n");
}

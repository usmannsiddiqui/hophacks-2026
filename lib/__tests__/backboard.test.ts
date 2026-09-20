import { afterEach, beforeEach, describe, expect, it } from "vitest";
import file from "@/data/files/mw-1042.json";
import { reviewedVisitMemo, signedVisitMemo } from "@/lib/backboard";
import { sampleSubmission } from "@/lib/sample-visit";
import type { VisitRecord } from "@/lib/review";
import { normalisePhone, phoneHash } from "@/lib/patients";
import type { PatientFile } from "@/lib/types";

const f = file as unknown as PatientFile;

describe("patient identity", () => {
  const saved = process.env.PATIENT_HASH_PEPPER;
  beforeEach(() => {
    process.env.PATIENT_HASH_PEPPER = "test-pepper";
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.PATIENT_HASH_PEPPER;
    else process.env.PATIENT_HASH_PEPPER = saved;
  });

  it("treats the same number written differently as one patient", () => {
    expect(normalisePhone("0300-1234567")).toBe("03001234567");
    expect(phoneHash("0300-1234567")).toBe(phoneHash("0300 123 4567"));
    expect(phoneHash("+92 300 1234567")).toBe(phoneHash("923001234567"));
  });

  it("is deterministic but does not contain the number", () => {
    const h = phoneHash("03001234567");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("03001234567");
    expect(h).toBe(phoneHash("03001234567"));
  });

  it("separates different numbers", () => {
    expect(phoneHash("03001234567")).not.toBe(phoneHash("03001234568"));
  });

  it("refuses to hash without a pepper, rather than using a guessable key", () => {
    delete process.env.PATIENT_HASH_PEPPER;
    expect(phoneHash("03001234567")).toBeNull();
  });

  it("refuses numbers too short to be real", () => {
    expect(phoneHash("123")).toBeNull();
    expect(phoneHash("")).toBeNull();
  });
});

describe("what Backboard is told about a signed visit", () => {
  const memo = signedVisitMemo(f);

  it("never carries her name, and never the shop's phone-style identifiers", () => {
    expect(memo).not.toContain(f.patient.name);
    expect(memo).not.toContain(f.takenBy);
  });

  it("carries the clinical substance a pharmacist would need on a revisit", () => {
    expect(memo).toContain(f.id);
    expect(memo).toContain(f.history.english.slice(0, 40));
    for (const m of f.medList) expect(memo).toContain(m.term);
  });

  it("carries every flag with its citation, never as a bare claim", () => {
    for (const flag of f.flags) {
      expect(memo).toContain(flag.reason);
      expect(memo).toContain(flag.citation);
    }
  });

  it("carries forward what was left unanswered, so a revisit can pick it up", () => {
    const open = f.questions.filter((q) => !q.answeredIn);
    expect(open.length).toBeGreaterThan(0);
    for (const q of open) expect(memo).toContain(q.text.english);
  });

  it("includes the pharmacist's signed advice when there is any", () => {
    if (f.advice) expect(memo).toContain(f.advice.english);
  });
});

describe("failing soft", () => {
  const saved = process.env.BACKBOARD_API_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.BACKBOARD_API_KEY;
    else process.env.BACKBOARD_API_KEY = saved;
  });

  it("does nothing at all when no key is configured", async () => {
    delete process.env.BACKBOARD_API_KEY;
    const { hasBackboard } = await import("@/lib/backboard");
    expect(hasBackboard()).toBe(false);

    const { rememberSignedVisit } = await import("@/lib/remember-visit");
    // Must not throw and must not touch the network.
    await expect(rememberSignedVisit(f)).resolves.toBe("skipped");
  });
});

describe("what Backboard is told about a reviewed visit", () => {
  const submission = sampleSubmission();
  const visit = {
    id: "MV-0001",
    createdAt: new Date().toISOString(),
    patient: submission.patient,
    report: submission.report,
    status: "reviewed",
    review: {
      schemaVersion: 1 as const,
      outcome: "declined" as const,
      items: submission.report.medList.map((m, i) => ({
        medId: m.id,
        decision: (i === 0 ? "declined" : "authorised") as "declined" | "authorised",
        reason: i === 0 ? "Interacts with her blood thinner." : "",
      })),
      note: `Stop the Disprin, ${submission.patient.name}.`,
      urdu: "ڈسپرین بند کر دیں۔",
      by: { name: "Dr Ayesha Khan", qualification: "PharmD", registration: "PK-12345" },
      at: new Date().toISOString(),
    },
  } as unknown as VisitRecord;

  const memo = reviewedVisitMemo(visit);

  it("strips her name, even when she says it herself in her own account", () => {
    // The sample account opens with "My name is Ghulam Fatima" — the name reaches the
    // English narrative without any field carrying it. This is the regression guard.
    for (const part of submission.patient.name.split(/\s+/)) {
      if (part.length >= 3) expect(memo.toLowerCase()).not.toContain(part.toLowerCase());
    }
  });

  it("strips her name from the pharmacist's note too", () => {
    expect(memo).toContain("Stop the Disprin");
    expect(memo).not.toContain(submission.patient.name);
  });

  it("keeps the clinical substance a pharmacist would need on a revisit", () => {
    expect(memo).toContain(visit.id);
    for (const m of submission.report.medList) expect(memo).toContain(m.term);
  });

  it("records what was decided and why it was refused", () => {
    expect(memo).toContain("declined");
    expect(memo).toContain("Interacts with her blood thinner.");
  });

  it("carries every flag with its citation", () => {
    for (const f of submission.report.flags) {
      expect(memo).toContain(f.reason);
      expect(memo).toContain(f.citation);
    }
  });
});

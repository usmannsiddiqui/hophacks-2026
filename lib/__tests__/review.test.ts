import { beforeEach, describe, expect, it } from "vitest";
import {
  blankDecisions,
  decisionSummary,
  outcomeFor,
  REVIEW_SCHEMA_VERSION,
  reviewSchema,
  type PharmacistReview,
} from "@/lib/review";
import { __resetVisits, getVisit, listVisits, reviewVisit, submitVisit } from "@/lib/visits";
import { computeFlags } from "@/lib/flags";
import type { VisitReport } from "@/lib/visit-report";

const reviewedUrdu =
  "روز صبح ایک سفید گولی لیتی ہوں شوگر کے لیے۔ اور روز صبح ایک گلاس کریلے کا جوس بھی پیتی ہوں۔";

const medList: VisitReport["medList"] = [
  {
    id: "m1",
    term: "metformin",
    name: "Metformin",
    herWords: "ایک سفید گولی",
    role: "takes",
    source: { kind: "reviewed-urdu", excerpt: "روز صبح ایک سفید گولی لیتی ہوں" },
  },
  {
    id: "m2",
    term: "bitter_gourd",
    name: "Bitter gourd (karela) juice",
    herWords: "کریلے کا جوس",
    role: "remedy",
    source: { kind: "reviewed-urdu", excerpt: "ایک گلاس کریلے کا جوس" },
  },
];

const report: VisitReport = {
  schemaVersion: 1,
  draftId: "draft-1",
  rawUrdu: reviewedUrdu,
  reviewedUrdu,
  generatedAt: "2026-09-20T10:00:00.000Z",
  model: { provider: "google", name: "gemini-3.5-flash-lite" },
  english: { account: "She takes a white tablet for sugar and drinks karela juice.", summary: "Diabetic." },
  medList,
  questions: [],
  flags: computeFlags(medList),
};

const patient = { name: "Nasreen Bibi", age: 64, sex: "F" as const };

const signedBy = { name: "Sana Qureshi", qualification: "Pharm-D", registration: "TEST-1" };

function review(patch: Partial<PharmacistReview> = {}) {
  return {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    outcome: "authorised",
    items: blankDecisions(["m1", "m2"]),
    note: "Safe to continue both.",
    urdu: "",
    by: signedBy,
    at: "2026-09-20T11:00:00.000Z",
    ...patch,
  };
}

beforeEach(() => __resetVisits());

describe("the report the pharmacist sees carries real flags", () => {
  it("the fixture's karela + metformin interaction is cited", () => {
    expect(report.flags).toHaveLength(1);
    expect(report.flags[0].severity).toBe("high");
    expect(report.flags[0].citation).toBeTruthy();
  });
});

describe("a decision cannot contradict itself", () => {
  it("refuses to authorise overall while one medicine is declined", () => {
    const result = reviewSchema.safeParse(
      review({
        outcome: "authorised",
        items: [
          { medId: "m1", decision: "authorised", reason: "" },
          { medId: "m2", decision: "declined", reason: "Stop the juice while on metformin." },
        ],
      }),
    );
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("Cannot authorise overall");
  });

  it("requires a reason the counter can repeat when declining", () => {
    const result = reviewSchema.safeParse(
      review({
        outcome: "declined",
        items: [
          { medId: "m1", decision: "authorised", reason: "" },
          { medId: "m2", decision: "declined", reason: "   " },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects two decisions for one medicine", () => {
    const result = reviewSchema.safeParse(
      review({
        items: [
          { medId: "m1", decision: "authorised", reason: "" },
          { medId: "m1", decision: "authorised", reason: "" },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("derives the overall answer from the items", () => {
    expect(outcomeFor(blankDecisions(["m1"]))).toBe("authorised");
    expect(
      outcomeFor([{ medId: "m1", decision: "declined", reason: "no" }]),
    ).toBe("declined");
  });
});

describe("the round trip from counter to pharmacist and back", () => {
  it("queues a sent report, then returns the decision", async () => {
    const visit = await submitVisit({ patient, report });
    expect(visit.status).toBe("waiting");
    expect(visit.review).toBeUndefined();

    const queue = await listVisits();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ id: visit.id, status: "waiting", outcome: null, flags: 1 });

    const decided = await reviewVisit(
      visit.id,
      review({
        outcome: "declined",
        items: [
          { medId: "m1", decision: "authorised", reason: "" },
          { medId: "m2", decision: "declined", reason: "Stop the karela juice while on metformin." },
        ],
        note: "Keep the metformin. Stop the juice and see a doctor about the dizziness.",
      }),
    );

    expect(decided.status).toBe("reviewed");
    expect(decided.review?.outcome).toBe("declined");

    // What the counter polls for.
    const seenByCounter = await getVisit(visit.id);
    expect(seenByCounter?.review?.outcome).toBe("declined");
    expect(decisionSummary(seenByCounter!.review!)).toBe("1 of 2 not authorised");
  });

  it("will not overwrite a decision that was already sent back", async () => {
    const visit = await submitVisit({ patient, report });
    await reviewVisit(visit.id, review());
    await expect(reviewVisit(visit.id, review({ note: "Changed my mind." }))).rejects.toThrow(
      /already been reviewed/,
    );
  });

  it("rejects a decision about a medicine that is not on the report", async () => {
    const visit = await submitVisit({ patient, report });
    await expect(
      reviewVisit(visit.id, review({ items: [{ medId: "m9", decision: "authorised", reason: "" }] })),
    ).rejects.toThrow(/No medicine m9/);
  });

  it("404s on an unknown visit", async () => {
    await expect(reviewVisit("MV-0000", review())).rejects.toThrow(/not found/i);
  });

  it("does not let a review touch her account", async () => {
    const visit = await submitVisit({ patient, report });
    const decided = await reviewVisit(visit.id, review());
    expect(decided.report.reviewedUrdu).toBe(report.reviewedUrdu);
    expect(decided.report.rawUrdu).toBe(report.rawUrdu);
    expect(decided.report.medList).toEqual(report.medList);
  });
});

it("carries the selected region with the sent report and pharmacist response", async () => {
  const visit = await submitVisit({patient,report,outreachAreaId:"pasni"});
  expect(visit.outreachAreaId).toBe("pasni");
  const reviewed = await reviewVisit(visit.id,review());
  expect(reviewed.outreachAreaId).toBe("pasni");
});

it("puts the in-memory queue on globalThis so a just-sent visit is visible to other route modules", async () => {
  const visit = await submitVisit({patient,report});
  const shared = (globalThis as { __mashwaraVisits?: Map<string, { id: string }> }).__mashwaraVisits;
  expect(shared?.get(visit.id)?.id).toBe(visit.id);
  expect(await getVisit(visit.id)).toMatchObject({ id: visit.id, status: "waiting" });
});

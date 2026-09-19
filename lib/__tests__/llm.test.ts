import { beforeEach, describe, expect, it, vi } from "vitest";

const generateObject = vi.fn();
vi.mock("ai", () => ({ generateObject: (...args: unknown[]) => generateObject(...args) }));
vi.mock("@ai-sdk/google", () => ({ google: (id: string) => ({ modelId: id }) }));

import { prepareVisitReport, VISIT_REPORT_MODEL } from "@/lib/llm";

const reviewedUrdu = "میں روز میٹفارمن لیتی ہوں اور حکیم کا سفوف بھی لیتی ہوں";

beforeEach(() => {
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
  generateObject.mockReset();
  generateObject.mockResolvedValue({ object: {
    englishAccount: "I take metformin every day and also take a hakeem's powder.",
    medList: [
      { term: "metformin", herWords: "میٹفارمن", role: "prescribed", excerpt: "روز میٹفارمن" },
      { term: "invented_powder", herWords: "حکیم کا سفوف", role: "remedy", excerpt: "حکیم کا سفوف" },
    ],
    questions: [],
  } });
});

describe("Gemini report preparation", () => {
  it("uses one non-retrying Gemini call and derives safe report fields locally", async () => {
    const report = await prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu });
    expect(generateObject).toHaveBeenCalledTimes(1);
    expect(generateObject.mock.calls[0][0]).toMatchObject({
      model: { modelId: VISIT_REPORT_MODEL },
      maxRetries: 0,
      temperature: 0,
    });
    expect(generateObject.mock.calls[0][0].system).toContain("untrusted quoted data");
    expect(generateObject.mock.calls[0][0].prompt).toContain("<reviewed-urdu>");
    expect(report.medList.map((item) => [item.term, item.role, item.name])).toEqual([
      ["metformin", "takes", "Metformin"],
      ["unidentified", "remedy", "unidentified"],
    ]);
    expect(report.english.summary).toContain("Metformin (takes)");
    expect(report.english.summary).not.toBe(report.english.account);
  });

  it("adds a deterministic draft question when an unidentified item is uncovered", async () => {
    const report = await prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu });
    expect(report.questions).toHaveLength(1);
    expect(report.questions[0]).toMatchObject({
      status: "draft",
      source: { kind: "reviewed-urdu", excerpt: "حکیم کا سفوف" },
    });
    expect(report.questions[0].text.english).toContain("unidentified");
  });

  it("drops medicine rows and questions whose evidence is not in reviewed Urdu", async () => {
    generateObject.mockResolvedValue({ object: {
      englishAccount: "English account.",
      medList: [{ term: "metformin", herWords: "انسولین", role: "takes", excerpt: "انسولین" }],
      questions: [{ urdu: "کیا؟", english: "What medicine", excerpt: "انسولین" }],
    } });
    const report = await prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu });
    expect(report.medList).toEqual([]);
    expect(report.questions).toEqual([]);
  });

  it("derives clarification rationale locally rather than reusing generated prose", async () => {
    generateObject.mockResolvedValue({ object: {
      englishAccount: "I take metformin every day.",
      medList: [{ term: "metformin", herWords: "میٹفارمن", role: "takes", excerpt: "میٹفارمن" }],
      questions: [{ urdu: "کتنی مقدار؟", english: "What dose do you take?", excerpt: "میٹفارمن", why: "Start treatment immediately." }],
    } });
    const report = await prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu });
    expect(report.questions[0].why).toBe("The reviewed account leaves a factual detail for clarification.");
    expect(report.questions[0].why).not.toContain("treatment");
  });

  it("rejects provider output that violates the strict schema", async () => {
    generateObject.mockResolvedValue({ object: {
      englishAccount: "English account.",
      medList: [],
      questions: [],
      flags: [{ severity: "high" }],
    } });
    await expect(prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu })).rejects.toThrow();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const generateObject = vi.fn();
vi.mock("ai", () => ({ generateObject: (...args: unknown[]) => generateObject(...args) }));
vi.mock("@ai-sdk/google", () => ({ google: (id: string) => ({ modelId: id }) }));

import {
  LLM_BUSY_ERROR,
  LLM_QUOTA_ERROR,
  prepareVisitReport,
  VISIT_REPORT_FALLBACK_MODELS,
  VISIT_REPORT_MODEL,
} from "@/lib/llm";

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

  it("tells Gemini whose words the follow-up dialogue lines are", async () => {
    await prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu });
    const system: string = generateObject.mock.calls[0][0].system;
    expect(system).toContain("سوال:");
    expect(system).toContain("جواب:");
    expect(system).toContain("not the patient's words");
  });
});

describe("Gemini quota fallback", () => {
  const quota = () => Object.assign(new Error("You exceeded your current quota"), { statusCode: 429 });

  it("moves to the next Gemini model when the primary daily quota is exhausted", async () => {
    const success = generateObject.getMockImplementation();
    generateObject.mockRejectedValueOnce(quota());
    if (success) generateObject.mockImplementationOnce(success);
    const report = await prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu });
    expect(generateObject).toHaveBeenCalledTimes(2);
    expect(generateObject.mock.calls[0][0].model).toEqual({ modelId: VISIT_REPORT_MODEL });
    expect(generateObject.mock.calls[1][0].model).toEqual({ modelId: VISIT_REPORT_FALLBACK_MODELS[0] });
    expect(report.model).toEqual({ provider: "google", name: VISIT_REPORT_FALLBACK_MODELS[0] });
  });

  it("reports quota exhaustion once every configured model is out", async () => {
    generateObject.mockRejectedValue(quota());
    await expect(prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu }))
      .rejects.toThrow(LLM_QUOTA_ERROR);
    expect(generateObject).toHaveBeenCalledTimes(1 + VISIT_REPORT_FALLBACK_MODELS.length);
  });

  it("moves past a model reporting high demand and names the busy state if all are", async () => {
    const overloaded = () => Object.assign(
      new Error("This model is currently experiencing high demand."),
      { statusCode: 503 },
    );
    const success = generateObject.getMockImplementation();
    generateObject.mockRejectedValueOnce(quota()).mockRejectedValueOnce(overloaded());
    if (success) generateObject.mockImplementationOnce(success);
    const report = await prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu });
    expect(generateObject).toHaveBeenCalledTimes(3);
    expect(report.model.name).toBe(VISIT_REPORT_FALLBACK_MODELS[1]);

    generateObject.mockReset();
    generateObject.mockRejectedValue(overloaded());
    await expect(prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu }))
      .rejects.toThrow(LLM_BUSY_ERROR);
  });

  it("does not retry other provider failures on another model", async () => {
    generateObject.mockRejectedValue(Object.assign(new Error("Bad request"), { statusCode: 400 }));
    await expect(prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu }))
      .rejects.toThrow("Bad request");
    expect(generateObject).toHaveBeenCalledTimes(1);
  });
});

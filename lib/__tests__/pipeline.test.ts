import { beforeEach, describe, expect, it, vi } from "vitest";

const generateObject = vi.fn();
vi.mock("ai", () => ({ generateObject: (...args: unknown[]) => generateObject(...args) }));
vi.mock("@ai-sdk/google", () => ({ google: (id: string) => ({ modelId: id }) }));

import { prepareVisitReport } from "@/lib/llm";

const reviewedUrdu = "میں میٹفارمن لیتی ہوں اور کریلے کا جوس پیتی ہوں";

beforeEach(() => {
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
  generateObject.mockReset();
});

describe("VisitReport pipeline", () => {
  it("computes cited flags from normalized terms rather than model prose", async () => {
    generateObject.mockResolvedValue({ object: {
      englishAccount: "I take metformin and drink bitter gourd juice.",
      medList: [
        { term: "metformin", herWords: "میٹفارمن", role: "takes", excerpt: "میٹفارمن" },
        { term: "bitter_gourd", herWords: "کریلے کا جوس", role: "remedy", excerpt: "کریلے کا جوس" },
      ],
      questions: [{
        urdu: "کیا یہ خطرناک ہے؟",
        english: "Is this dangerous?",
        why: "DANGER: invented interaction claim.",
        excerpt: "میٹفارمن",
      }],
    } });
    const report = await prepareVisitReport({ draftId: "d1", rawUrdu: reviewedUrdu, reviewedUrdu });
    expect(report.flags).toHaveLength(1);
    expect(report.flags[0].citation).toBeTruthy();
  });

  it("surfaces an ask-only pair as a draft question and never as a flag", async () => {
    const urdu = "میں وارفرین لیتی ہوں اور سینٹ جانز ورٹ بھی";
    generateObject.mockResolvedValue({ object: {
      englishAccount: "I take warfarin and St. John's wort.",
      medList: [
        { term: "warfarin", herWords: "وارفرین", role: "takes", excerpt: "وارفرین" },
        { term: "st_johns_wort", herWords: "سینٹ جانز ورٹ", role: "remedy", excerpt: "سینٹ جانز ورٹ" },
      ],
      questions: [],
    } });
    const report = await prepareVisitReport({ draftId: "d1", rawUrdu: urdu, reviewedUrdu: urdu });
    expect(report.flags).toEqual([]);
    expect(report.questions).toHaveLength(1);
    expect(report.questions[0].status).toBe("draft");
    expect(report.questions[0].text.english).toContain("Warfarin");
  });
});

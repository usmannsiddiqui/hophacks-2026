import { describe, it, expect } from "vitest";
import { sentReportKey, sentVisitIds, sameReport } from "../sent-visits";
import { sampleSubmission } from "../sample-visit";

describe("sent visit continuity", () => {
  it("keeps different generated versions separate", () => {
    const report = sampleSubmission().report;
    expect(sentReportKey(report)).not.toBe(sentReportKey({ ...report, generatedAt:"2026-09-20T12:00:00.000Z" }));
  });
  it("never treats revised source or medicines as the reviewed snapshot", () => {
    const report = sampleSubmission().report;
    expect(sameReport(report, structuredClone(report))).toBe(true);
    expect(sameReport(report, { ...report, reviewedUrdu:report.reviewedUrdu+" changed" })).toBe(false);
    expect(sameReport(report, { ...report, medList:[] })).toBe(false);
  });
  it("finds legacy and versioned sent links without including unrelated storage", () => {
    const entries = new Map([["mashwara-sent-visit-draft", "MV-1001"], ["mashwara-sent-report-draft-time", "MV-1002"], ["mashwara-sent-report-duplicate", "MV-1001"], ["unrelated", "MV-9999"]]);
    const storage = { length:entries.size, key:(i:number)=>[...entries.keys()][i]??null, getItem:(k:string)=>entries.get(k)??null };
    expect(sentVisitIds(storage)).toEqual(["MV-1001","MV-1002"]);
  });
});

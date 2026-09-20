import type { VisitReport } from "./visit-report";
export const sentReportKey = (report: VisitReport) => `mashwara-sent-report-${report.draftId}-${report.generatedAt}`;
export function sameReport(a: VisitReport, b: VisitReport) {
  return a.draftId===b.draftId && a.generatedAt===b.generatedAt && a.reviewedUrdu===b.reviewedUrdu && a.rawUrdu===b.rawUrdu
    && JSON.stringify(a.medList)===JSON.stringify(b.medList) && JSON.stringify(a.english)===JSON.stringify(b.english)
    && JSON.stringify(a.questions)===JSON.stringify(b.questions) && JSON.stringify(a.flags)===JSON.stringify(b.flags);
}
export function sentVisitIds(storage: Pick<Storage,"length"|"key"|"getItem">): string[] {
  const ids = new Set<string>();
  for(let i=0;i<storage.length;i++) {
    const key=storage.key(i);
    if(key?.startsWith("mashwara-sent-visit-") || key?.startsWith("mashwara-sent-report-")) {
      const id=storage.getItem(key);
      if(id && /^MV-[a-zA-Z0-9-]{1,190}$/.test(id)) ids.add(id);
    }
  }
  return [...ids];
}

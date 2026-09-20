import Link from "next/link";
import { notFound } from "next/navigation";
import { VisitReportView } from "@/components/visit-report";
import { computeFlags } from "@/lib/flags";
import { displayOf } from "@/lib/vocab";
import { visitReportSchema, type ReportMedItem } from "@/lib/visit-report";
import type { VisitDraft } from "@/lib/visit-draft";

// Development-only visual QA. Never calls a provider or writes browser storage.
export default async function ReportPreview({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { scenario = "pairs" } = await searchParams;
  const terms = scenario === "empty" ? [] : scenario === "single" ? ["unidentified"] : scenario === "clear" ? ["acetaminophen", "amlodipine"] : ["acetaminophen", "ciprofloxacin", "metformin", "amlodipine", "bitter_gourd", "unidentified"];
  const words: Record<string, string> = { acetaminophen: "پیناڈول", ciprofloxacin: "سیپروکسن", metformin: "میٹفارمن", amlodipine: "ایملوڈپین", bitter_gourd: "کریلے کا جوس", unidentified: "حکیم کا سفوف" };
  const medList: ReportMedItem[] = terms.map((term, index) => {
    const herWords = scenario === "long" ? `${words[term]} صبح اور رات کو لیتی ہوں اور کبھی کبھی کھانے کے بعد بھی لیتی ہوں` : words[term];
    return { id: `m${index+1}`, term, name: displayOf(term), herWords, role: term === "unidentified" || term === "bitter_gourd" ? "remedy" : "takes", source: { kind: "reviewed-urdu", excerpt: herWords } };
  });
  const urdu = medList.map(item => item.herWords).join("۔ ") || "میں اپنی بات بتانا چاہتی ہوں۔";
  const report = visitReportSchema.parse({ schemaVersion: 1, draftId: "fictional-map-preview", rawUrdu: urdu, reviewedUrdu: urdu,
    generatedAt: "2026-09-19T23:00:00.000Z", model: { provider: "google", name: "fixture-only" },
    english: { account: "Fictional layout fixture listing medicines and remedies for visual review.", summary: "No provider was called. This is not a patient record." },
    medList, flags: computeFlags(medList), questions: [] });
  const draft: VisitDraft = { id: report.draftId, createdAt: report.generatedAt, patient: { name: "Fictional preview", age: 64, sex: "F" }, transcript: { text: urdu, language: "ur", words: [] }, reviewedUrdu: urdu, seconds: 0, followUps: [], status: "transcript-ready", report };
  return <div className="voice-page"><div className="voice-preview-note">Development preview · fictional data · <Link href="?scenario=pairs">Cited pairs</Link> · <Link href="?scenario=single">Unidentified</Link> · <Link href="?scenario=clear">No flags</Link> · <Link href="?scenario=empty">Empty</Link> · <Link href="?scenario=long">Long labels</Link></div><main className="voice-card"><header className="result-topline"><div><span className="eyebrow">Visit result</span><h1>Fictional preview<span>64 · F</span></h1></div></header><VisitReportView key={scenario} draft={draft} /></main></div>;
}

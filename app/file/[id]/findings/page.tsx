import { notFound } from "next/navigation";
import { getFile } from "@/lib/files";
import { describe, readMedList } from "@/lib/insights";
import { FindingsView, type InsightsPayload } from "./view";

type Ctx = { params: Promise<{ id: string }> };

export default async function Page({ params }: Ctx) {
  const { id } = await params;
  const file = await getFile(id);
  if (!file) notFound();

  const insights = readMedList(file.medList, file.questions);
  const payload: InsightsPayload = {
    flags: insights.flags.length,
    owed: insights.owed.map(describe),
    uncovered: insights.uncovered.map(describe),
    rejectedTerms: [],
    provider: "canned",
  };

  return <FindingsView initialFile={file} initialInsights={payload} />;
}

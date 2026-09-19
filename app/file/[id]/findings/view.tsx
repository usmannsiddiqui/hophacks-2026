"use client";

import Link from "next/link";
import { ScenarioWorkbench, type InsightsPayload } from "@/components/scenario-workbench";
import type { PatientFile } from "@/lib/types";

export type { InsightsPayload };

export function FindingsView({
  initialFile,
  initialInsights,
}: {
  initialFile: PatientFile;
  initialInsights: InsightsPayload;
}) {
  return (
    <main className="min-h-dvh bg-surface text-ink">
      <header className="border-b border-line bg-surface-raised px-6 py-4">
        <p className="text-xs text-ink-muted">W2 Web · {initialFile.id} · {initialFile.status}</p>
        <h1 className="mt-1 text-2xl font-medium">Findings and what to ask</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {initialFile.patient.name}, {initialFile.patient.age}{initialFile.patient.sex} · {initialFile.place.shop}, {initialFile.place.area}
        </p>
        <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link className="underline" href="/">Demo</Link>
          <Link className="underline" href={`/file/${initialFile.id}`}>File</Link>
          <Link className="underline" href="/pharmacist">Queue</Link>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <ScenarioWorkbench
          fileId={initialFile.id}
          initialFile={initialFile}
          initialInsights={initialInsights}
          heading="Change the mock account and re-run"
        />
      </div>
    </main>
  );
}

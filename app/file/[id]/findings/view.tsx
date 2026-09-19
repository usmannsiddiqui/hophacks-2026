"use client";

import Link from "next/link";
import { useState } from "react";
import type { Flag, MedItem, PatientFile, Question } from "@/lib/types";
import { displayOf } from "@/lib/vocab";

export type InsightsPayload = {
  flags: number;
  owed: string[];
  uncovered: string[];
  rejectedTerms: string[];
  provider?: string;
};

const ROLE: Record<MedItem["role"], string> = {
  requested: "Requested",
  takes: "Takes daily",
  remedy: "Remedy",
  prescribed: "Prescribed",
};

const SOURCE: Record<MedItem["source"], string> = {
  voice: "Voice",
  photo: "Photo",
  document: "Document",
};

function wordsOf(urdu: string) {
  return urdu
    .split(/[\s\u060C\u06D4.،۔]+/)
    .filter(Boolean)
    .map((text, i) => ({
      text,
      start: +(8 + i * 0.6).toFixed(1),
      end: +(8.4 + i * 0.6).toFixed(1),
    }));
}

function labelOf(item: MedItem | undefined) {
  if (!item) return "?";
  return displayOf(item.term);
}

function worstTouching(id: string, flags: Flag[]): Flag["severity"] | null {
  const hits = flags.filter(f => f.a === id || f.b === id);
  if (hits.some(f => f.severity === "high")) return "high";
  if (hits.some(f => f.severity === "moderate")) return "moderate";
  return null;
}

function BubbleMap({ medList, flags }: { medList: MedItem[]; flags: Flag[] }) {
  const width = 420;
  const height = 280;
  const cx = width / 2;
  const cy = height / 2;
  const ring = 96;
  const nodes = medList.map((m, i) => {
    const angle = (Math.PI * 2 * i) / Math.max(medList.length, 1) - Math.PI / 2;
    const sev = worstTouching(m.id, flags);
    const r = sev === "high" ? 28 : sev === "moderate" ? 22 : 16;
    return { m, x: cx + ring * Math.cos(angle), y: cy + ring * Math.sin(angle), r, sev };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Bubble map of medicines and flags">
      {flags.map(f => {
        const a = nodes.find(n => n.m.id === f.a);
        const b = nodes.find(n => n.m.id === f.b);
        if (!a || !b) return null;
        return (
          <line
            key={f.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={f.severity === "high" ? "#b3261e" : "#8a5a12"}
            strokeWidth={f.severity === "high" ? 2.5 : 1.5}
          />
        );
      })}
      {nodes.map(({ m, x, y, r, sev }) => (
        <g key={m.id}>
          <circle
            cx={x}
            cy={y}
            r={r}
            fill={m.term === "unidentified" ? "#fdf4e6" : sev ? "#fbeceb" : "#f9faf7"}
            stroke={m.term === "unidentified" ? "#8a5a12" : sev ? "#b3261e" : "#dee2de"}
            strokeWidth={1.5}
            strokeDasharray={m.term === "unidentified" ? "4 3" : undefined}
          />
          <text x={x} y={y + r + 14} textAnchor="middle" fontSize="11" fill="#2c2c2c">
            {labelOf(m)}
          </text>
          {m.herWords ? (
            <title>{`${labelOf(m)} — ${m.herWords}`}</title>
          ) : (
            <title>{`${labelOf(m)} — from a document, no words of hers`}</title>
          )}
        </g>
      ))}
    </svg>
  );
}

function FlagPill({ flags }: { flags: Flag[] }) {
  if (!flags.length) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-flag px-3 py-1 text-sm text-white">
      {flags.length} {flags.length === 1 ? "flag" : "flags"}
    </span>
  );
}

function MedicineRow({ item }: { item: MedItem }) {
  return (
    <li className="border-b border-line py-3 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-medium">{displayOf(item.term)}</span>
        <span className="text-xs text-ink-muted">{ROLE[item.role]} · {SOURCE[item.source]}</span>
      </div>
      {item.herWords ? (
        <p className="urdu mt-1 rounded-lg bg-surface-sunken px-3 py-2 text-web-ur">{item.herWords}</p>
      ) : (
        <p className="mt-1 text-sm text-ask">From a document — she did not say this.</p>
      )}
    </li>
  );
}

function FlagCard({ flag, medList }: { flag: Flag; medList: MedItem[] }) {
  if (!flag.citation) return null;
  const byId = Object.fromEntries(medList.map(m => [m.id, m]));
  return (
    <article className="rounded-2xl border border-flag-line bg-flag-wash p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-flag">{flag.severity}</p>
      <h3 className="mt-1 text-base font-medium">
        {labelOf(byId[flag.a])} + {labelOf(byId[flag.b])}
      </h3>
      <p className="mt-2 text-sm">{flag.reason}</p>
      <p className="mt-2 text-xs text-ink-muted">{flag.citation}</p>
    </article>
  );
}

function QuestionCard({ q }: { q: Question }) {
  return (
    <article className="rounded-2xl border border-ask-line bg-ask-wash p-4">
      <p className="text-2xl leading-none text-ask" aria-hidden>?</p>
      <p className="urdu mt-2 text-web-ur">{q.text.urdu}</p>
      <p className="mt-1 text-web-en">{q.text.english}</p>
      <p className="mt-2 text-sm">{q.why}</p>
      {q.answeredIn ? <p className="mt-2 text-xs text-ink-muted">Answered in {q.answeredIn}</p> : null}
    </article>
  );
}

export function FindingsView({
  initialFile,
  initialInsights,
}: {
  initialFile: PatientFile;
  initialInsights: InsightsPayload;
}) {
  const [file, setFile] = useState(initialFile);
  const [insights, setInsights] = useState(initialInsights);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recording = file.recordings.find(r => r.n === 1) ?? file.recordings[0];
  const hold = file.flags.length > 0 && file.status !== "signed";

  async function runStructure() {
    if (!recording) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          provider: "xai",
          transcript: {
            n: recording.n,
            seconds: recording.seconds,
            urdu: recording.urdu,
            english: recording.english,
            words: wordsOf(recording.urdu),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      }
      setFile(data.file);
      setInsights(data.insights);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-surface text-ink">
      <header className="border-b border-line bg-surface-raised px-6 py-4">
        <p className="text-xs text-ink-muted">W2 Web · {file.id} · {file.status}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-medium">Findings and what to ask</h1>
          <FlagPill flags={file.flags} />
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {file.patient.name}, {file.patient.age}{file.patient.sex} · {file.place.shop}, {file.place.area}
        </p>
        {hold ? (
          <p className="mt-3 rounded-2xl border border-flag-line bg-flag-wash px-4 py-3 text-sm">
            Hold the sale. Nothing is sold before the pharmacist signs.
          </p>
        ) : null}
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface-raised p-4">
            <h2 className="text-sm font-medium text-ink-muted">Bubble map</h2>
            <BubbleMap medList={file.medList} flags={file.flags} />
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-ink-muted">Flags</h2>
            {file.flags.length ? (
              file.flags.map(f => <FlagCard key={f.id} flag={f} medList={file.medList} />)
            ) : (
              <p className="rounded-2xl border border-clear-line bg-clear-wash p-4 text-sm text-clear">Nothing cited.</p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-medium text-ink-muted">Medicines</h2>
            <ul className="mt-2">
              {file.medList.map(m => <MedicineRow key={m.id} item={m} />)}
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-ink-muted">Ask her this</h2>
            {file.questions.map(q => <QuestionCard key={q.id} q={q} />)}
          </div>

          <div className="rounded-2xl border border-line p-4 text-sm">
            <h2 className="font-medium">What the table still owes</h2>
            <p className="mt-2 text-ink-muted">Owed</p>
            {insights.owed.length ? (
              <ul className="mt-1 list-disc pl-5">{insights.owed.map(o => <li key={o}>{o}</li>)}</ul>
            ) : (
              <p>Nothing extra.</p>
            )}
            <p className="mt-3 text-ink-muted">Uncovered</p>
            {insights.uncovered.length ? (
              <ul className="mt-1 list-disc pl-5">{insights.uncovered.map(o => <li key={o}>{o}</li>)}</ul>
            ) : (
              <p>All owed questions have been asked.</p>
            )}
            {insights.rejectedTerms.length ? (
              <p className="mt-3">Rejected terms: {insights.rejectedTerms.join(", ")}</p>
            ) : null}
            {insights.provider ? (
              <p className="mt-3 text-xs text-ink-muted">
                {insights.provider === "canned" ? "Showing the canned file until you re-run." : `Last run: ${insights.provider}`}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {recording ? (
        <section className="mx-auto max-w-6xl px-6 pb-8">
          <h2 className="text-sm font-medium text-ink-muted">Recording {recording.n}</h2>
          <div className="mt-2 grid gap-4 lg:grid-cols-2">
            <p className="urdu rounded-2xl bg-surface-sunken p-4 text-web-ur">{recording.urdu}</p>
            <p className="rounded-2xl border border-line p-4 text-sm text-ink-muted">{recording.english}</p>
          </div>
        </section>
      ) : null}

      <footer className="sticky bottom-0 border-t border-line bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runStructure}
            disabled={busy || !recording}
            className="h-12 rounded-lg bg-ink px-5 text-white disabled:opacity-50"
          >
            {busy ? "Structuring with Grok…" : "Run structure on Recording 1 (Grok)"}
          </button>
          <Link href={`/file/${file.id}`} className="h-12 rounded-lg border border-line px-5 leading-[48px]">
            The file
          </Link>
          <Link href="/" className="text-sm text-ink-muted underline">
            Screens
          </Link>
          {error ? <p className="text-sm text-flag">{error}</p> : null}
        </div>
      </footer>
    </main>
  );
}

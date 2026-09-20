"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BubbleMap } from "@/components/bubble-map";
import { ModelSlider } from "@/components/model-slider";
import { ResultPanes } from "@/components/result-panes";
import { STRUCTURE_LANES, type StructureLane } from "@/lib/structure-lanes";
import { FlagCard, FlagPill, MedicineRow, QuestionCard } from "@/components/file-bits";
import type { PatientFile } from "@/lib/types";

export type InsightsPayload = {
  flags: number;
  owed: string[];
  uncovered: string[];
  rejectedTerms: string[];
  provider?: string;
  model?: string;
  ms?: number;
};

export const NASREEN = {
  label: "Nasreen · fever + karela",
  english:
    "Fever for three days with body aches. I came for Panadol and Ciproxin — Ciproxin helped a neighbour last time. For six years I have taken one white sugar tablet every morning. I drink a glass of bitter gourd juice every morning. The hakeem gave me a powder for weakness, I take it at night, two months now. I get dizzy on standing in the morning — it must be my age. Sugar not checked in six months.",
  urdu:
    "تین دن سے بخار ہے اور جسم میں درد ہے۔ پیناڈول اور سیپروکسن لینے آئی ہوں، پچھلی بار پڑوسن کو سیپروکسن سے آرام آیا تھا۔ چھ سال سے روز صبح شوگر کی ایک سفید گولی لیتی ہوں۔ روز صبح ایک گلاس کریلے کا جوس پیتی ہوں۔ حکیم صاحب نے کمزوری کے لیے ایک سفوف دیا ہے، رات کو لیتی ہوں، دو مہینے ہو گئے۔ صبح اٹھتے وقت چکر آتا ہے، عمر کی وجہ سے ہوگا۔ شوگر چھ مہینے سے چیک نہیں کروائی۔",
};

const WARFARIN = {
  label: "Warfarin · St John's wort",
  english:
    "I came for a St John's wort tea the hakeem recommended for low mood. Every evening I take warfarin for my heart. Sometimes I also take aspirin when my knee hurts.",
  urdu: "",
};

function wordsOf(text: string) {
  return text
    .split(/[\s\u060C\u06D4.،۔,]+/)
    .filter(Boolean)
    .map((t, i) => ({
      text: t,
      start: +(8 + i * 0.6).toFixed(1),
      end: +(8.4 + i * 0.6).toFixed(1),
    }));
}

export function ScenarioWorkbench({
  fileId = "MW-1042",
  initialFile,
  initialInsights,
  heading = "Paste a mock account",
}: {
  fileId?: string;
  initialFile?: PatientFile | null;
  initialInsights?: InsightsPayload;
  heading?: string;
}) {
  const [english, setEnglish] = useState(initialFile?.recordings[0]?.english ?? NASREEN.english);
  const [urdu, setUrdu] = useState(initialFile?.recordings[0]?.urdu ?? NASREEN.urdu);
  const [file, setFile] = useState<PatientFile | null>(initialFile ?? null);
  const [insights, setInsights] = useState<InsightsPayload | null>(initialInsights ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lane, setLane] = useState<StructureLane>("grok");
  const [times, setTimes] = useState<Partial<Record<StructureLane, number>>>({});
  const resultsRef = useRef<HTMLDivElement>(null);
  const hold = Boolean(file && file.flags.length > 0 && file.status !== "signed");
  const selected = STRUCTURE_LANES.find(l => l.id === lane) ?? STRUCTURE_LANES[1];

  async function analyze(event?: { preventDefault(): void }) {
    event?.preventDefault();
    const en = english.trim();
    const ur = urdu.trim();
    if (!en && !ur) {
      setError("Paste what she said — English, Urdu, or both.");
      return;
    }
    setBusy(true);
    setError(null);
    const spoken = ur || en;
    const translated = en || ur;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 55_000);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          fileId,
          provider: lane,
          fresh: true,
          transcript: {
            n: 1,
            seconds: Math.max(30, Math.round(spoken.split(/\s+/).length * 0.6)),
            urdu: spoken,
            english: translated,
            words: wordsOf(spoken),
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
      const elapsed = Math.round(data.insights?.ms ?? (performance.now() - t0));
      setTimes(prev => ({ ...prev, [lane]: elapsed }));
      setFile(data.file);
      setInsights(data.insights);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg === "The operation was aborted." || msg.includes("aborted")
        ? `${selected.label} took too long. Try again.`
        : msg);
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }

  return (
    <div>
      <section className="rounded-3xl border border-line bg-surface-raised p-5">
        <h2 className="text-lg font-medium">{heading}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Slide between xAI, Grok and Gemini Flash. Same transcript, same table — compare wall-clock time.
        </p>
        <form onSubmit={analyze}>
        <ModelSlider value={lane} onChange={setLane} times={times} disabled={busy} />
        <div className="mt-3 flex flex-wrap gap-2">
          {[NASREEN, WARFARIN].map(p => (
            <button
              key={p.label}
              type="button"
              className="h-11 rounded-lg border border-line px-4 text-sm"
              onClick={() => { setEnglish(p.english); setUrdu(p.urdu); setError(null); }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-xs text-ink-muted" htmlFor="scenario-en">English (or mixed)</label>
        <textarea
          id="scenario-en"
          value={english}
          onChange={e => setEnglish(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-2xl border border-line bg-surface p-3 text-sm"
          placeholder="Fever for three days. I came for Panadol and Ciproxin…"
        />
        <label className="mt-3 block text-xs text-ink-muted" htmlFor="scenario-ur">Urdu (optional — her words)</label>
        <textarea
          id="scenario-ur"
          value={urdu}
          onChange={e => setUrdu(e.target.value)}
          rows={4}
          dir={urdu ? "rtl" : "ltr"}
          className={`mt-1 w-full rounded-2xl border border-line bg-surface p-3 ${urdu ? "urdu text-web-ur" : "text-sm"}`}
          placeholder="پیناڈول اور سیپروکسن لینے آئی ہوں…"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-lg bg-ink px-5 text-white disabled:opacity-50"
          >
            {busy ? `${selected.label} is reading the table…` : `Analyze with ${selected.label}`}
          </button>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {busy ? `Timing ${selected.model}. Stay on this page.` : null}
          </p>
          {error ? <p className="text-sm text-flag">{error}</p> : null}
        </div>
        </form>
      </section>

      {file ? (
        <div className="mt-8" ref={resultsRef}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-medium">What the table says</h2>
            <FlagPill flags={file.flags} />
            {insights?.provider && insights.provider !== "canned" ? (
              <p className="text-xs text-ink-muted">
                Last run: {insights.model ?? insights.provider}
                {insights.ms != null ? ` · ${(insights.ms / 1000).toFixed(1)}s` : ""}
              </p>
            ) : null}
          </div>
          {hold ? (
            <p className="mt-3 rounded-2xl border border-flag-line bg-flag-wash px-4 py-3 text-sm">
              Hold the sale. Nothing is sold before the pharmacist signs.
            </p>
          ) : null}

          <div className="mt-6">
            <ResultPanes
              detail={
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-ink-muted">Flags</h3>
                    {file.flags.length ? (
                      file.flags.map(f => <FlagCard key={f.id} flag={f} medList={file.medList} />)
                    ) : (
                      <p className="rounded-2xl border border-clear-line bg-clear-wash p-4 text-sm text-clear">
                        Nothing cited. Ask-only pairs stay questions.
                      </p>
                    )}
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-ink-muted">Medicines</h3>
                      <ul className="mt-2">
                        {file.medList.map(m => <MedicineRow key={m.id} item={m} />)}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-ink-muted">Ask her this</h3>
                      {file.questions.map(q => <QuestionCard key={q.id} q={q} />)}
                    </div>
                    {insights ? (
                      <div className="rounded-2xl border border-line p-4 text-sm">
                        <h3 className="font-medium">What the table still owes</h3>
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
                      </div>
                    ) : null}
                    <p>
                      <Link href={`/file/${file.id}/findings`} className="text-sm underline">
                        Open as W2 Findings
                      </Link>
                    </p>
                  </div>
                </div>
              }
              map={
                <div className="min-h-[min(72vh,620px)] rounded-3xl border border-line bg-surface-raised p-4">
                  <BubbleMap medList={file.medList} flags={file.flags} />
                </div>
              }
            />
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <BubbleMap medList={[]} flags={[]} />
        </div>
      )}
    </div>
  );
}

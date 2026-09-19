"use client";

import { useId, useRef, useState } from "react";
import { ReportBubbleMap } from "./report-bubble-map";
import type { VisitDraft } from "@/lib/visit-draft";

const roleLabel = {
  requested: "Requested",
  takes: "Currently takes",
  remedy: "Home or herbal remedy",
} as const;

export function VisitReportView({ draft }: { draft: VisitDraft }) {
  const [view, setView] = useState<"details" | "map">("details");
  const id = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const pointerStart = useRef<number | null>(null);
  const dragged = useRef(false);
  const report = draft.report;
  if (!report) return null;

  return (
    <section className="visit-report-shell" aria-label="English visit report">
      <div className="result-view-toolbar">
        <div className="result-view-switch" role="tablist" aria-label="Report view" data-view={view}
          onPointerDown={event => { pointerStart.current = event.clientX; dragged.current = false; }}
          onPointerMove={event => {
            if (pointerStart.current !== null && Math.abs(event.clientX - pointerStart.current) > 24) event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={event => {
            if (pointerStart.current !== null && Math.abs(event.clientX - pointerStart.current) > 24) {
              dragged.current = true;
              const next = event.clientX > pointerStart.current ? 1 : 0;
              setView(next ? "map" : "details");
              tabs.current[next]?.focus();
            }
            pointerStart.current = null;
          }}
          onPointerCancel={() => { pointerStart.current = null; }}>
          <span className="result-view-thumb" aria-hidden="true" />
          {(["details", "map"] as const).map((tab, index) => (
            <button key={tab} ref={element => { tabs.current[index] = element; }} type="button" role="tab"
              id={`${id}-${tab}-tab`} aria-controls={`${id}-${tab}-panel`} aria-selected={view === tab} tabIndex={view === tab ? 0 : -1}
              onClick={() => { if (!dragged.current) setView(tab); dragged.current = false; }} onKeyDown={event => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : index === 0 ? 1 : 0;
                setView(next ? "map" : "details"); tabs.current[next]?.focus();
              }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                {tab === "details" ? <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 8h6M9 12h6M9 16h3" /></> : <><path d="m7 8 9 2M7 9l4 8m5-5-3 5" /><circle cx="5" cy="6" r="3" /><circle cx="18" cy="10" r="3" /><circle cx="12" cy="19" r="3" /></>}
              </svg>
              {tab === "details" ? "Details" : "Map"}
            </button>
          ))}
        </div>
        <span className="small muted result-draft-note">AI draft · not reviewed</span>
      </div>
      <div id={`${id}-details-panel`} role="tabpanel" aria-labelledby={`${id}-details-tab`} hidden={view !== "details"} tabIndex={0} className="result-details-panel result-panel">
      <div className="report-toolbar visit-report-toolbar">
        <span className="small muted">English visit report</span>
        <button className="button secondary" onClick={() => window.print()}>
          Print / save PDF
        </button>
      </div>
      <article className="report-sheet visit-report-sheet">
        <header className="report-heading">
          <span className="brand">Mashwara</span>
          <strong className="report-draft-label">
            AI draft · not sent · not pharmacist-reviewed
          </strong>
        </header>
        <h1>English visit report</h1>
        <dl className="visit-report-patient">
          <div><dt>Patient</dt><dd>{draft.patient.name}</dd></div>
          <div><dt>Age</dt><dd>{draft.patient.age}</dd></div>
          <div><dt>Sex</dt><dd>{draft.patient.sex}</dd></div>
        </dl>

        <section className="section">
          <h2>English patient account</h2>
          <p>{report.english.account}</p>
          <p className="small muted">{report.english.summary}</p>
        </section>

        <section className="section">
          <h2>Medicines and remedies mentioned</h2>
          {report.medList.length ? (
            <div className="visit-report-list">
              {report.medList.map((item) => (
                <div className={`visit-report-item ${item.term === "unidentified" ? "unidentified" : ""}`} key={item.id}>
                  <h3>{item.term === "unidentified" ? "Unidentified" : item.name}</h3>
                  <p className="small">{roleLabel[item.role]}</p>
                  <p className="urdu" lang="ur" dir="rtl">{item.herWords}</p>
                  <details className="visit-report-evidence">
                    <summary>Source excerpt</summary>
                    <p className="urdu small muted" lang="ur" dir="rtl">
                      Source: {item.source.excerpt}
                    </p>
                  </details>
                </div>
              ))}
            </div>
          ) : (
            <p>No medicines or remedies were identified in this account.</p>
          )}
        </section>

        <section className="section">
          <h2>Draft questions</h2>
          {report.questions.length ? report.questions.map((question) => (
            <div className="question-result" key={question.id}>
              <h3>{question.text.english}</h3>
              <p>{question.why}</p>
              <p className="small muted">Unresolved</p>
              <details className="visit-report-evidence">
                <summary>Urdu evidence</summary>
                <p className="urdu" lang="ur" dir="rtl">{question.text.urdu}</p>
                <p className="urdu small muted" lang="ur" dir="rtl">
                  Source: {question.source.excerpt}
                </p>
              </details>
            </div>
          )) : <p>No draft clarification questions were generated.</p>}
        </section>

        <section className="section">
          <h2>Sourced table flags</h2>
          {report.flags.length ? report.flags.map((flag) => {
            const a = report.medList.find((item) => item.id === flag.a);
            const b = report.medList.find((item) => item.id === flag.b);
            return (
              <div className={`flag-card ${flag.severity === "moderate" ? "moderate" : ""}`} key={flag.id}>
                <strong>
                  {flag.severity === "high" ? "High" : "Moderate"}: {a?.name ?? "Unidentified"} + {b?.name ?? "Unidentified"}
                </strong>
                <p>{flag.reason}</p>
                <p className="small">
                  Source: <a href={flag.citation} target="_blank" rel="noreferrer">{flag.citation}</a>
                </p>
              </div>
            );
          }) : (
            <p>No matches in the limited sourced table. This does not establish safety.</p>
          )}
        </section>

        <details className="visit-report-source">
          <summary>Source Urdu</summary>
          <h3>Reviewed Urdu used for this draft</h3>
          <p className="urdu" lang="ur" dir="rtl">{report.reviewedUrdu}</p>
          <h3>Original Scribe transcription</h3>
          <p className="urdu" lang="ur" dir="rtl">{report.rawUrdu}</p>
        </details>

        <footer className="report-signature">
          <strong>AI draft · not sent · not pharmacist-reviewed</strong>
        </footer>
      </article>
      </div>
      <div id={`${id}-map-panel`} role="tabpanel" aria-labelledby={`${id}-map-tab`} hidden={view !== "map"} tabIndex={0} className="result-map-panel result-panel">
        {view === "map" && <ReportBubbleMap key={`${draft.id}-${report.generatedAt}`} report={report} />}
      </div>
    </section>
  );
}

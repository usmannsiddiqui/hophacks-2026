"use client";

import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { outreachAreaNames } from "@/lib/outreach/location";
import { useId, useRef, useState, type ReactNode } from "react";
import { ReportBubbleMap } from "./report-bubble-map";
import type { VisitDraft } from "@/lib/visit-draft";
import { itemLabel, itemDetail } from "@/lib/display";
import { ReportFlag } from "./report-flag";

const roleLabel = {
  requested: "Requested",
  takes: "Currently takes",
  remedy: "Home or herbal remedy",
} as const;

// questionPanel replaces the static question list on screen (ask + record answers).
// The static list still prints so the paper report carries the questions.
export function VisitReportView({
  draft,
  questionPanel,
  decisionPanel,
}: {
  draft: VisitDraft;
  questionPanel?: ReactNode;
  decisionPanel?: ReactNode;
}) {
  const [view, setView] = useState<"details" | "map">("details");
  const id = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const report = draft.report;
  if (!report) return null;

  return (
    <section className="visit-report-shell" aria-label="English visit report">
      <div className="report-view-tabs" role="tablist" aria-label="Report view">
        {(["details", "map"] as const).map((tab, index) => (
          <LiquidButton key={tab} ref={element => { tabs.current[index] = element; }}
            type="button" role="tab" id={`${id}-${tab}-tab`}
            aria-controls={`${id}-${tab}-panel`} aria-selected={view === tab}
            tabIndex={view === tab ? 0 : -1} className={view === tab ? "button" : "button secondary"}
            onClick={() => setView(tab)} onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
              setView(next ? "map" : "details");
              tabs.current[next]?.focus();
            }}>
            {tab === "details" ? "Details" : "Map"}
          </LiquidButton>
        ))}
      </div>
      <div className="report-details-panel" role="tabpanel" id={`${id}-details-panel`}
        aria-labelledby={`${id}-details-tab`} hidden={view !== "details"} tabIndex={0}>
      <div className="report-toolbar visit-report-toolbar">
        <span className="small muted">Your visit report</span>
        <LiquidButton className="button secondary" onClick={() => window.print()}>
          Print / save PDF
        </LiquidButton>
      </div>
      <article className="report-sheet visit-report-sheet">
        <header className="report-heading">
          <span className="brand">Mashwara</span>
        </header>
        <h1>English visit report</h1>
        {draft.outreachAreaId && <p className="small muted">{outreachAreaNames[draft.outreachAreaId]}</p>}
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
          <h2>Medicines &amp; remedies</h2>
          {report.medList.length ? (
            <ol className="visit-report-list">
              {report.medList.map((item) => (
                <li className={`visit-report-item ${item.term === "unidentified" ? "unidentified" : ""}`} key={item.id}>
                  <div className="visit-medicine-description">
                  <h3>{itemLabel(item)}</h3>
                  {itemDetail(item) && <p className="small">{itemDetail(item)}</p>}
                  <p className="visit-medicine-role">{roleLabel[item.role]}</p>
                  </div>
                  <div className="visit-medicine-account">
                  <p className="urdu" lang="ur" dir="rtl">{item.herWords}</p>
                  <details className="visit-report-evidence">
                    <summary>In the original account</summary>
                    <p className="urdu small muted" lang="ur" dir="rtl">
                      Source: {item.source.excerpt}
                    </p>
                  </details>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p>No medicines or remedies were identified in this account.</p>
          )}
        </section>

        <section className="section">
          <h2>Draft questions</h2>
          {questionPanel ? <div className="screen-only">{questionPanel}</div> : null}
          <div className={questionPanel ? "print-only" : undefined}>
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
          </div>
        </section>

        <section className="section">
          <h2>Points to review</h2>
          {report.flags.length ? report.flags.map((flag) => {
            const a = report.medList.find((item) => item.id === flag.a);
            const b = report.medList.find((item) => item.id === flag.b);
            return (
              <ReportFlag key={flag.id} severity={flag.severity}
                medicines={<>{a ? itemLabel(a) : "Unidentified"} + {b ? itemLabel(b) : "Unidentified"}</>}
                reason={flag.reason} citation={flag.citation} />
            );
          }) : (
            <p>No matches in the limited sourced table. This does not establish safety.</p>
          )}
        </section>

        <details className="visit-report-source">
          <summary>
            <span><span className="transcript-title">Patient’s words</span><span className="transcript-hint">View the Urdu transcript</span></span>
            <svg className="transcript-toggle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14"/><path className="transcript-toggle-vertical" d="M12 5v14"/></svg>
          </summary>
          <div className="transcript-content">
            <h3>Reviewed account</h3>
            <p className="small muted">The Urdu account used to prepare this report.</p>
            <p className="urdu" lang="ur" dir="rtl">{report.reviewedUrdu}</p>
            <h3>Original transcription</h3>
            <p className="small muted">The original speech-to-text record, before corrections.</p>
            <p className="urdu" lang="ur" dir="rtl">{report.rawUrdu}</p>
          </div>
        </details>

        {decisionPanel}
        <footer className="report-signature">
          <p>This report does not include pharmacist authorisation.</p>
        </footer>
      </article>
      </div>
      <div className="report-map-panel" role="tabpanel" id={`${id}-map-panel`}
        aria-labelledby={`${id}-map-tab`} hidden={view !== "map"} tabIndex={0}>
        {view === "map" && <ReportBubbleMap key={`${draft.id}-${report.generatedAt}`} report={{ ...report, medList: report.medList.map(item => ({ ...item, excerpt: item.source.excerpt })) }} />}
      </div>
    </section>
  );
}

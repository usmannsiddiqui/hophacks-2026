import type { ReactNode } from "react";
import type { VisitDraft } from "@/lib/visit-draft";

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
}: {
  draft: VisitDraft;
  questionPanel?: ReactNode;
}) {
  const report = draft.report;
  if (!report) return null;

  return (
    <section className="visit-report-shell" aria-label="English visit report">
      <div className="report-toolbar visit-report-toolbar">
        <span className="small muted">Draft preview</span>
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
    </section>
  );
}

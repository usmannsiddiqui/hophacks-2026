"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { fetchJson } from "./file-provider";
import { ReportBubbleMap } from "./report-bubble-map";
import { Button, Section } from "./primitives";
import {
  blankDecisions,
  outcomeFor,
  REVIEW_SCHEMA_VERSION,
  type ItemDecision,
  type VisitRecord,
} from "@/lib/review";
import type { VisitSummary } from "@/lib/visits";
import { sampleSubmission } from "@/lib/sample-visit";
import { itemLabel, itemDetail } from "@/lib/display";

const roleLabel = {
  requested: "Requested at the counter",
  takes: "Currently takes",
  remedy: "Home or herbal remedy",
} as const;

// ---------------------------------------------------------------- queue

export function VisitQueue() {
  const [rows, setRows] = useState<VisitSummary[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const list = await fetchJson<VisitSummary[]>("/api/visits");
        if (!active) return;
        setRows(list);
        setError("");
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoaded(true);
      }
    }
    void refresh();
    const timer = setInterval(refresh, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const [seeding, setSeeding] = useState(false);

  // Rehearsal affordance: puts Ghulam Fatima into the queue so the console can be shown
  // without running a live intake first.
  async function loadSample() {
    setSeeding(true);
    setError("");
    try {
      await fetchJson("/api/visits", { method: "POST", body: JSON.stringify(sampleSubmission()) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  const waiting = rows.filter((r) => r.status === "waiting");
  const reviewed = rows.filter((r) => r.status === "reviewed");

  return (
    <div className="app">
      <header className="topbar">
        <Link href="/visit/new" className="brand">
          Mashwara
        </Link>
        <span className="topbar-context">Pharmacist console</span>
        <Link className="text-link" href="/visit/new">
          Back to the counter →
        </Link>
      </header>
      <main className="queue-page">
        <div className="page-heading">
          <span className="eyebrow">Your expertise, where it is needed</span>
          <h1>A second pair of eyes.</h1>
          <p>Read her account. Decide what she may take. The counter is waiting.</p>
        </div>

        {error && (
          <p role="alert" className="error-box">
            Queue unavailable: {error}
          </p>
        )}

        <div className="queue-layout">
          <Section title="Waiting for review" detail={`${waiting.length} visits`}>
            {!loaded ? (
              <div className="skeleton" />
            ) : !waiting.length ? (
              <div className="empty-state">
                <h3>Nothing waiting.</h3>
                <p>Send a report from the counter to see it here.</p>
                <Button type="button" secondary disabled={seeding} onClick={loadSample}>
                  {seeding ? "Loading…" : "Load the sample case"}
                </Button>
              </div>
            ) : (
              waiting.map((v) => <VisitRow key={v.id} visit={v} />)
            )}
          </Section>

          <Section title="Answered" detail={`${reviewed.length} sent back`}>
            {reviewed.length ? (
              reviewed.map((v) => <VisitRow key={v.id} visit={v} />)
            ) : (
              <p className="muted">Decisions you send back will appear here.</p>
            )}
          </Section>
        </div>

        <p className="small muted">
          Refreshes every 3 seconds. Prototype console — there is no authenticated
          pharmacist identity, and a signed decision is a typed name, not a verified
          credential.
        </p>
      </main>
    </div>
  );
}

function VisitRow({ visit }: { visit: VisitSummary }) {
  return (
    <Link className="queue-row" href={`/pharmacist/visit/${visit.id}`}>
      <div className="row-between">
        <h3>{visit.patient.name}</h3>
        <span>
          {visit.status === "reviewed"
            ? visit.outcome === "authorised"
              ? "Authorised"
              : "Not authorised"
            : visit.flags > 0
              ? `${visit.flags} flags →`
              : "No table matches →"}
        </span>
      </div>
      <p>
        {visit.patient.age} / {visit.patient.sex}{" "}
        <span className="muted">
          {visit.medicines} medicines · {visit.questions} open questions
        </span>
      </p>
      <div className="row-between small muted">
        <span>{visit.id}</span>
        <span>{new Date(visit.createdAt).toLocaleTimeString()}</span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------- review

export function VisitReview({ id }: { id: string }) {
  const [visit, setVisit] = useState<VisitRecord | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    fetchJson<VisitRecord>(`/api/visits/${id}`)
      .then((v) => active && setVisit(v))
      .catch((e) => active && setLoadError((e as Error).message));
    return () => {
      active = false;
    };
  }, [id]);

  if (loadError) {
    return (
      <div className="app">
        <main className="queue-page">
          <div className="empty-state">
            <h1>That visit could not be opened.</h1>
            <p>{loadError}</p>
            <Link className="button secondary" href="/pharmacist/visit">
              Back to the queue
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!visit) return <div className="skeleton" />;
  return <VisitReviewForm visit={visit} onReviewed={setVisit} />;
}

function VisitReviewForm({
  visit,
  onReviewed,
}: {
  visit: VisitRecord;
  onReviewed: (v: VisitRecord) => void;
}) {
  const report = visit.report;
  const [items, setItems] = useState<ItemDecision[]>(() =>
    visit.review?.items ?? blankDecisions(report.medList.map((m) => m.id)),
  );
  const [note, setNote] = useState(visit.review?.note ?? "");
  const [urdu, setUrdu] = useState(visit.review?.urdu ?? "");
  const [by, setBy] = useState({
    name: visit.review?.by.name ?? "",
    qualification: visit.review?.by.qualification ?? "",
    registration: visit.review?.by.registration ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The overall yes/no follows the list: declining one medicine declines the visit.
  // Shown, not editable, so the answer and the reasons can never disagree.
  const outcome = useMemo(() => outcomeFor(items), [items]);
  const declined = items.filter((i) => i.decision === "declined");

  const setDecision = useCallback((medId: string, patch: Partial<ItemDecision>) => {
    setItems((current) =>
      current.map((i) => (i.medId === medId ? { ...i, ...patch } : i)),
    );
  }, []);

  const done = visit.status === "reviewed";

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const missing = declined.find((i) => !i.reason.trim());
    if (missing) {
      const med = report.medList.find((m) => m.id === missing.medId);
      setError(`Say why ${med?.name ?? missing.medId} is not authorised — the counter has to explain it to her.`);
      return;
    }

    setBusy(true);
    try {
      const updated = await fetchJson<VisitRecord>(`/api/visits/${visit.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          schemaVersion: REVIEW_SCHEMA_VERSION,
          outcome,
          items,
          note,
          urdu,
          by,
          at: new Date().toISOString(),
        }),
      });
      onReviewed(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link href="/pharmacist/visit" className="brand">
          Mashwara
        </Link>
        <span className="topbar-context">
          {visit.id} · {visit.patient.name}
        </span>
        <Link className="text-link" href="/pharmacist/visit">
          ← Queue
        </Link>
      </header>

      <main className="queue-page">
        <div className="page-heading">
          <span className="eyebrow">Pharmacist review / {visit.patient.name}</span>
          <h1>Read the whole story.</h1>
          <p>
            {visit.patient.age} / {visit.patient.sex} · {report.medList.length} medicines ·{" "}
            {report.flags.length} sourced flags
          </p>
        </div>

        {done && (
          <div className={`decision-banner ${visit.review?.outcome}`} role="status">
            <strong>
              {visit.review?.outcome === "authorised"
                ? "You authorised this visit."
                : "You did not authorise this visit."}
            </strong>
            <p>Sent back to the counter. A signed decision cannot be edited.</p>
          </div>
        )}

        <Section title="What needs attention" detail="Select a bubble or a connection to see the evidence">
          <ReportBubbleMap report={report} />
          {report.flags.length ? (
            report.flags.map((flag) => {
              const a = report.medList.find((m) => m.id === flag.a);
              const b = report.medList.find((m) => m.id === flag.b);
              return (
                <div className={`flag-card ${flag.severity === "moderate" ? "moderate" : ""}`} key={flag.id}>
                  <strong>
                    {flag.severity === "high" ? "High" : "Moderate"}: {a ? itemLabel(a) : "Unidentified"} +{" "}
                    {b ? itemLabel(b) : "Unidentified"}
                  </strong>
                  <p>{flag.reason}</p>
                  <p className="small">Source: {flag.citation}</p>
                </div>
              );
            })
          ) : (
            <p className="muted">
              No matches in the limited sourced table. That does not establish safety.
            </p>
          )}
        </Section>

        <Section title="Her account">
          <p className="history-copy">{report.english.account}</p>
          <p className="small muted">{report.english.summary}</p>
          <details className="original-account">
            <summary>Read the Urdu she actually spoke</summary>
            <p className="urdu" lang="ur" dir="rtl">
              {report.reviewedUrdu}
            </p>
          </details>
        </Section>

        {report.questions.length > 0 && (
          <Section title="Questions the draft raised" detail={`${report.questions.length} unresolved`}>
            {report.questions.map((q) => (
              <div className="question-result" key={q.id}>
                <h3>{q.text.english}</h3>
                <p className="ask-text">{q.why}</p>
              </div>
            ))}
          </Section>
        )}

        <form onSubmit={send} className="review-form">
          <Section
            title="Authorise each medicine"
            detail={outcome === "authorised" ? "All authorised" : `${declined.length} not authorised`}
          >
            <p className="small muted">
              Decline anything she should not take today. Declining one medicine means the
              visit comes back to the counter as <strong>not authorised</strong>.
            </p>

            {report.medList.map((med) => {
              const decision = items.find((i) => i.medId === med.id);
              if (!decision) return null;
              return (
                <fieldset className="verdict-field" key={med.id}>
                  <legend>{itemLabel(med)}</legend>
                  {itemDetail(med) && <p className="small">{itemDetail(med)}</p>}
                  <p className="small muted">{roleLabel[med.role]}</p>
                  <p className="urdu small" lang="ur" dir="rtl">
                    {med.herWords}
                  </p>

                  <div className="verdict-options">
                    {(["authorised", "declined"] as const).map((value) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name={`decision-${med.id}`}
                          value={value}
                          disabled={done}
                          checked={decision.decision === value}
                          onChange={() => setDecision(med.id, { decision: value })}
                        />
                        <span>{value === "authorised" ? "Authorise" : "Do not authorise"}</span>
                      </label>
                    ))}
                  </div>

                  {decision.decision === "declined" && (
                    <label>
                      Why not, in words the counter can repeat
                      <textarea
                        required
                        rows={2}
                        disabled={done}
                        value={decision.reason}
                        onChange={(e) => setDecision(med.id, { reason: e.target.value })}
                        placeholder="e.g. Not without a prescription and a current blood test."
                      />
                    </label>
                  )}
                </fieldset>
              );
            })}
          </Section>

          <Section title="Your answer to the counter">
            <label>
              Plain English for the volunteer
              <textarea
                required
                rows={5}
                disabled={done}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What should happen now, and what she should watch for."
              />
            </label>
            <label>
              Urdu for the patient (optional)
              <textarea
                rows={4}
                lang="ur"
                dir="rtl"
                className="urdu"
                disabled={done}
                value={urdu}
                onChange={(e) => setUrdu(e.target.value)}
              />
            </label>

            <label>
              Pharmacist name
              <input
                required
                disabled={done}
                value={by.name}
                onChange={(e) => setBy({ ...by, name: e.target.value })}
              />
            </label>
            <div className="form-pair">
              <label>
                Qualification
                <input
                  required
                  disabled={done}
                  value={by.qualification}
                  onChange={(e) => setBy({ ...by, qualification: e.target.value })}
                />
              </label>
              <label>
                Registration
                <input
                  required
                  disabled={done}
                  value={by.registration}
                  onChange={(e) => setBy({ ...by, registration: e.target.value })}
                />
              </label>
            </div>
          </Section>

          {error && (
            <p role="alert" className="error-box">
              {error}
            </p>
          )}

          {!done && (
            <Button type="submit" disabled={busy}>
              {busy
                ? "Sending…"
                : outcome === "authorised"
                  ? "Send back: authorised →"
                  : `Send back: not authorised (${declined.length}) →`}
            </Button>
          )}

          <p className="small muted">
            Prototype signature: the name you type, not a verified credential.
          </p>
        </form>
      </main>
    </div>
  );
}

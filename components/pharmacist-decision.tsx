"use client";

// The counter's half of the pharmacist loop: send the report for review, then wait for
// the yes/no and show it on the report itself.
//
// The draft never leaves this browser — only the report is sent (ADR 0004: the
// pharmacist is remote and asynchronous). The id of the sent copy is remembered here so
// a reload, or closing the laptop while she waits, does not lose the answer.

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "./file-provider";
import { Button } from "./primitives";
import { decisionSummary, type VisitRecord } from "@/lib/review";
import type { VisitDraft } from "@/lib/visit-draft";

const sentKey = (draftId: string) => `mashwara-sent-visit-${draftId}`;

function readSentId(draftId: string): string | null {
  try {
    return localStorage.getItem(sentKey(draftId));
  } catch {
    return null;
  }
}

export function PharmacistDecision({ draft }: { draft: VisitDraft }) {
  // Read once, during the initial render. The call site keys this component by draft.id,
  // so a different visit remounts it rather than being reset through an effect.
  // readSentId swallows the ReferenceError on the server, where there is no localStorage.
  const [visitId, setVisitId] = useState<string | null>(() => readSentId(draft.id));
  const [visit, setVisit] = useState<VisitRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll until an answer comes back, then stop. Nothing here writes to the draft, so a
  // decision can never overwrite her account.
  useEffect(() => {
    if (!visitId) return;
    let active = true;

    async function check() {
      try {
        const v = await fetchJson<VisitRecord>(`/api/visits/${visitId}`);
        if (!active) return;
        setVisit(v);
        setError("");
        if (v.status === "reviewed" && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }

    void check();
    timer.current = setInterval(check, 3000);
    return () => {
      active = false;
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [visitId]);

  const send = useCallback(async () => {
    if (!draft.report) return;
    setBusy(true);
    setError("");
    try {
      const created = await fetchJson<VisitRecord>("/api/visits", {
        method: "POST",
        body: JSON.stringify({ patient: draft.patient, report: draft.report }),
      });
      try {
        localStorage.setItem(sentKey(draft.id), created.id);
      } catch {
        /* The id is still in state; only a reload would lose it. */
      }
      setVisitId(created.id);
      setVisit(created);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [draft]);

  if (!draft.report) return null;

  // Not sent yet.
  if (!visitId) {
    return (
      <section className="pharmacist-decision screen-only" aria-label="Pharmacist review">
        <p className="small muted">
          This is an AI draft. A pharmacist has not seen it. Send it for review and the
          answer appears here.
        </p>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <Button type="button" onClick={send} disabled={busy}>
          {busy ? "Sending…" : "Send to a pharmacist →"}
        </Button>
      </section>
    );
  }

  const review = visit?.review;

  return (
    <section className="pharmacist-decision screen-only" aria-label="Pharmacist review">
      {error && (
        <p role="alert" className="error-box">
          Could not reach the pharmacist queue: {error}
        </p>
      )}

      {!review ? (
        <div className="decision-banner waiting" role="status" aria-live="polite">
          <strong>Waiting for a pharmacist.</strong>
          <p>
            Sent as {visitId}. She can wait or come back — the answer appears here when it
            arrives.
          </p>
        </div>
      ) : (
        <div className={`decision-banner ${review.outcome}`} role="status" aria-live="polite">
          <strong>
            {review.outcome === "authorised"
              ? "Authorised by the pharmacist."
              : "Not authorised."}
          </strong>
          <p>{decisionSummary(review)}</p>
          <p>{review.note}</p>

          {review.items.some((i) => i.decision === "declined") && (
            <ul className="decision-items">
              {review.items
                .filter((i) => i.decision === "declined")
                .map((item) => {
                  const med = draft.report?.medList.find((m) => m.id === item.medId);
                  return (
                    <li key={item.medId}>
                      <strong>{med?.name ?? item.medId}</strong> — {item.reason}
                    </li>
                  );
                })}
            </ul>
          )}

          {review.urdu.trim() && (
            <p className="urdu" lang="ur" dir="rtl">
              {review.urdu}
            </p>
          )}

          <p className="small muted">
            {review.by.name}, {review.by.qualification} · {review.by.registration} ·{" "}
            {new Date(review.at).toLocaleString()}
          </p>
        </div>
      )}
    </section>
  );
}

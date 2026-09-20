"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { demoFiles } from "@/lib/demo";
import { answerText, cleanCopy, medicineName } from "@/lib/display";
import type { Advice, PatientFile } from "@/lib/types";
import { AppShell } from "./app-shell";
import { fetchJson, useFile } from "./file-provider";
import {
  Button,
  FileHeader,
  FlagCard,
  MedicineRow,
  Section,
} from "./primitives";
import { ReportBubbleMap } from "./report-bubble-map";
import { fileToBubbleSource } from "@/lib/map-source";

type Summary = Pick<
  PatientFile,
  "id" | "patient" | "place" | "status" | "createdAt"
> & { flags: number; questionsOpen: number };
export function PharmacistQueue() {
  const [files, setFiles] = useState<Summary[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const samples = demoFiles().map((f) => ({
          ...f,
          flags: f.flags.length,
          questionsOpen: f.questions.filter((q) => !q.answeredIn).length,
        }));
        const visibleSamples = samples.filter(
          (f) => f.status === "sent" || f.status === "signed",
        );
        if (active) {
          setFiles((current) => [
            ...visibleSamples,
            ...current.filter((f) => !f.id.startsWith("DEMO-")),
          ]);
          setLoaded(true);
        }
        const live = await fetchJson<Summary[]>("/api/files");
        if (active) {
          setFiles(
            [...samples, ...live]
              .filter((f) => f.status === "sent" || f.status === "signed")
              .sort(
                (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
              ),
          );
          setError("");
          setLoaded(true);
        }
      } catch (e) {
        if (active) {
          setError(
            `Live queue unavailable: ${(e as Error).message} Sample files remain available below.`,
          );
          setLoaded(true);
        }
      }
    }
    void refresh();
    const timer = setInterval(refresh, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const waiting = files.filter((f) => f.status === "sent");
  return (
    <div className="app">
      <header className="topbar">
        <Link href="/file/new" className="brand">
          Mashwara
        </Link>
        <span className="topbar-context">Pharmacist console</span>
        <Link className="text-link" href="/file/new">
          Back to the counter →
        </Link>
      </header>
      <main className="queue-page">
        <div className="page-heading">
          <span className="eyebrow">Your expertise, where it is needed</span>
          <h1>A second pair of eyes.</h1>
          <p>
            Read her account. Resolve what you can. Leave a plan she can
            understand.
          </p>
        </div>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <div className="queue-layout">
          <Section
            title="Waiting for review"
            detail={`${waiting.length} files`}
          >
            {!loaded ? (
              <div className="skeleton" />
            ) : !waiting.length ? (
              <div className="empty-state">
                <h3>No files waiting.</h3>
                <p>Send a case from findings to see it here.</p>
                <Link className="button secondary" href="/file/new">
                  Start a sample case
                </Link>
              </div>
            ) : (
              waiting.map((f) => <QueueRow key={f.id} file={f} />)
            )}
          </Section>
          <Section
            title="Signed files"
            detail={`${files.length - waiting.length} completed`}
          >
            {files
              .filter((f) => f.status === "signed")
              .map((f) => (
                <QueueRow key={f.id} file={f} />
              ))}
            {files.length === waiting.length && (
              <p className="muted">Signed reports will appear here.</p>
            )}
          </Section>
        </div>
        <p className="small muted">
          Refreshes every 3 seconds. Sample files stay in this browser. The
          console is a hackathon prototype with no authenticated pharmacist
          identity.
        </p>
      </main>
    </div>
  );
}
function QueueRow({ file }: { file: Summary }) {
  return (
    <Link className="queue-row" href={`/pharmacist/${file.id}`}>
      <div className="row-between">
        <h3>{file.patient.name}</h3>
        <span>
          {file.flags > 0 ? `${file.flags} flags` : "No table matches"} →
        </span>
      </div>
      <p>
        {file.patient.age} / {file.patient.sex}{" "}
        <span className="muted">at {file.place.shop}</span>
      </p>
      <div className="row-between small muted">
        <span>{file.questionsOpen} open questions</span>
        <span>
          {file.id.startsWith("DEMO-")
            ? "Sample walkthrough"
            : file.id === "MW-1042"
              ? "Reference fixture"
              : "Patient file"}
        </span>
      </div>
    </Link>
  );
}

export function PharmacistReview() {
  const { file, demo, update, busy } = useFile();
  const draftKey = `mashwara-review-draft-${file.id}`;
  const [draft, setDraft] = useState(() => {
    const initial = {
      english: file.advice?.english ?? "",
      urdu: file.advice?.urdu ?? "",
      impression: file.impression ?? "",
      verdicts: file.advice?.verdicts ?? ({} as Advice["verdicts"]),
      reviewer: demo ? "Sana Qureshi (sample)" : "",
      qualification: demo ? "Pharm-D" : "",
      registration: demo ? "SAMPLE-ONLY" : "",
    };
    try {
      const stored = sessionStorage.getItem(draftKey);
      return file.status !== "signed" && stored
        ? ({ ...initial, ...JSON.parse(stored) } as typeof initial)
        : initial;
    } catch {
      return initial;
    }
  });
  const latestDraft = useRef(draft);
  const [draftError, setDraftError] = useState("");
  function editDraft(patch: Partial<typeof draft>) {
    const next = { ...latestDraft.current, ...patch };
    latestDraft.current = next;
    setDraft(next);
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(next));
      setDraftError("");
    } catch {
      setDraftError(
        "Draft storage is unavailable. Keep this page open until you sign.",
      );
    }
  }
  const { english, urdu, impression, verdicts } = draft;
  const setEnglish = (english: string) => editDraft({ english });
  const setUrdu = (urdu: string) => editDraft({ urdu });
  const setImpression = (impression: string) => editDraft({ impression });
  const setVerdicts = (verdicts: Advice["verdicts"]) => editDraft({ verdicts });
  const [confirmed, setConfirmed] = useState(false);
  const [localError, setLocalError] = useState("");
  const router = useRouter();
  const open = file.questions.filter((q) => !q.answeredIn);
  function fillSample() {
    setEnglish(
      "Sample review: do not start the requested antibiotic without a prescription. Discuss the bitter gourd juice and unidentified powder with a clinician. Arrange an in-person review of the dizziness, fever, and current medicines.",
    );
    setUrdu(
      "نمونہ مشورہ: نسخے کے بغیر اینٹی بائیوٹک شروع نہ کریں۔ کریلے کے جوس اور نامعلوم سفوف کے بارے میں ڈاکٹر سے بات کریں۔ چکر، بخار اور موجودہ دواؤں کے لیے ڈاکٹر سے معائنہ کروائیں۔",
    );
    setImpression(
      "Sample review only. The cause of dizziness is unconfirmed. An in-person assessment and clarification of the medication history are needed.",
    );
    setVerdicts(
      Object.fromEntries(
        file.medList.map((m) => [
          m.id,
          ["ciprofloxacin", "bitter_gourd", "unidentified"].includes(m.term)
            ? "stop"
            : "keep",
        ]),
      ),
    );
  }
  async function sign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError("");
    const form = new FormData(event.currentTarget);
    if (!confirmed || file.medList.some((m) => !verdicts[m.id])) {
      setLocalError("Decide on every medicine and confirm before signing.");
      return;
    }
    // Prose is optional for a clean approval, but not when something is being taken
    // away: the counter has to be able to tell her why.
    const changed = file.medList.filter((m) => verdicts[m.id] !== "keep");
    if (changed.length && !english.trim()) {
      setLocalError(
        `You are stopping or swapping ${changed.length === 1 ? "one medicine" : `${changed.length} medicines`}. Write a line of English the counter can repeat to her.`,
      );
      return;
    }
    const name = String(form.get("reviewer")).trim(),
      qualification = String(form.get("qualification")).trim(),
      registration = String(form.get("registration")).trim();
    const at = new Date().toISOString();
    try {
      await update({
        impression,
        advice: { english, urdu, verdicts, by: name, at },
        reviewedBy: { name, qualification, registration, at },
        status: "signed",
      });
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Signed file is already persisted. */
      }
      router.push(`/file/${file.id}/advice`);
    } catch {}
  }
  if (file.status === "signed")
    return (
      <AppShell title="Signed review">
        <div className="page-heading">
          <span className="eyebrow">Review complete</span>
          <h1>A plan to take home.</h1>
          <p>
            Signed by {file.reviewedBy?.name}, {file.reviewedBy?.qualification}.
          </p>
        </div>
        <FileHeader file={file} />
        <Section title="Advice">
          <p>{file.advice?.english}</p>
          <p className="urdu phone-urdu" lang="ur" dir="rtl">
            {file.advice?.urdu}
          </p>
        </Section>
        <div className="actions">
          <Link className="button" href={`/file/${file.id}/advice`}>
            Open advice at the counter →
          </Link>
          <Link className="button secondary" href={`/file/${file.id}/report`}>
            Open signed report
          </Link>
        </div>
      </AppShell>
    );
  if (file.status !== "sent")
    return (
      <AppShell title="Pharmacist review">
        <div className="empty-state">
          <h1>This file has not been sent.</h1>
          <p>
            Review the findings at the counter, then send the file to a
            pharmacist.
          </p>
          <Link className="button" href={`/file/${file.id}/findings`}>
            Go to findings →
          </Link>
        </div>
      </AppShell>
    );
  return (
    <AppShell
      title="Pharmacist review"
      aside={
        <form onSubmit={sign} className="review-form">
          <Section title="Your advice" detail="English + Urdu">
            <p className="small muted">
              Both are optional. If the file is fine as it stands, decide on each
              medicine and sign — you do not have to write anything. Urdu is what the
              patient will hear, so leave it blank rather than writing English there.
            </p>
            <p className="small muted">
              Anything you stop or swap does need a line of English: the counter has to
              repeat it to her, and a swap has to name the replacement.
            </p>
            <p className="small muted">
              Unsigned edits are saved in this browser tab. Review and confirm
              again before signing.
            </p>
            {draftError && (
              <p role="alert" className="error-box">
                {draftError}
              </p>
            )}
            {demo && (
              <Button type="button" secondary onClick={fillSample}>
                Fill sample review for rehearsal
              </Button>
            )}
            <label>
              Clinical impression
              <textarea
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
                placeholder="Your assessment and remaining uncertainty"
              />
            </label>
            <label>
              Advice in English
              <textarea
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                rows={5}
              />
            </label>
            <label>
              Reviewed Urdu advice
              <textarea
                lang="ur"
                dir="rtl"
                className="urdu"
                value={urdu}
                onChange={(e) => setUrdu(e.target.value)}
                rows={5}
              />
            </label>
          </Section>
          <Section title="Decision for each item">
            {file.medList.map((m) => (
              <fieldset className="verdict-field" key={m.id}>
                <legend>{medicineName(m.term)}</legend>
                {m.herWords ? (
                  <p className="urdu small" lang="ur" dir="rtl">
                    {m.herWords}
                  </p>
                ) : (
                  <p className="small ask-text">
                    Document only; not mentioned by the patient.
                  </p>
                )}
                <div className="verdict-options">
                  {(["keep", "stop", "swap"] as const).map((v) => (
                    <label key={v}>
                      <input
                        required
                        type="radio"
                        name={`verdict-${m.id}`}
                        value={v}
                        checked={verdicts[m.id] === v}
                        onChange={() => setVerdicts({ ...verdicts, [m.id]: v })}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </Section>
          <label>
            Pharmacist name
            <input
              name="reviewer"
              required
              value={draft.reviewer}
              onChange={(e) => editDraft({ reviewer: e.target.value })}
            />
          </label>
          <div className="form-pair">
            <label>
              Qualification
              <input
                name="qualification"
                required
                value={draft.qualification}
                onChange={(e) => editDraft({ qualification: e.target.value })}
              />
            </label>
            <label>
              Registration
              <input
                name="registration"
                required
                value={draft.registration}
                onChange={(e) => editDraft({ registration: e.target.value })}
              />
            </label>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              required
            />
            <span>
              I reviewed the full file and the {open.length} unanswered questions.
            </span>
          </label>
          {localError && (
            <p role="alert" className="error-box">
              {localError}
            </p>
          )}
          <Button disabled={busy} type="submit">
            {busy
              ? "Signing…"
              : demo
                ? "Sign sample review & send →"
                : "Sign review & send →"}
          </Button>
          <p className="small muted">
            Prototype signature: entered identity, not credential verification.
          </p>
        </form>
      }
    >
      <div className="page-heading">
        <span className="eyebrow">Pharmacist review / {file.patient.name}</span>
        <h1>Read the whole story.</h1>
        <p>Her words, the evidence, and the questions still open.</p>
      </div>
      <FileHeader file={file} />
      <Section title="Her account">
        <p className="history-copy">{cleanCopy(file.history.english)}</p>
        <details className="original-account">
          <summary>Read original Urdu</summary>
          <p className="urdu" lang="ur" dir="rtl">
            {file.history.urdu}
          </p>
        </details>
      </Section>
      <Section title="What needs attention">
        <ReportBubbleMap report={fileToBubbleSource(file)} />
        {file.flags.map((f) => (
          <FlagCard flag={f} file={file} key={f.id} />
        ))}
      </Section>
      <Section title="Medicines and remedies">
        <div className="medicine-grid">
          {file.medList.map((m) => (
            <MedicineRow item={m} key={m.id} />
          ))}
        </div>
      </Section>
      <Section title="Questions and answers">
        {file.questions.map((q) => (
          <div className="question-result" key={q.id}>
            <h3>{cleanCopy(q.text.english)}</h3>
            <p className={q.answeredIn ? "muted" : "ask-text"}>
              {answerText(file, q.id) ||
                "Still unanswered. This will remain visible on the report."}
            </p>
          </div>
        ))}
      </Section>
    </AppShell>
  );
}

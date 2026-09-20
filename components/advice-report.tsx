"use client";
import Link from "next/link";
import { useFile } from "./file-provider";
import { AppShell } from "./app-shell";
import {
  Button,
  FileHeader,
  FlagCard,
  MedicineRow,
  Section,
} from "./primitives";
import { SpeakButton } from "./conversation";
import { answerText, cleanCopy } from "@/lib/display";
import { adviceCopy } from "@/lib/advice-text";

export function AdviceView() {
  const { file, demo } = useFile();
  if (file.status !== "signed" || !file.advice)
    return (
      <AppShell title="Waiting for advice" phone>
        <div className="phone-content">
          <span className="eyebrow">{file.patient.name}</span>
          <h1>
            {file.status === "sent"
              ? "A pharmacist is next."
              : "Let’s finish her file."}
          </h1>
          <p>
            {file.status === "sent"
              ? "Her account has been sent for review. Advice will appear here when the pharmacist signs."
              : "Review the findings and send her file before advice can be given."}
          </p>
          <div className="prompt-panel">
            <p className="urdu phone-urdu" lang="ur" dir="rtl">
              دوا لینے سے پہلے فارماسسٹ کے مشورے کا انتظار کریں۔
            </p>
            <p>Wait for the pharmacist’s advice before taking the medicine.</p>
          </div>
          <p className="muted">
            Review is asynchronous and may take minutes or hours. This service
            is for advice, not emergencies.
          </p>
          <Link
            className="button"
            href={
              file.status === "sent"
                ? `/pharmacist/${file.id}`
                : `/file/${file.id}/findings`
            }
          >
            {file.status === "sent"
              ? "Open pharmacist review →"
              : "Open findings →"}
          </Link>
        </div>
      </AppShell>
    );
  // The pharmacist may have signed without writing anything, which is allowed only
  // when nothing is being changed. She still needs a sentence and something to play.
  const spoken = adviceCopy(file)!;

  return (
    <AppShell title="Advice to take home" phone>
      <div className="phone-content">
        <span className="eyebrow">
          {demo ? "Sample review signed" : "Review signed"}
        </span>
        <h1>Her plan, in her language.</h1>
        <p className="muted">
          {file.reviewedBy?.name}, {file.reviewedBy?.qualification}
          <br />
          Registration: {file.reviewedBy?.registration}
        </p>
        <div className="advice-urdu">
          <p className="urdu phone-urdu" lang="ur" dir="rtl">
            {spoken.urdu}
          </p>
        </div>
        <SpeakButton text={spoken.urdu} />
        <details className="original-account">
          <summary>Read the English advice</summary>
          <p>{spoken.english}</p>
        </details>
        <Section title="What to do with each one">
          {file.medList.map((m) => (
            <MedicineRow item={m} key={m.id}>
              <span className={`verdict-chip ${file.advice?.verdicts[m.id]}`}>
                {file.advice?.verdicts[m.id]}
              </span>
            </MedicineRow>
          ))}
        </Section>
        <Link className="button secondary" href={`/file/${file.id}/report`}>
          Open her take-home report →
        </Link>
      </div>
    </AppShell>
  );
}
export function ReportView() {
  const { file, demo } = useFile();
  const signed = file.status === "signed" && file.advice && file.reviewedBy;
  return (
    <div className="report-page">
      <div className="report-toolbar">
        <Link href={`/file/${file.id}/advice`} className="text-link">
          ← Back to advice
        </Link>
        <Button secondary onClick={() => window.print()}>
          Print / save PDF
        </Button>
      </div>
      <main className="report-sheet">
        <header className="report-heading">
          <span className="brand">Mashwara</span>
          <span className="small muted">
            {demo ? "Fictional sample / " : ""}
            {signed ? "Signed pharmacy consult record" : "Draft / not signed"}
          </span>
        </header>
        <h1>Pharmacy consultation</h1>
        <p className="small muted">
          {file.id} /{" "}
          {new Date(file.createdAt).toLocaleDateString("en-GB", {
            dateStyle: "long",
          })}
        </p>
        <FileHeader file={file} />
        <Section title="Presenting request">
          <p>{file.request.join(" and ") || "Not yet recorded"}</p>
        </Section>
        <Section title="How this was taken">
          <p>
            An account in Urdu, followed by translated follow-up turns.{" "}
            {file.recordings.length} recording(s), {file.turns.length} follow-up
            turns, and {file.attachments.length} document(s). Taken by{" "}
            {file.takenBy} at {file.place.shop}, {file.place.area},{" "}
            {file.place.city}. No examination, vital signs, or laboratory
            measurements are recorded.
          </p>
        </Section>
        <Section title="History, as she gave it">
          <p>{cleanCopy(file.history.english) || "Not yet recorded"}</p>
          <p className="urdu" lang="ur" dir="rtl">
            {file.history.urdu}
          </p>
        </Section>
        <Section title="Medicines and remedies">
          <div className="medicine-grid">
            {file.medList.map((m) => (
              <MedicineRow item={m} key={m.id}>
                {signed && (
                  <p className="small">
                    Decision: <strong>{file.advice?.verdicts[m.id]}</strong>
                  </p>
                )}
              </MedicineRow>
            ))}
          </div>
        </Section>
        <Section title="Interactions found">
          {file.flags.map((f) => (
            <FlagCard key={f.id} flag={f} file={file} />
          ))}
          {!file.flags.length && (
            <p>
              No matches in the limited sourced table. This does not establish
              safety.
            </p>
          )}
        </Section>
        <Section title="Questions, answers, and what remains open">
          {file.questions.map((q) => (
            <div className="question-result" key={q.id}>
              <h3>{cleanCopy(q.text.english)}</h3>
              <p>{answerText(file, q.id) || "Unanswered at time of report."}</p>
            </div>
          ))}
        </Section>
        <Section title="Pharmacist impression">
          <p>{file.impression || "No pharmacist impression recorded."}</p>
        </Section>
        <Section title="Advice given">
          {!signed ? (
            <p>Awaiting pharmacist review. No signed advice.</p>
          ) : (
            (() => {
              const given = adviceCopy(file);
              if (!given) return <p>Awaiting pharmacist review. No signed advice.</p>;
              return (
                <>
                  <p>{given.english}</p>
                  {given.urdu ? (
                    <p className="urdu" lang="ur" dir="rtl">
                      {given.urdu}
                    </p>
                  ) : null}
                  {!given.written ? (
                    <p className="small muted">
                      No written advice: every medicine was kept as it is. The decisions
                      are listed above.
                    </p>
                  ) : null}
                </>
              );
            })()
          )}
        </Section>
        <Section title="Limitations">
          <p>
            {demo &&
              "This is a fictional demonstration and is not clinical advice. "}
            This file records a spoken account and translations, which may
            contain errors. No examination, vitals, or laboratory values were
            collected. {file.questions.filter((q) => !q.answeredIn).length}{" "}
            questions remain unanswered. Interaction coverage is limited to
            sourced rows; unidentified remedies cannot be checked. Priority
            labels are not validated clinical risk scores. This record is
            pharmacy advice, not a diagnosis. Reviewer credentials are entered,
            not verified by this prototype.
          </p>
        </Section>
        <footer className="report-signature">
          {signed ? (
            <>
              <strong>
                {file.reviewedBy?.name}, {file.reviewedBy?.qualification}
              </strong>
              <p>
                Registration {file.reviewedBy?.registration} / Signed{" "}
                {file.reviewedBy?.at}
              </p>
            </>
          ) : (
            <strong>Unsigned draft</strong>
          )}
        </footer>
      </main>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFile } from "./file-provider";
import { AppShell } from "./app-shell";
import {
  Button,
  FileHeader,
  FlagCard,
  MedicineRow,
  QuestionCard,
  Section,
} from "./primitives";
import { InteractionMap } from "./interaction-map";
import { cleanCopy } from "@/lib/display";

export function FileOverview() {
  const { file } = useFile();
  return (
    <AppShell
      title="Patient file"
      aside={
        <>
          <Section title="Where this came from">
            {file.recordings.map((r) => (
              <div className="source-entry" key={r.n}>
                <strong>Recording {r.n}</strong>
                <span>
                  {Math.floor(r.seconds / 60)} min {r.seconds % 60} sec
                </span>
                <p className="small muted">Her uninterrupted account</p>
              </div>
            ))}
            {file.turns.length > 0 && (
              <div className="source-entry">
                <strong>Follow-up conversation</strong>
                <span>{file.turns.length} turns</span>
                <Link className="text-link" href={`/file/${file.id}/translate`}>
                  Read the conversation →
                </Link>
              </div>
            )}
            {file.attachments.map((a) => (
              <div className="source-entry" key={a.id}>
                <strong>{cleanCopy(a.label)}</strong>
                <p className="small muted">{a.date} / Document</p>
              </div>
            ))}
          </Section>
          <div className="next-action">
            <Link className="button" href={`/file/${file.id}/findings`}>
              Review the findings →
            </Link>
            <p className="small muted">
              Her account stays beside the clinical terms, all the way to the
              pharmacist.
            </p>
          </div>
        </>
      }
    >
      <div className="page-heading">
        <span className="eyebrow">One visit. One complete account.</span>
        <h1>{file.patient.name}’s file</h1>
        <p>What she needs, what she takes, and what needs a second look.</p>
      </div>
      <FileHeader file={file} />
      <Section title="Asked for at the counter">
        <p>
          {file.request.join(" and ") ||
            "Her account has not been recorded yet."}
        </p>
      </Section>
      <Section title="Her account" detail="Original words preserved">
        <p className="history-copy">
          {cleanCopy(file.history.english) ||
            "Start by letting her speak, without interruption."}
        </p>
        {file.history.urdu && (
          <details className="original-account">
            <summary>Read her original Urdu</summary>
            <p lang="ur" dir="rtl" className="urdu">
              {file.history.urdu}
            </p>
          </details>
        )}
        {!file.recordings.length && (
          <Link className="button" href={`/file/${file.id}/record`}>
            Let her talk →
          </Link>
        )}
      </Section>
      <Section
        title="Medicines and remedies"
        detail={`${file.medList.length} items`}
      >
        <div className="medicine-grid">
          {file.medList.map((m) => (
            <MedicineRow key={m.id} item={m} />
          ))}
        </div>
      </Section>
    </AppShell>
  );
}

export function Findings() {
  const { file, update, busy } = useFile();
  const router = useRouter();
  const open = file.questions.filter((q) => !q.answeredIn);
  async function send() {
    try {
      if (file.status !== "sent" && file.status !== "signed")
        await update({ status: "sent" });
      router.push(`/pharmacist/${file.id}`);
    } catch {}
  }
  return (
    <AppShell
      title="Findings & follow-up"
      aside={
        <>
          <Section title="Ask her next" detail={`${open.length} unanswered`}>
            {open.length ? (
              <>
                <p className="urdu phone-urdu" lang="ur" dir="rtl">
                  {open[0].text.urdu}
                </p>
                <p>{cleanCopy(open[0].text.english)}</p>
                <Link
                  className="button secondary"
                  href={`/file/${file.id}/ask`}
                >
                  Open one question at a time →
                </Link>
              </>
            ) : (
              <p>All questions have a recorded answer.</p>
            )}
          </Section>
          <div className="next-action">
            <h3>
              {file.status === "sent"
                ? "Waiting for the pharmacist"
                : file.status === "signed"
                  ? "The review is signed"
                  : "Ready for a second pair of eyes"}
            </h3>
            <p className="small muted">
              Unanswered questions stay on the file. A pharmacist may take
              minutes or hours to respond.
            </p>
            <Button disabled={busy || !file.medList.length} onClick={send}>
              {busy
                ? "Sending…"
                : file.status === "sent"
                  ? "Open pharmacist review →"
                  : file.status === "signed"
                    ? "Open signed review →"
                    : "Send to a pharmacist →"}
            </Button>
            <Link className="text-link" href={`/file/${file.id}/advice`}>
              View the counter’s waiting screen
            </Link>
          </div>
        </>
      }
    >
      <div className="page-heading">
        <span className="eyebrow">{file.patient.name} / Findings</span>
        <h1>Before anything is sold.</h1>
        <p>
          The interaction table raises flags. A pharmacist makes the decision.
        </p>
      </div>
      {file.flags.length > 0 && file.status !== "signed" && (
        <div className="hold-banner">
          <strong>Hold the sale for pharmacist review.</strong>
          <span>
            {file.flags.length} interactions need attention. This is not a
            diagnosis.
          </span>
        </div>
      )}
      <Section
        title="How her medicines connect"
        detail={`${file.medList.length} items / ${file.flags.length} cited flags`}
      >
        <InteractionMap file={file} />
      </Section>
      <Section title="Interactions to review">
        {file.flags.map((f) => (
          <FlagCard key={f.id} flag={f} file={file} />
        ))}
        {!file.flags.length && (
          <div className="empty-state">
            <h3>No matches in the sourced table.</h3>
            <p>
              This is limited coverage, not confirmation that the combination is
              safe.
            </p>
          </div>
        )}
        <p className="small muted">
          Only sourced rows can raise a flag. Coverage is limited; unidentified
          products cannot be checked. Priority labels are project review
          priorities, not a validated clinical risk score.
        </p>
      </Section>
      <Section
        title="Questions, not conclusions"
        detail={`${file.questions.length - open.length} of ${file.questions.length} answered`}
      >
        {file.questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            fileId={file.status === "signed" ? undefined : file.id}
          />
        ))}
      </Section>
    </AppShell>
  );
}

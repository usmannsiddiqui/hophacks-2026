import Link from "next/link";
import { GlassMaterial } from "./glass-material";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Flag, MedItem, PatientFile, Question } from "@/lib/types";
import {
  citationName,
  cleanCopy,
  medicineName,
  roleName,
  sourceName,
} from "@/lib/display";

export function Button({
  secondary,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return (
    <button
      {...props}
      className={`button ${secondary ? "secondary" : ""} ${className}`}
    />
  );
}
export function Section({
  title,
  detail,
  children,
  className = "",
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`section glass-panel ${className}`}>
      <GlassMaterial />
      <div className="section-heading">
        <h2>{title}</h2>
        {detail && <span className="muted small">{detail}</span>}
      </div>
      {children}
    </section>
  );
}
export function FileHeader({ file }: { file: PatientFile }) {
  return (
    <dl className="file-header">
      {[
        ["Name", file.patient.name],
        ["Age / sex", `${file.patient.age} / ${file.patient.sex}`],
        ["Language", "Urdu"],
        ["Taken by", file.takenBy],
        [
          "Reviewed by",
          file.reviewedBy
            ? `${file.reviewedBy.name}, ${file.reviewedBy.qualification}`
            : "Awaiting pharmacist",
        ],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function FlagPill({ file }: { file: PatientFile }) {
  if (!file.flags.length) return null;
  return (
    <span
      className={`flag-pill ${file.flags.some((f) => f.severity === "high") ? "high" : "moderate"} ${file.status === "signed" ? "outlined" : ""}`}
    >
      {file.flags.length} flags
    </span>
  );
}
export function MedicineRow({
  item,
  children,
}: {
  item: MedItem;
  children?: ReactNode;
}) {
  return (
    <article
      className={`medicine-row ${item.term === "unidentified" ? "unidentified" : ""}`}
    >
      <div className="row-between">
        <h3>{medicineName(item.term)}</h3>
        <span className="role-tag">{roleName(item.role)}</span>
      </div>
      {item.herWords ? (
        <blockquote className="urdu her-words" lang="ur" dir="rtl">
          {item.herWords}
        </blockquote>
      ) : (
        <p className="ask-text small">
          Not mentioned in her account. From a document.
        </p>
      )}
      <div className="row-between small muted">
        <span className="capitalize">{item.source}</span>
        <span>{sourceName(item.at)}</span>
      </div>
      {children}
    </article>
  );
}
export function FlagCard({ flag, file }: { flag: Flag; file: PatientFile }) {
  if (!flag.citation.trim()) return null;
  const name = (id: string) =>
    medicineName(file.medList.find((m) => m.id === id)?.term ?? id);
  return (
    <article className={`flag-card ${flag.severity}`}>
      <span className="severity">
        {flag.severity === "high" ? "High priority" : "Moderate priority"}
      </span>
      <h3>
        {name(flag.a)} + {name(flag.b)}
      </h3>
      <p>{cleanCopy(flag.reason)}</p>
      {/^https:\/\//.test(flag.citation) ? (
        <a
          className="citation"
          href={flag.citation}
          target="_blank"
          rel="noreferrer"
        >
          {citationName(flag.citation)} ↗
        </a>
      ) : (
        <span className="citation">{flag.citation}</span>
      )}
    </article>
  );
}
export function QuestionCard({
  question,
  fileId,
}: {
  question: Question;
  fileId?: string;
}) {
  return (
    <article
      className={`question-card ${question.answeredIn ? "answered" : ""}`}
    >
      <div className="row-start">
        <span className="question-mark" aria-hidden="true">
          ?
        </span>
        <div>
          <h3>{cleanCopy(question.text.english)}</h3>
          <p className="small muted">{cleanCopy(question.why)}</p>
          <p className="small muted">
            {question.from.map(sourceName).join(" + ")}
          </p>
          {question.answeredIn ? (
            <span className="small">Answer recorded</span>
          ) : (
            fileId && (
              <Link
                className="text-link"
                href={`/file/${fileId}/ask?q=${question.id}`}
              >
                Ask this question →
              </Link>
            )
          )}
        </div>
      </div>
    </article>
  );
}

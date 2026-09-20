import type { ReactNode } from "react";
import { citationDetails } from "@/lib/citation";

export function ReportFlag({ severity, medicines, reason, citation }: {
  severity: "high" | "moderate";
  medicines: ReactNode;
  reason: string;
  citation: string;
}) {
  const source = citationDetails(citation);
  return (
    <article className={`flag-card ${severity}`}>
      <div className="flag-card-severity">
        <span className="flag-severity-mark" aria-hidden="true" />
        {severity === "high" ? "High" : "Moderate"}
      </div>
      <div className="flag-card-content">
        <h3>{medicines}</h3>
        <p>{reason}</p>
        <div className="flag-card-source">
          <span>Evidence</span>
          {source.href ? (
            <a href={source.href} target="_blank" rel="noreferrer" title={citation}>
              {source.label}
            </a>
          ) : <span>{source.label}</span>}
          <span className="print-only flag-source-print">{citation}</span>
        </div>
      </div>
    </article>
  );
}

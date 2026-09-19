"use client";
import { useState } from "react";
import type { PatientFile } from "@/lib/types";
import { medicineName } from "@/lib/display";

export function InteractionMap({ file }: { file: PatientFile }) {
  const [selected, setSelected] = useState<string | null>(null);
  const nodes = file.medList.map((m, i) => {
    const angle =
      (i / Math.max(file.medList.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const touching = file.flags.filter((f) => f.a === m.id || f.b === m.id);
    const severity = touching.some((f) => f.severity === "high")
      ? "high"
      : touching.length
        ? "moderate"
        : "neutral";
    return {
      ...m,
      x: 240 + Math.cos(angle) * 160,
      y: 160 + Math.sin(angle) * 105,
      severity,
      r: severity === "high" ? 31 : severity === "moderate" ? 25 : 18,
    };
  });
  const active = nodes.find((n) => n.id === selected);
  return (
    <div className="map-panel">
      <svg
        viewBox="0 0 480 330"
        className="interaction-map"
        role="group"
        aria-label="Medicine interaction map. Each connecting line represents a cited interaction."
      >
        <title>Medicines and cited interactions</title>
        {file.flags.map((f) => {
          const a = nodes.find((n) => n.id === f.a),
            b = nodes.find((n) => n.id === f.b);
          return a && b ? (
            <line
              key={f.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`map-edge ${f.severity}`}
            />
          ) : null;
        })}
        {nodes.map((m) => (
          <g
            key={m.id}
            role="button"
            tabIndex={0}
            aria-label={`${medicineName(m.term)}. ${m.herWords ?? "From a document; no patient words"}`}
            onClick={() => setSelected(m.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelected(m.id);
              }
            }}
            className={`map-node ${m.severity} ${m.term === "unidentified" ? "unknown" : ""}`}
          >
            <circle cx={m.x} cy={m.y} r={m.r} />
            <text x={m.x} y={m.y + m.r + 19} textAnchor="middle">
              {medicineName(m.term)}
            </text>
          </g>
        ))}
      </svg>
      <div className="map-caption" aria-live="polite">
        {active ? (
          <>
            <strong>{medicineName(active.term)}</strong>
            {active.herWords ? (
              <p lang="ur" dir="rtl" className="urdu">
                {active.herWords}
              </p>
            ) : (
              <p className="ask-text">
                From a document, not her spoken account.
              </p>
            )}
          </>
        ) : (
          <>
            <span>Larger circle = higher review priority</span>
            <p>Select a medicine to see her words. Dashed = unidentified.</p>
          </>
        )}
      </div>
    </div>
  );
}

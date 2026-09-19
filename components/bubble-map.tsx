"use client";

import { useState } from "react";
import { ForceBubbleMap } from "@/components/bubble-map-force";
import type { Flag, MedItem } from "@/lib/types";
import { displayOf } from "@/lib/vocab";

function worstTouching(id: string, flags: Flag[]): Flag["severity"] | null {
  const hits = flags.filter(f => f.a === id || f.b === id);
  if (hits.some(f => f.severity === "high")) return "high";
  if (hits.some(f => f.severity === "moderate")) return "moderate";
  return null;
}

function shortLabel(term: string) {
  const d = displayOf(term);
  return d.length > 24 ? `${d.slice(0, 22)}…` : d;
}

function RingMap({ medList, flags }: { medList: MedItem[]; flags: Flag[] }) {
  const width = 420;
  const height = 300;
  const cx = width / 2;
  const cy = height / 2 - 8;
  const ring = medList.length > 6 ? 110 : 96;

  const nodes = medList.map((m, i) => {
    const angle = (Math.PI * 2 * i) / medList.length - Math.PI / 2;
    const sev = worstTouching(m.id, flags);
    const r = sev === "high" ? 28 : sev === "moderate" ? 22 : 16;
    return { m, x: cx + ring * Math.cos(angle), y: cy + ring * Math.sin(angle), r, sev };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Bubble map of medicines and flags">
      {flags.map(f => {
        const a = nodes.find(n => n.m.id === f.a);
        const b = nodes.find(n => n.m.id === f.b);
        if (!a || !b) return null;
        return (
          <line
            key={f.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={f.severity === "high" ? "#b3261e" : "#8a5a12"}
            strokeWidth={f.severity === "high" ? 2.5 : 1.5}
          />
        );
      })}
      {nodes.map(({ m, x, y, r, sev }) => (
        <g key={m.id}>
          <circle
            cx={x}
            cy={y}
            r={r}
            fill={m.term === "unidentified" ? "#fdf4e6" : sev ? "#fbeceb" : "#f9faf7"}
            stroke={m.term === "unidentified" ? "#8a5a12" : sev ? "#b3261e" : "#dee2de"}
            strokeWidth={1.5}
            strokeDasharray={m.term === "unidentified" ? "4 3" : undefined}
          />
          <text x={x} y={y + r + 14} textAnchor="middle" fontSize="11" fill="#2c2c2c">
            {shortLabel(m.term)}
          </text>
          <title>
            {m.herWords
              ? `${displayOf(m.term)} — ${m.herWords}`
              : `${displayOf(m.term)} — from a document, no words of hers`}
          </title>
        </g>
      ))}
    </svg>
  );
}

export function BubbleMap({ medList, flags }: { medList: MedItem[]; flags: Flag[] }) {
  const [layout, setLayout] = useState<"force" | "ring">("force");

  if (!medList.length) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-3xl border border-dashed border-line bg-surface-raised px-6 text-center text-sm text-ink-muted">
        The bubble map fills in after Grok maps her words onto the closed vocabulary.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">
          {layout === "force"
            ? "Click a medicine to zoom in. Move the pointer to drift the graph. Click the paper to return."
            : "Fixed ring. Switch to Force for the live layout."}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setLayout("force")}
            className={`h-11 rounded-lg px-3 text-sm ${layout === "force" ? "bg-ink text-white" : "border border-line"}`}
          >
            Force
          </button>
          <button
            type="button"
            onClick={() => setLayout("ring")}
            className={`h-11 rounded-lg px-3 text-sm ${layout === "ring" ? "bg-ink text-white" : "border border-line"}`}
          >
            Ring
          </button>
        </div>
      </div>
      {layout === "force" ? (
        <ForceBubbleMap medList={medList} flags={flags} />
      ) : (
        <RingMap medList={medList} flags={flags} />
      )}
    </div>
  );
}

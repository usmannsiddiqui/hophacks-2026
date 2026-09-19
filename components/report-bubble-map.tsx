"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { select, zoom, zoomIdentity } from "d3";
import type { ZoomBehavior } from "d3";
import { layoutReportMap } from "@/lib/report-map";
import type { VisitReport } from "@/lib/visit-report";

type Selection = { kind: "medicine" | "flag"; id: string } | null;

export function ReportBubbleMap({ report }: { report: VisitReport }) {
  const [selection, setSelection] = useState<Selection>(null);
  const [size, setSize] = useState({ width: 900, height: 580 });
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const scene = useRef<SVGGElement>(null);
  const zoomControl = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const titleId = useId();
  const selectionTrigger = useRef<SVGGElement | null>(null);
  const graph = useMemo(() => layoutReportMap(report.medList, report.flags, size.width, size.height), [report.medList, report.flags, size]);
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const medicine = selection?.kind === "medicine" ? report.medList.find(item => item.id === selection.id) : undefined;
  const flag = selection?.kind === "flag" ? report.flags.find(item => item.id === selection.id) : undefined;
  const selectedFlags = flag ? [flag] : medicine ? report.flags.filter(item => item.a === medicine.id || item.b === medicine.id) : [];
  const emphasized = new Set(flag ? [flag.a, flag.b] : medicine ? [medicine.id, ...selectedFlags.flatMap(item => [item.a, item.b])] : []);

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(300, entry.contentRect.width);
      const height = width < 600 ? 560 : 580;
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svg.current || !scene.current) return;
    const root = select(svg.current);
    const layer = select(scene.current);
    const behavior = zoom<SVGSVGElement, unknown>()
      .extent([[0, 0], [graph.width, graph.height]])
      .scaleExtent([1, 4])
      .translateExtent([[-graph.width * 0.25, -graph.height * 0.25], [graph.width * 1.25, graph.height * 1.25]])
      .filter(event => !event.target.closest("[role=button]") && (!event.ctrlKey || event.type === "wheel") && !event.button)
      .on("zoom", event => layer.attr("transform", event.transform.toString()));
    root.call(behavior).on("dblclick.zoom", null);
    root.call(behavior.transform, zoomIdentity);
    zoomControl.current = behavior;
    return () => { root.on(".zoom", null); zoomControl.current = null; };
  }, [graph.width, graph.height]);

  function changeZoom(factor: number) {
    if (svg.current && zoomControl.current) select(svg.current).call(zoomControl.current.scaleBy, factor);
  }
  function reset() {
    setSelection(null);
    if (svg.current && zoomControl.current) select(svg.current).call(zoomControl.current.transform, zoomIdentity);
  }
  function dismissEvidence() {
    setSelection(null);
    selectionTrigger.current?.focus();
  }
  function choose(kind: "medicine" | "flag", id: string, trigger: SVGGElement) {
    selectionTrigger.current = trigger;
    setSelection(current => current?.kind === kind && current.id === id ? null : { kind, id });
  }

  return (
    <div className="report-map" ref={host} onKeyDown={event => { if (event.key === "Escape" && selection) { event.stopPropagation(); dismissEvidence(); } }}>
      <div className="map-heading">
        <div><span className="eyebrow">Medicines & remedies</span><h2>See the connections.</h2></div>
        <span className={report.flags.length ? "map-count" : "small muted"}>{report.flags.length} cited {report.flags.length === 1 ? "flag" : "flags"}</span>
      </div>
      {graph.nodes.length ? (
        <>
          <svg ref={svg} viewBox={`0 0 ${graph.width} ${graph.height}`} className="report-map-canvas" style={{ height: size.width < 600 ? graph.height : 580 }} role="group" aria-labelledby={titleId}>
            <title id={titleId}>Medicines and sourced interactions. Select a medicine or connection to inspect its evidence.</title>
            <g ref={scene}>
              {graph.links.map(link => {
                const a = byId.get(link.a)!;
                const b = byId.get(link.b)!;
                const middleX = (a.x + b.x) / 2;
                const middleY = (a.y + b.y) / 2;
                const bend = Math.abs(a.x - b.x) < 120 && Math.abs(a.y - b.y) > 100 ? (middleX < graph.width / 2 ? 190 : -190) : 0;
                const path = `M${a.x},${a.y} Q${middleX + bend},${middleY} ${b.x},${b.y}`;
                const active = flag?.id === link.id || medicine && (link.a === medicine.id || link.b === medicine.id);
                return <g key={link.id} role="button" tabIndex={0} aria-pressed={flag?.id === link.id} aria-label={`${link.severity} flag: ${a.name} and ${b.name}. View source.`}
                  className={`report-connection ${active ? "selected" : ""} ${selection && !active ? "dimmed" : ""}`}
                  onClick={event => choose("flag", link.id, event.currentTarget)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose("flag", link.id, event.currentTarget); } }}>
                  <path className="report-connection-target" d={path} fill="none" />
                  <path className="report-connection-line" d={path} fill="none" />
                  <circle className="report-connection-badge" cx={middleX + bend / 2} cy={middleY} r={14} />
                  <text x={middleX + bend / 2} y={middleY + 5} textAnchor="middle" className="report-connection-mark">!</text>
                </g>;
              })}
              {graph.nodes.map(node => (
                <g key={node.id} transform={`translate(${node.x},${node.y})`} role="button" tabIndex={0}
                  aria-label={`${node.name}. ${node.herWords}. ${node.severity ? `${node.severity} cited flag` : node.term === "unidentified" ? "Needs identification" : "No cited match"}. View evidence.`}
                  aria-pressed={medicine?.id === node.id}
                  className={`report-bubble ${node.severity ? "flagged" : ""} ${node.term === "unidentified" ? "unknown" : ""} ${medicine?.id === node.id ? "selected" : ""} ${selection && !emphasized.has(node.id) ? "dimmed" : ""}`}
                  onClick={event => choose("medicine", node.id, event.currentTarget)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose("medicine", node.id, event.currentTarget); } }}>
                  <circle className="report-bubble-focus" r={node.r + 7} />
                  <circle className="report-bubble-circle" r={node.r} />
                  <text className="report-bubble-symbol" textAnchor="middle" dy=".35em">{node.term === "unidentified" ? "?" : node.severity ? "!" : "·"}</text>
                  <foreignObject x={size.width < 600 ? -80 : -90} y={node.r+10} width={size.width < 600 ? 160 : 180} height={76} className="report-bubble-label">
                    <div><strong>{node.name}</strong><span className="urdu" lang="ur" dir="rtl">{node.herWords}</span></div>
                  </foreignObject>
                </g>
              ))}
            </g>
          </svg>
          <div className="map-controls" aria-label="Map controls">
            <button type="button" aria-label="Zoom out" onClick={() => changeZoom(0.8)}>−</button>
            <button type="button" onClick={reset}>Reset</button>
            <button type="button" aria-label="Zoom in" onClick={() => changeZoom(1.25)}>+</button>
          </div>
        </>
      ) : <div className="map-empty"><span aria-hidden="true">○</span><h3>No medicines to map yet.</h3><p>The account did not identify any medicines or remedies.</p></div>}
      <div className="map-footer">
        <div className="map-legend"><span><i className="legend-flag" /> Cited flag</span><span><i className="legend-unknown" /> Unidentified</span><span><i /> No cited match</span></div>
        <p>No cited match does not establish safety. Coverage is limited.</p>
      </div>
      {selection && (medicine || flag) && (
        <aside className="map-evidence" aria-label="Selected evidence" aria-live="polite">
          <button type="button" className="map-evidence-close" onClick={dismissEvidence} aria-label="Close evidence">×</button>
          <span className="eyebrow">{flag ? "Sourced interaction" : "Patient’s words"}</span>
          <h3>{medicine?.name ?? `${byId.get(flag!.a)?.name} + ${byId.get(flag!.b)?.name}`}</h3>
          {medicine && <><p className="urdu" lang="ur" dir="rtl">{medicine.herWords}</p><details><summary>Source excerpt</summary><p className="urdu" lang="ur" dir="rtl">{medicine.source.excerpt}</p></details></>}
          {flag && [flag.a, flag.b].map(id => <p key={id} className="urdu" lang="ur" dir="rtl">{byId.get(id)?.herWords}</p>)}
          {selectedFlags.map(item => <div key={item.id} className="map-evidence-flag"><strong>{item.severity === "high" ? "High" : "Moderate"} · {byId.get(item.a)?.name} + {byId.get(item.b)?.name}</strong><p>{item.reason}</p><a href={item.citation} target="_blank" rel="noreferrer">Read source ↗</a></div>)}
          {medicine && !selectedFlags.length && <p>{medicine.term === "unidentified" ? "This item needs identification. It is not a confirmed interaction." : "No match in the limited sourced table. This does not establish safety."}</p>}
        </aside>
      )}
    </div>
  );
}

"use client";
import { LiquidButton } from "@/components/ui/liquid-glass-button";


import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { select, zoom, zoomIdentity, zoomTransform } from "d3";
import type { ZoomBehavior, ZoomTransform } from "d3";
import { layoutReportMap } from "@/lib/report-map";
import { itemLabel, itemDetail } from "@/lib/display";

/**
 * What the map needs, independent of where it came from. A VisitReport satisfies this
 * directly; a PatientFile is adapted by `fileToBubbleSource` in lib/map-source.ts.
 * `excerpt` is optional because a counter file records a timestamp, not a quotation.
 */
export type BubbleMedicine = {
  id: string;
  term: string;
  name: string;
  herWords: string | null;
  english?: string;
  excerpt?: string;
};
export type BubbleFlag = {
  id: string;
  a: string;
  b: string;
  severity: "high" | "moderate";
  reason: string;
  citation: string;
};
export type BubbleMapSource = { medList: BubbleMedicine[]; flags: BubbleFlag[] };

type Selection = { kind: "medicine" | "flag"; id: string } | null;

export function ReportBubbleMap({ report }: { report: BubbleMapSource }) {
  const [selection, setSelection] = useState<Selection>(null);
  const [size, setSize] = useState({ width: 900, height: 580 });
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const scene = useRef<SVGGElement>(null);
  const zoomControl = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const titleId = useId();
  const selectionTrigger = useRef<SVGGElement | null>(null);
  const drift = useRef<SVGGElement>(null);
  const driftFrame = useRef<number | null>(null);
  // Motion is decoration. If the reader has asked for less of it, they get none.
  const stillness = useRef(false);
  // True between pointerdown and pointerup. The lean pauses so the thing being
  // clicked does not slide out from under the cursor mid-click.
  const reaching = useRef(false);
  // The view the reader had before a selection pulled them in, so closing the panel
  // puts them back where they were rather than at a default they never chose.
  const viewBefore = useRef<ZoomTransform | null>(null);
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

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    stillness.current = query.matches;
    const listen = (event: MediaQueryListEvent) => { stillness.current = event.matches; };
    query.addEventListener("change", listen);
    return () => query.removeEventListener("change", listen);
  }, []);

  /**
   * The scene leans a few pixels toward the cursor. Enough to feel like the graph is
   * a surface rather than a picture; small enough that nothing moves under a click.
   * Applied to a layer inside the zoom group, so it composes with pan and zoom instead
   * of fighting them.
   */
  const lean = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (stillness.current || reaching.current || !drift.current || !svg.current) return;
    const box = svg.current.getBoundingClientRect();
    const fromCentreX = (event.clientX - box.left) / box.width - 0.5;
    const fromCentreY = (event.clientY - box.top) / box.height - 0.5;
    const reach = graph.width * 0.012;
    if (driftFrame.current) cancelAnimationFrame(driftFrame.current);
    driftFrame.current = requestAnimationFrame(() => {
      drift.current?.setAttribute(
        "transform",
        `translate(${(-fromCentreX * reach).toFixed(2)},${(-fromCentreY * reach).toFixed(2)})`,
      );
    });
  }, [graph.width]);

  /** Freeze the lean and snap the layer square while a pointer is down. */
  const hold = useCallback(() => {
    reaching.current = true;
    if (driftFrame.current) cancelAnimationFrame(driftFrame.current);
    drift.current?.setAttribute("transform", "translate(0,0)");
  }, []);

  const release = useCallback(() => { reaching.current = false; }, []);

  const settle = useCallback(() => {
    if (driftFrame.current) cancelAnimationFrame(driftFrame.current);
    drift.current?.setAttribute("transform", "translate(0,0)");
  }, []);

  useEffect(() => () => { if (driftFrame.current) cancelAnimationFrame(driftFrame.current); }, []);

  /** Move the view onto a point and magnify it, so the selected mix fills the frame. */
  const focusOn = useCallback((x: number, y: number, scale: number) => {
    if (!svg.current || !zoomControl.current) return;
    // Only the first focus records it; moving between bubbles keeps the original view
    // as the thing to come back to.
    if (!viewBefore.current) viewBefore.current = zoomTransform(svg.current);
    const next = zoomIdentity
      .translate(graph.width / 2, graph.height / 2)
      .scale(scale)
      .translate(-x, -y);
    const root = select(svg.current);
    if (stillness.current) root.call(zoomControl.current.transform, next);
    else root.transition().duration(480).call(zoomControl.current.transform, next);
  }, [graph.width, graph.height]);

  /** Ease back to whatever the reader was looking at before they selected something. */
  const restoreView = useCallback(() => {
    if (!svg.current || !zoomControl.current) return;
    const target = viewBefore.current ?? zoomIdentity;
    viewBefore.current = null;
    const root = select(svg.current);
    if (stillness.current) root.call(zoomControl.current.transform, target);
    else root.transition().duration(420).call(zoomControl.current.transform, target);
  }, []);

  function changeZoom(factor: number) {
    if (svg.current && zoomControl.current) select(svg.current).call(zoomControl.current.scaleBy, factor);
  }
  function reset() {
    setSelection(null);
    settle();
    viewBefore.current = null;
    if (!svg.current || !zoomControl.current) return;
    const root = select(svg.current);
    if (stillness.current) root.call(zoomControl.current.transform, zoomIdentity);
    else root.transition().duration(420).call(zoomControl.current.transform, zoomIdentity);
  }
  function dismissEvidence() {
    setSelection(null);
    restoreView();
    selectionTrigger.current?.focus();
  }
  function choose(kind: "medicine" | "flag", id: string, trigger: SVGGElement) {
    selectionTrigger.current = trigger;
    const alreadyOpen = selection?.kind === kind && selection.id === id;
    setSelection(alreadyOpen ? null : { kind, id });

    if (alreadyOpen) {
      // Second click on the same thing closes it and puts the view back.
      restoreView();
      return;
    }

    if (kind === "medicine") {
      const node = byId.get(id);
      if (node) focusOn(node.x, node.y, 1.85);
      return;
    }
    // A connection: frame both ends, and scale to whatever the gap between them allows.
    const link = graph.links.find(item => item.id === id);
    const a = link && byId.get(link.a);
    const b = link && byId.get(link.b);
    if (!a || !b) return;
    const span = Math.max(Math.hypot(a.x - b.x, a.y - b.y) + a.r + b.r + 160, 1);
    const fit = Math.min(graph.width / span, 2.1);
    focusOn((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(1.15, fit));
  }

  return (
    <div className="report-map" ref={host} onKeyDown={event => { if (event.key === "Escape" && selection) { event.stopPropagation(); dismissEvidence(); } }}>
      <div className="map-heading">
        <div><span className="eyebrow">Medicines & remedies</span><h2>See the connections.</h2></div>
        <span className={report.flags.length ? "map-count" : "small muted"}>{report.flags.length} cited {report.flags.length === 1 ? "flag" : "flags"}</span>
      </div>
      {graph.nodes.length ? (
        <>
          <svg ref={svg} viewBox={`0 0 ${graph.width} ${graph.height}`} className="report-map-canvas" style={{ height: size.width < 600 ? graph.height : 580 }} role="group" aria-labelledby={titleId} onPointerMove={lean} onPointerLeave={settle} onPointerDown={hold} onPointerUp={release} onPointerCancel={release}>
            <title id={titleId}>Medicines and sourced interactions. Select a medicine or connection to inspect its evidence.</title>
            <g ref={scene}>
              <g ref={drift} className="report-map-drift">
              {graph.links.map(link => {
                const a = byId.get(link.a)!;
                const b = byId.get(link.b)!;
                const middleX = (a.x + b.x) / 2;
                const middleY = (a.y + b.y) / 2;
                const bend = Math.abs(a.x - b.x) < 120 && Math.abs(a.y - b.y) > 100 ? (middleX < graph.width / 2 ? 190 : -190) : 0;
                const path = `M${a.x},${a.y} Q${middleX + bend},${middleY} ${b.x},${b.y}`;
                const active = flag?.id === link.id || medicine && (link.a === medicine.id || link.b === medicine.id);
                return <g key={link.id} role="button" tabIndex={0} aria-pressed={flag?.id === link.id} aria-label={`${link.severity} flag: ${itemLabel(a)} and ${itemLabel(b)}. View source.`}
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
                  aria-label={`${itemLabel(node)}. ${node.severity ? `${node.severity} cited flag` : node.term === "unidentified" ? "Needs identification" : "No cited match"}. View evidence.`}
                  aria-pressed={medicine?.id === node.id}
                  className={`report-bubble ${node.severity ? "flagged" : ""} ${node.term === "unidentified" ? "unknown" : ""} ${medicine?.id === node.id ? "selected" : ""} ${selection && !emphasized.has(node.id) ? "dimmed" : ""}`}
                  onClick={event => choose("medicine", node.id, event.currentTarget)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose("medicine", node.id, event.currentTarget); } }}>
                  <circle className="report-bubble-focus" r={node.r + 7} />
                  <circle className="report-bubble-circle" r={node.r} />
                  <text className="report-bubble-symbol" textAnchor="middle" dy=".35em">{node.term === "unidentified" ? "?" : node.severity ? "!" : "·"}</text>
                  <foreignObject x={size.width < 600 ? -80 : -90} y={node.r+10} width={size.width < 600 ? 160 : 180} height={46} className="report-bubble-label">
                    <div><strong>{itemLabel(node)}</strong></div>
                  </foreignObject>
                </g>
              ))}
              </g>
            </g>
          </svg>
          <div className="map-controls" aria-label="Map controls">
            <LiquidButton type="button" aria-label="Zoom out" onClick={() => changeZoom(0.8)}>−</LiquidButton>
            <LiquidButton type="button" onClick={reset}>Reset</LiquidButton>
            <LiquidButton type="button" aria-label="Zoom in" onClick={() => changeZoom(1.25)}>+</LiquidButton>
          </div>
        </>
      ) : <div className="map-empty"><span aria-hidden="true">○</span><h3>No medicines to map yet.</h3><p>The account did not identify any medicines or remedies.</p></div>}
      <div className="map-footer">
        <div className="map-legend"><span><i className="legend-flag" /> Cited flag</span><span><i className="legend-unknown" /> Unidentified</span><span><i /> No cited match</span></div>
        <p>No cited match does not establish safety. Coverage is limited.</p>
      </div>
      {selection && (medicine || flag) && (
        <aside className="map-evidence" aria-label="Selected evidence" aria-live="polite">
          <LiquidButton type="button" className="map-evidence-close" onClick={dismissEvidence} aria-label="Close evidence">×</LiquidButton>
          <span className="eyebrow">{flag ? "Sourced interaction" : medicine?.herWords ? "Patient’s words" : "From a document"}</span>
          <h3>{medicine ? itemLabel(medicine) : `${itemLabel(byId.get(flag!.a)!)} + ${itemLabel(byId.get(flag!.b)!)}`}</h3>
          {medicine && itemDetail(medicine) && <p className="map-evidence-detail">{itemDetail(medicine)}</p>}
          {medicine?.herWords ? <p className="urdu" lang="ur" dir="rtl">{medicine.herWords}</p> : null}
          {medicine && !medicine.herWords ? <p className="ask-text">From a document, not her spoken account.</p> : null}
          {medicine?.excerpt ? <details><summary>Source excerpt</summary><p className="urdu" lang="ur" dir="rtl">{medicine.excerpt}</p></details> : null}
          {flag && [flag.a, flag.b].map(id => <p key={id} className="urdu" lang="ur" dir="rtl">{byId.get(id)?.herWords}</p>)}
          {selectedFlags.map(item => <div key={item.id} className="map-evidence-flag"><strong>{item.severity === "high" ? "High" : "Moderate"} · {itemLabel(byId.get(item.a)!)} + {itemLabel(byId.get(item.b)!)}</strong><p>{item.reason}</p>{/^https?:\/\//.test(item.citation) ? <a href={item.citation} target="_blank" rel="noreferrer">Read source ↗</a> : <span className="small muted">Source: {item.citation}</span>}</div>)}
          {medicine && !selectedFlags.length && <p>{medicine.term === "unidentified" ? "This item needs identification. It is not a confirmed interaction." : "No match in the limited sourced table. This does not establish safety."}</p>}
        </aside>
      )}
    </div>
  );
}

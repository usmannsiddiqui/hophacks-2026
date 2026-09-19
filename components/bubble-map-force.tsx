"use client";

import { useEffect, useId, useRef } from "react";
import type { D3DragEvent, SimulationLinkDatum, SimulationNodeDatum } from "d3";
import type { Flag, MedItem } from "@/lib/types";
import { displayOf } from "@/lib/vocab";

const WIDTH = 640;
const HEIGHT = 420;
const OPEN_R = 80;
const INNER = OPEN_R * 1.42;

type SimNode = SimulationNodeDatum & {
  id: string;
  label: string;
  body: string;
  r: number;
  sev: "high" | "moderate" | null;
  unidentified: boolean;
};

type SimLink = SimulationLinkDatum<SimNode> & {
  severity: Flag["severity"];
};

function worstTouching(id: string, flags: Flag[]): Flag["severity"] | null {
  const hits = flags.filter(f => f.a === id || f.b === id);
  if (hits.some(f => f.severity === "high")) return "high";
  if (hits.some(f => f.severity === "moderate")) return "moderate";
  return null;
}

function shortLabel(term: string) {
  const d = displayOf(term);
  return d.length > 18 ? `${d.slice(0, 16)}…` : d;
}

function asNode(ref: SimNode | string | number): SimNode {
  return ref as SimNode;
}

function oneLine(text: string) {
  return text.replace(/\.\s+/g, " — ").replace(/\s+$/, "");
}

function nodeBody(id: string, medList: MedItem[], flags: Flag[]): string {
  const med = medList.find(m => m.id === id);
  if (!med) return "";
  const hits = flags
    .filter(f => f.a === id || f.b === id)
    .sort((a, b) => Number(b.severity === "high") - Number(a.severity === "high"));
  if (hits.length) {
    return oneLine(hits[0].reason);
  }
  if (med.term === "unidentified") {
    return "Not on the closed vocabulary, so it only raises a question.";
  }
  return "No cited interaction on this file.";
}

function fillOf(d: SimNode) {
  if (d.unidentified) return "#fdf4e6";
  if (d.sev) return "#fbeceb";
  return "#f9faf7";
}

function strokeOf(d: SimNode) {
  if (d.unidentified) return "#8a5a12";
  if (d.sev) return "#b3261e";
  return "#dee2de";
}

export function ForceBubbleMap({ medList, flags }: { medList: MedItem[]; flags: Flag[] }) {
  const host = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const graphKey = `${medList.map(m => `${m.id}:${m.term}`).join(",")}|${flags.map(f => f.id).join(",")}`;

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    let cancelled = false;
    let dispose = () => {};

    void import("d3").then(d3 => {
      if (cancelled || !host.current) return;
      dispose = mountForceGraph(d3, host.current, medList, flags, uid);
    });

    return () => {
      cancelled = true;
      dispose();
    };
  }, [graphKey, medList, flags, uid]);

  return <div ref={host} className="force-bubble-map min-h-[360px] w-full overflow-hidden rounded-2xl" />;
}

function mountForceGraph(
  d3: typeof import("d3"),
  root: HTMLDivElement,
  medList: MedItem[],
  flags: Flag[],
  uid: string,
) {
  root.replaceChildren();

  const nodes: SimNode[] = medList.map((m, i) => {
    const sev = worstTouching(m.id, flags);
    const angle = (Math.PI * 2 * i) / Math.max(medList.length, 1) - Math.PI / 2;
    return {
      id: m.id,
      label: shortLabel(m.term),
      body: nodeBody(m.id, medList, flags),
      r: sev === "high" ? 30 : sev === "moderate" ? 24 : 18,
      sev,
      unidentified: m.term === "unidentified",
      x: WIDTH / 2 + 118 * Math.cos(angle),
      y: HEIGHT / 2 + 86 * Math.sin(angle),
    };
  });

  const links: SimLink[] = flags
    .filter(f => nodes.some(n => n.id === f.a) && nodes.some(n => n.id === f.b))
    .map(f => ({
      source: f.a,
      target: f.b,
      severity: f.severity,
    }));

  let selected: string | null = null;

  const simulation = d3
    .forceSimulation(nodes)
    .alpha(0.5)
    .alphaDecay(0.06)
    .velocityDecay(0.64)
    .force(
      "link",
      d3
        .forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(d => (d.severity === "high" ? 120 : 140))
        .strength(0.7),
    )
    .force("charge", d3.forceManyBody().strength(-280))
    .force("center", d3.forceCenter(WIDTH / 2, HEIGHT / 2).strength(0.16))
    .force("x", d3.forceX(WIDTH / 2).strength(0.05))
    .force("y", d3.forceY(HEIGHT / 2).strength(0.05))
    .force(
      "collide",
      d3.forceCollide<SimNode>().radius(d => d.r + 22).iterations(2),
    )
    .on("tick", ticked)
    .on("end", pinAll);

  const freezeTimer = window.setTimeout(pinAll, 1600);

  const svg = d3
    .create("svg")
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("role", "img")
    .attr("aria-label", "Force-directed bubble map of medicines and flags")
    .attr("class", "h-auto w-full")
    .style("max-width", "100%")
    .style("height", "auto")
    .style("display", "block")
    .style("background", "#f9faf7")
    .style("cursor", "default");

  const defs = svg.append("defs");
  const shadow = defs
    .append("filter")
    .attr("id", `bubble-shadow-${uid}`)
    .attr("x", "-30%")
    .attr("y", "-30%")
    .attr("width", "160%")
    .attr("height", "160%");
  shadow
    .append("feDropShadow")
    .attr("dx", 0)
    .attr("dy", 1.2)
    .attr("stdDeviation", 1.6)
    .attr("flood-color", "#2c2c2c")
    .attr("flood-opacity", 0.12);

  const scene = svg.append("g");

  const zoom = d3
    .zoom<SVGSVGElement, undefined>()
    .scaleExtent([1, 4])
    .filter(() => false)
    .on("zoom", event => {
      scene.attr("transform", event.transform.toString());
    });

  svg.call(zoom);

  const link = scene
    .append("g")
    .attr("stroke-linecap", "round")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", d => (d.severity === "high" ? "#b3261e" : "#8a5a12"))
    .attr("stroke-opacity", 0.85)
    .attr("stroke-width", d => (d.severity === "high" ? 2.5 : 1.5));

  const node = scene
    .append("g")
    .selectAll<SVGGElement, SimNode>("g")
    .data(nodes)
    .join("g")
    .attr("class", "bubble-node")
    .style("cursor", "pointer")
    .call(
      d3
        .drag<SVGGElement, SimNode>()
        .container(() => scene.node() as SVGGElement)
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended),
    );

  node
    .append("circle")
    .attr("class", "bubble-core")
    .attr("r", d => d.r)
    .attr("fill", fillOf)
    .attr("stroke", strokeOf)
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", d => (d.unidentified ? "4 3" : null))
    .attr("filter", `url(#bubble-shadow-${uid})`);

  const label = node
    .append("text")
    .attr("class", "bubble-name")
    .text(d => d.label)
    .attr("text-anchor", "middle")
    .attr("dy", d => d.r + 14)
    .attr("font-size", 11)
    .attr("fill", "#2c2c2c")
    .style("pointer-events", "none");

  const card = node
    .append("foreignObject")
    .attr("class", "bubble-card")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 0)
    .attr("height", 0)
    .style("overflow", "visible")
    .style("pointer-events", "none")
    .style("opacity", 0);

  card.append("xhtml:div").attr("class", "bubble-inner").html(d => {
    const title = d.label;
    const body = d.body;
    return `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p>`;
  });

  node.each(function (d) {
    this.addEventListener("click", event => {
      event.stopPropagation();
      applySelect(selected === d.id ? null : d.id);
    });
  });

  svg.on("click", event => {
    const t = event.target as Element | null;
    if (t?.closest(".bubble-node")) return;
    applySelect(null);
  });

  function pinAll() {
    for (const n of nodes) {
      n.fx = n.x;
      n.fy = n.y;
      n.vx = 0;
      n.vy = 0;
    }
  }

  function ticked() {
    link
      .attr("x1", d => asNode(d.source).x ?? 0)
      .attr("y1", d => asNode(d.source).y ?? 0)
      .attr("x2", d => asNode(d.target).x ?? 0)
      .attr("y2", d => asNode(d.target).y ?? 0);
    node.attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`);
  }

  function radiusOf(d: SimNode) {
    return selected === d.id ? OPEN_R : d.r;
  }

  function paintSelection() {
    node.classed("is-open", d => d.id === selected);
    node.classed("is-dim", d => selected != null && d.id !== selected);
    link.classed("is-dim", d => {
      if (!selected) return false;
      return asNode(d.source).id !== selected && asNode(d.target).id !== selected;
    });

    node
      .select<SVGCircleElement>("circle.bubble-core")
      .transition()
      .duration(520)
      .attr("r", radiusOf);

    label
      .transition()
      .duration(220)
      .style("opacity", d => (selected === d.id ? 0 : 1));

    card
      .attr("x", d => (selected === d.id ? -INNER / 2 : 0))
      .attr("y", d => (selected === d.id ? -INNER / 2 : 0))
      .attr("width", d => (selected === d.id ? INNER : 0))
      .attr("height", d => (selected === d.id ? INNER : 0))
      .transition()
      .duration(280)
      .style("opacity", d => (selected === d.id ? 1 : 0));
  }

  function zoomTo(d: SimNode | null) {
    const svgNode = svg.node();
    if (!svgNode) return;
    if (!d) {
      svg.transition().duration(560).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity);
      return;
    }
    const k = (Math.min(WIDTH, HEIGHT) * 0.28) / OPEN_R;
    const x = WIDTH / 2 - k * (d.x ?? 0);
    const y = HEIGHT / 2 - k * (d.y ?? 0);
    svg
      .transition()
      .duration(640)
      .ease(d3.easeCubicInOut)
      .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(k));
  }

  function applySelect(id: string | null) {
    selected = id;
    const d = nodes.find(n => n.id === id) ?? null;
    paintSelection();
    zoomTo(d);
  }

  function dragstarted(this: SVGGElement, event: D3DragEvent<SVGGElement, SimNode, SimNode>) {
    if (selected) return;
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: D3DragEvent<SVGGElement, SimNode, SimNode>) {
    if (selected) return;
    event.subject.fx = event.x;
    event.subject.fy = event.y;
    event.subject.x = event.x;
    event.subject.y = event.y;
    ticked();
  }

  function dragended(this: SVGGElement, event: D3DragEvent<SVGGElement, SimNode, SimNode>) {
    if (selected) return;
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  root.append(svg.node()!);

  return () => {
    window.clearTimeout(freezeTimer);
    simulation.stop();
    svg.on("click", null);
    svg.on(".zoom", null);
    root.replaceChildren();
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

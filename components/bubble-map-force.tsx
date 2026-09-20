"use client";

import { useEffect, useId, useRef } from "react";
import type { D3DragEvent, SimulationLinkDatum, SimulationNodeDatum } from "d3";
import type { Flag, MedItem } from "@/lib/types";
import { displayOf, unidentifiedAsk } from "@/lib/vocab";

const WIDTH = 720;
const HEIGHT = 460;
const OPEN_R = 140;
const INNER = OPEN_R * 1.5;

type SimNode = SimulationNodeDatum & {
  id: string;
  label: string;
  body: string;
  innerHtml: string;
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
  if (hits.length) return oneLine(hits[0].reason);
  if (med.term === "unidentified") {
    return unidentifiedAsk(med.herWords);
  }
  return "No cited interaction on this file.";
}

function hasArabic(s: string) {
  return /[\u0600-\u06FF]/.test(s);
}

function unidentifiedAskHtml(herWords: string | null) {
  const x = herWords?.replace(/\s+/g, " ").trim();
  if (!x) return escapeHtml(unidentifiedAsk(null));
  if (hasArabic(x)) {
    return `Detected some<br><span class="urdu">${escapeHtml(x)}</span><br>What is it?`;
  }
  return `Detected some ${escapeHtml(x)}. What is it?`;
}

function nodeInnerHtml(id: string, medList: MedItem[], flags: Flag[]) {
  const med = medList.find(m => m.id === id);
  const body = nodeBody(id, medList, flags);
  if (med?.term === "unidentified") {
    return `<strong>unidentified</strong><p>${unidentifiedAskHtml(med.herWords)}</p>`;
  }
  return `<strong>${escapeHtml(shortLabel(med?.term ?? id))}</strong><p>${escapeHtml(body)}</p>`;
}

function fillOf(d: SimNode) {
  if (d.unidentified) return "#fdf4e6";
  if (d.sev) return "#fbeceb";
  return "#fefffc";
}

function strokeOf(d: SimNode) {
  if (d.unidentified) return "#8a5a12";
  if (d.sev) return "#b3261e";
  return "#cfd4cc";
}

function wirePath(a: SimNode, b: SimNode) {
  const x1 = a.x ?? 0;
  const y1 = a.y ?? 0;
  const x2 = b.x ?? 0;
  const y2 = b.y ?? 0;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const sag = Math.min(22, 8 + Math.hypot(x2 - x1, y2 - y1) * 0.06);
  return `M${x1},${y1} Q${mx},${my + sag} ${x2},${y2}`;
}

export function ForceBubbleMap({ medList, flags }: { medList: MedItem[]; flags: Flag[] }) {
  const host = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const graphKey = `${medList.map(m => `${m.id}:${m.term}:${m.herWords ?? ""}`).join(",")}|${flags.map(f => f.id).join(",")}`;

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

  return <div ref={host} className="force-bubble-map min-h-[380px] w-full overflow-hidden rounded-2xl" />;
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
      innerHtml: nodeInnerHtml(m.id, medList, flags),
      r: sev === "high" ? 34 : sev === "moderate" ? 28 : 22,
      sev,
      unidentified: m.term === "unidentified",
      x: WIDTH / 2 + 128 * Math.cos(angle),
      y: HEIGHT / 2 + 94 * Math.sin(angle),
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
  let dragging = false;
  const pointer = { x: WIDTH / 2, y: HEIGHT / 2 };
  const pan = { x: 0, y: 0 };
  let raf = 0;

  const simulation = d3
    .forceSimulation(nodes)
    .alpha(0.48)
    .alphaDecay(0.055)
    .velocityDecay(0.66)
    .force(
      "link",
      d3
        .forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(d => (d.severity === "high" ? 132 : 152))
        .strength(0.72),
    )
    .force("charge", d3.forceManyBody().strength(-320))
    .force("center", d3.forceCenter(WIDTH / 2, HEIGHT / 2).strength(0.14))
    .force("x", d3.forceX(WIDTH / 2).strength(0.045))
    .force("y", d3.forceY(HEIGHT / 2).strength(0.045))
    .force(
      "collide",
      d3.forceCollide<SimNode>().radius(d => d.r + 26).iterations(2),
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
    .style("cursor", "default");

  const defs = svg.append("defs");
  const bg = defs
    .append("radialGradient")
    .attr("id", `paper-wash-${uid}`)
    .attr("cx", "50%")
    .attr("cy", "42%")
    .attr("r", "68%");
  bg.append("stop").attr("offset", "0%").attr("stop-color", "#fefffc");
  bg.append("stop").attr("offset", "100%").attr("stop-color", "#f3f5f2");

  const shadow = defs
    .append("filter")
    .attr("id", `bubble-shadow-${uid}`)
    .attr("x", "-40%")
    .attr("y", "-40%")
    .attr("width", "180%")
    .attr("height", "180%");
  shadow.append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 2.4).attr("flood-color", "#2c2c2c").attr("flood-opacity", 0.1);

  defs
    .append("clipPath")
    .attr("id", `bubble-clip-${uid}`)
    .append("circle")
    .attr("r", OPEN_R - 20);

  svg
    .append("rect")
    .attr("width", WIDTH)
    .attr("height", HEIGHT)
    .attr("fill", `url(#paper-wash-${uid})`);

  const panLayer = svg.append("g").attr("class", "bubble-pan");
  const scene = panLayer.append("g").attr("class", "bubble-scene");

  const zoom = d3
    .zoom<SVGSVGElement, undefined>()
    .scaleExtent([1, 5])
    .filter(() => false)
    .on("zoom", event => {
      scene.attr("transform", event.transform.toString());
    });

  svg.call(zoom);

  const link = scene
    .append("g")
    .attr("fill", "none")
    .attr("stroke-linecap", "round")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("stroke", d => (d.severity === "high" ? "#b3261e" : "#8a5a12"))
    .attr("stroke-opacity", 0.55)
    .attr("stroke-width", d => (d.severity === "high" ? 2.2 : 1.4));

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
    .attr("stroke-width", 1.4)
    .attr("stroke-dasharray", d => (d.unidentified ? "4 3" : null))
    .attr("filter", `url(#bubble-shadow-${uid})`);

  node
    .append("ellipse")
    .attr("class", "bubble-sheen")
    .attr("cx", 0)
    .attr("cy", d => -d.r * 0.32)
    .attr("rx", d => d.r * 0.42)
    .attr("ry", d => d.r * 0.22)
    .attr("fill", "#ffffff")
    .attr("opacity", 0.45)
    .style("pointer-events", "none");

  const label = node
    .append("text")
    .attr("class", "bubble-name")
    .text(d => d.label)
    .attr("text-anchor", "middle")
    .attr("dy", d => d.r + 16)
    .attr("font-size", 12)
    .attr("fill", "#2c2c2c")
    .style("pointer-events", "none");

  const cardLayer = node
    .append("g")
    .attr("class", "bubble-card-layer")
    .attr("clip-path", `url(#bubble-clip-${uid})`);

  const card = cardLayer
    .append("foreignObject")
    .attr("class", "bubble-card")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 0)
    .attr("height", 0)
    .style("overflow", "hidden")
    .style("pointer-events", "none")
    .style("opacity", 0);

  card.append("xhtml:div").attr("class", "bubble-inner").html(d => d.innerHtml);

  node.each(function (d) {
    this.addEventListener("click", event => {
      event.stopPropagation();
      applySelect(selected === d.id ? null : d.id);
    });
  });

  svg
    .on("click", event => {
      const t = event.target as Element | null;
      if (t?.closest(".bubble-node")) return;
      applySelect(null);
    })
    .on("pointermove", (event: PointerEvent) => {
      const [x, y] = d3.pointer(event, svg.node());
      pointer.x = x;
      pointer.y = y;
    })
    .on("pointerleave", () => {
      pointer.x = WIDTH / 2;
      pointer.y = HEIGHT / 2;
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
    link.attr("d", d => wirePath(asNode(d.source), asNode(d.target)));
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
    node.filter(d => d.id === selected).raise();

    node
      .select<SVGCircleElement>("circle.bubble-core")
      .transition()
      .duration(560)
      .attr("r", radiusOf);

    node
      .select<SVGEllipseElement>("ellipse.bubble-sheen")
      .transition()
      .duration(280)
      .style("opacity", d => (selected === d.id ? 0 : 0.45))
      .attr("cy", d => -radiusOf(d) * 0.34)
      .attr("rx", d => radiusOf(d) * 0.38)
      .attr("ry", d => radiusOf(d) * 0.18);

    label.transition().duration(200).style("opacity", d => (selected === d.id ? 0 : 1));

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
    if (!d) {
      svg.transition().duration(560).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity);
      return;
    }
    const k = (Math.min(WIDTH, HEIGHT) * 0.4) / OPEN_R;
    const x = WIDTH / 2 - k * (d.x ?? 0);
    const y = HEIGHT / 2 - k * (d.y ?? 0);
    svg
      .transition()
      .duration(680)
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
    dragging = true;
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
    dragging = false;
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function frame() {
    const factor = selected ? 0.028 : 0.055;
    const tx = dragging ? pan.x : (pointer.x - WIDTH / 2) * factor;
    const ty = dragging ? pan.y : (pointer.y - HEIGHT / 2) * factor;
    pan.x += (tx - pan.x) * 0.08;
    pan.y += (ty - pan.y) * 0.08;
    panLayer.attr("transform", `translate(${pan.x},${pan.y})`);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  root.append(svg.node()!);

  return () => {
    window.clearTimeout(freezeTimer);
    cancelAnimationFrame(raf);
    simulation.stop();
    svg.on("click", null).on("pointermove", null).on("pointerleave", null);
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

import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3";
import type { SimulationLinkDatum } from "d3";

// Structural, so one layout serves both a VisitReport and a PatientFile. The layout
// only ever needs an id per medicine and the pairs between them.
export type MapFlagInput = { id: string; a: string; b: string; severity: "high" | "moderate" };
export type MapNode<T extends { id: string } = { id: string }> = T & {
  x: number; y: number; r: number; fx?: number;
  severity: "high" | "moderate" | null;
};

// D3 owns only these disposable layout copies, never the report or its evidence.
export function layoutReportMap<T extends { id: string }>(meds: T[], flags: MapFlagInput[], width: number, height: number) {
  const narrow = width < 600;
  const columns = width < 340 ? 1 : 2;
  const nodes: MapNode<T>[] = meds.map((med, i) => {
    const touching = flags.filter(flag => flag.a === med.id || flag.b === med.id);
    const severity = touching.some(flag => flag.severity === "high") ? "high"
      : touching.length ? "moderate" : null;
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    return { ...med, severity, r: narrow ? severity === "high" ? 44 : severity ? 38 : 30 : severity === "high" ? 56 : severity ? 48 : 36,
      ...(narrow ? { fx: width * ((i % columns) + 0.5) / columns } : {}),
      x: narrow ? width * ((i % columns) + 0.5) / columns : Math.cos(angle) * Math.sqrt(i + 1) * 100,
      y: narrow ? Math.floor(i / columns) * 190 + 80 : Math.sin(angle) * Math.sqrt(i + 1) * 100 };
  });
  const ids = new Set(nodes.map(node => node.id));
  const links = flags.filter(flag => ids.has(flag.a) && ids.has(flag.b)).map(flag => ({ ...flag }));
  const simulationLinks: SimulationLinkDatum<MapNode<T>>[] = links.map(flag => ({ source: flag.a, target: flag.b }));
  const simulation = forceSimulation<MapNode<T>>(nodes).stop()
    .force("link", forceLink<MapNode<T>, SimulationLinkDatum<MapNode<T>>>(simulationLinks).id(node => node.id).distance(230).strength(narrow ? 0.015 : 0.45))
    .force("charge", forceManyBody().strength(-180))
    .force("x", forceX(0).strength(0.08))
    .force("y", forceY<MapNode<T>>((_, index) => narrow ? Math.floor(index / columns) * 190 + 80 : 0).strength(narrow ? 0.7 : 0.10))
    .force("collision", forceCollide<MapNode<T>>().radius(node => node.r + (narrow ? 40 : 62)).iterations(3));
  simulation.tick(240);
  simulation.stop();
  if (!nodes.length) return { nodes, links, width, height };
  const minX = Math.min(...nodes.map(node => node.x - node.r - 45));
  const minY = Math.min(...nodes.map(node => node.y - node.r - 25));
  const contentWidth = Math.max(...nodes.map(node => node.x + node.r + 45)) - minX;
  const contentHeight = Math.max(...nodes.map(node => node.y + node.r + 90)) - minY;
  const graphWidth = narrow ? width : Math.max(width, contentWidth);
  const graphHeight = Math.max(height, contentHeight);
  for (const node of nodes) {
    if (!narrow) node.x += -minX + (graphWidth - contentWidth) / 2;
    node.y += -minY + (graphHeight - contentHeight) / 2;
  }
  return { nodes, links, width: graphWidth, height: graphHeight };
}

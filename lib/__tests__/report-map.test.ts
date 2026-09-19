import { describe, expect, it } from "vitest";
import { layoutReportMap } from "@/lib/report-map";
import type { ReportMedItem } from "@/lib/visit-report";

const medicine = (id: string, term: string): ReportMedItem => ({
  id, term, name: term, herWords: "مریض کے الفاظ", role: "takes",
  source: { kind: "reviewed-urdu", excerpt: "مریض کے الفاظ" },
});
const meds = [medicine("m1", "metformin"), medicine("m2", "metformin"), medicine("m3", "bitter_gourd"), medicine("m4", "unidentified")];
const flag = { id: "f1", a: "m2", b: "m3", severity: "moderate" as const, reason: "Fixture reason", citation: "https://example.org/source" };

describe("report map evidence and layout", () => {
  it("keeps distinct mentions and attaches the cited edge to the exact medicine IDs", () => {
    const graph = layoutReportMap(meds, [flag], 800, 600);
    expect(graph.nodes.map(n => n.id)).toEqual(["m1", "m2", "m3", "m4"]);
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0]).toMatchObject({ id: "f1", a: "m2", b: "m3", citation: "https://example.org/source" });
    expect(graph.nodes.find(n => n.id === "m1")?.severity).toBe(null);
    expect(graph.nodes.find(n => n.id === "m2")?.severity).toBe("moderate");
    expect(graph.nodes.find(n => n.id === "m4")?.severity).toBe(null);
  });
  it("does not mutate report evidence when D3 lays out nodes and links", () => {
    const before = JSON.stringify({ meds, flag });
    layoutReportMap(meds, [flag], 360, 580);
    expect(JSON.stringify({ meds, flag })).toBe(before);
  });
  it("does not invent connections for no-match or unidentified-only reports", () => {
    const graph = layoutReportMap([medicine("m1", "unidentified")], [], 360, 580);
    expect(graph.links).toEqual([]);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].severity).toBe(null);
    expect(layoutReportMap([], [], 360, 580).nodes).toEqual([]);
  });
  it("keeps node labels inside a finite viewport for narrow and large reports", () => {
    for (const count of [1, 6, 100]) {
      const graph = layoutReportMap(Array.from({length: count}, (_, i) => medicine(`m${i + 1}`, "metformin")), [], 360, 580);
      expect(graph.nodes).toHaveLength(count);
      expect(graph.width).toBe(360);
      for (const node of graph.nodes) {
        expect(Number.isFinite(node.x) && Number.isFinite(node.y)).toBe(true);
        expect(node.x - node.r - 35).toBeGreaterThanOrEqual(0);
        expect(node.x + node.r + 35).toBeLessThanOrEqual(graph.width);
        expect(node.y - node.r).toBeGreaterThanOrEqual(0);
        expect(node.y + node.r + 80).toBeLessThanOrEqual(graph.height);
      }
    }
  });
});

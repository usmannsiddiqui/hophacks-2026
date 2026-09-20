import { describe, expect, it } from "vitest";
import file from "@/data/files/mw-1042.json";
import { fileToBubbleSource } from "@/lib/map-source";
import { itemDetail, itemLabel } from "@/lib/display";
import { validateFile } from "@/lib/validation";
import type { PatientFile } from "@/lib/types";

const f = validateFile(structuredClone(file));

describe("an unidentified item says what it is, in English", () => {
  it("is labelled Unidentified on the map, not described there", () => {
    const node = fileToBubbleSource(f).medList.find((m) => m.term === "unidentified")!;
    expect(itemLabel(node)).toBe("Unidentified");
  });

  it("carries an English description for the panel behind it", () => {
    const node = fileToBubbleSource(f).medList.find((m) => m.term === "unidentified")!;
    expect(itemDetail(node)).toMatch(/hakeem/i);
    // Her own words survive alongside it, for checking.
    expect(node.herWords).toBeTruthy();
  });

  it("a named medicine has no description to show — its name is the description", () => {
    const node = fileToBubbleSource(f).medList.find((m) => m.term === "metformin")!;
    expect(itemLabel(node)).toBe("Metformin");
    expect(itemDetail(node)).toBeNull();
  });

  it("falls back to a neutral English label when no description was written", () => {
    const bare = {
      ...f,
      medList: f.medList.map((m) =>
        m.term === "unidentified" ? { ...m, english: undefined } : m,
      ),
    } as PatientFile;
    const node = fileToBubbleSource(bare).medList.find((m) => m.term === "unidentified")!;
    expect(itemLabel(node)).toBe("Unidentified");
    expect(itemDetail(node)).toBeNull();
  });

  it("a document item has no words of hers, and that is allowed", () => {
    const node = fileToBubbleSource(f).medList.find((m) => m.term === "amlodipine")!;
    expect(node.herWords).toBeNull();
  });
});

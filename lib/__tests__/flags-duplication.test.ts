import { describe, expect, it } from "vitest";
import substances from "@/data/substances.json";
import { computeFlags } from "@/lib/flags";

const med = (id: string, term: string) => ({ id, term });
const table = (substances as { interactions: Array<{ a: string; b: string; source?: string }> }).interactions;

describe("two products, one active ingredient", () => {
  it("flags paracetamol taken twice over", () => {
    // Panadol for the fever and a flu sachet for the cold both normalise to
    // `acetaminophen`. Neither is wrong alone, which is how the overdose happens.
    const flags = computeFlags([med("m1", "acetaminophen"), med("m2", "acetaminophen")]);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("high");
    expect(flags[0].reason).toMatch(/paracetamol/i);
    expect(flags[0].citation).toBeTruthy();
  });

  it("flags two anti-inflammatories as one risk", () => {
    const flags = computeFlags([med("m1", "ibuprofen"), med("m2", "naproxen")]);
    expect(flags).toHaveLength(1);
    expect(flags[0].reason).toMatch(/anti-inflammator/i);
  });

  it("one paracetamol on its own is not a flag", () => {
    expect(computeFlags([med("m1", "acetaminophen")])).toEqual([]);
  });
});

describe("rows written against a drug class", () => {
  it("matches a medicine by its class, not only by its id", () => {
    // `warfarin + class:nsaid` names no specific drug. Ibuprofen has class `nsaid`,
    // so it has to be reachable through that row.
    const flags = computeFlags([med("m1", "warfarin"), med("m2", "ibuprofen")]);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("high");
  });

  it("prefers the specific row over the class row", () => {
    // Both `warfarin + aspirin` and a class row could match. The specific one says
    // more, so it wins.
    const flags = computeFlags([med("m1", "warfarin"), med("m2", "aspirin")]);
    expect(flags).toHaveLength(1);
    expect(flags[0].reason).toBe("Additive bleeding risk.");
  });

  it("does not invent a match between unrelated substances", () => {
    expect(computeFlags([med("m1", "omeprazole"), med("m2", "zinc")])).toEqual([]);
  });

  it("still refuses an uncited row, however serious", () => {
    // warfarin + st_johns_wort is major and real, but carries no source.
    const row = table.find(
      (r) =>
        (r.a === "warfarin" && r.b === "st_johns_wort") ||
        (r.b === "warfarin" && r.a === "st_johns_wort"),
    );
    expect(row, "the row should still exist").toBeTruthy();
    expect(row?.source, "if this gains a citation, update this test").toBeFalsy();
    expect(computeFlags([med("m1", "warfarin"), med("m2", "st_johns_wort")])).toEqual([]);
  });
});

describe("the interactions that carry a citation", () => {
  it("every flag produced anywhere still carries one", () => {
    const terms = [...new Set(table.flatMap((r) => [r.a, r.b]))].filter((t) => !t.startsWith("class:"));
    const all = computeFlags(terms.map((t, i) => med(`m${i + 1}`, t)));
    expect(all.length).toBeGreaterThan(0);
    for (const flag of all) expect(flag.citation, `${flag.a}+${flag.b}`).toBeTruthy();
  });
});

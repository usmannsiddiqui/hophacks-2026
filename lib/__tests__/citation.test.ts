import { describe, expect, it } from "vitest";
import { citationDetails } from "../citation";

describe("citationDetails", () => {
  it("extracts a link from the report's labelled citation", () => {
    expect(citationDetails("NHS — Warfarin: taking it with other medicines  https://www.nhs.uk/medicines/warfarin/")).toEqual({
      href: "https://www.nhs.uk/medicines/warfarin/", label: "NHS",
    });
  });
  it("labels a turmeric source without misidentifying it as bitter melon", () => {
    expect(citationDetails("https://www.mskcc.org/cancer-care/integrative-medicine/herbs/turmeric").label).toBe("Memorial Sloan Kettering");
  });
  it("keeps citations without a web address as text", () => {
    expect(citationDetails("Printed reference, page 12")).toEqual({ href: null, label: "Printed reference, page 12" });
  });
  it("does not give an unrelated hostname an authoritative publisher label", () => {
    expect(citationDetails("https://nhs.uk.example.com/reference").label).toBe("nhs.uk.example.com");
    expect(citationDetails("javascript:alert(1)").href).toBeNull();
  });
});

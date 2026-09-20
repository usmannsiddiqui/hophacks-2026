import { describe, it, expect } from "vitest";
import { regions, unmappedUnits, district, censusSource } from "./regions";
import { accessColor, ratePer10k, peoplePerListing, listingsToBenchmark, formatRate, WHO_FACILITY_BENCHMARK_PER_10K } from "./rates";

const units = [...regions.map(r => r.census), ...unmappedUnits.map(u => u.census)];
const total = (key: keyof (typeof units)[number]) => units.reduce((sum, c) => sum + Number(c[key]), 0);

describe("census figures attached to the tehsil boundaries", () => {
  it("gives every drawn region a census population, area and difficulty counts", () => {
    for (const region of regions) {
      expect(region.census.unit).toMatch(/Tehsil|Sub-Division/);
      expect(region.census.population2023).toBeGreaterThan(0);
      expect(region.census.areaKm2).toBeGreaterThan(0);
      expect(region.census.urban2023 + region.census.rural2023).toBe(region.census.population2023);
      expect(region.census.disability2023).toBeLessThanOrEqual(region.census.functionalLimitation2023);
      expect(region.census.functionalLimitation2023).toBeLessThanOrEqual(region.census.disabilityBase2023);
      expect(region.census.disabilityBase2023).toBeLessThanOrEqual(region.census.population2023);
    }
  });
  it("adds up to the published Gwadar district totals, including the unmapped unit", () => {
    expect(total("population2023")).toBe(district.population2023);
    expect(total("population2017")).toBe(district.population2017);
    expect(total("areaKm2")).toBe(district.areaKm2);
    expect(total("disabilityBase2023")).toBe(district.disabilityBase2023);
    expect(total("disability2023")).toBe(district.disability2023);
    expect(total("functionalLimitation2023")).toBe(district.functionalLimitation2023);
  });
  it("discloses Suntsar as a census unit without a polygon", () => {
    const suntsar = unmappedUnits.find(u => u.id === "suntsar");
    expect(suntsar?.census.population2023).toBe(20523);
    expect(suntsar?.reason).toMatch(/No polygon/);
    expect(regions.some(r => r.id === "suntsar")).toBe(false);
  });
  it("names its source tables", () => {
    expect(censusSource.tables.population).toMatch(/pbs\.gov\.pk/);
    expect(censusSource.tables.disability).toMatch(/pbs\.gov\.pk/);
  });
});

describe("listing rates", () => {
  it("expresses a count per 10,000 residents of the same boundary", () => {
    expect(ratePer10k(3, 74128)).toBeCloseTo(0.4047, 3);
    expect(ratePer10k(0, 74128)).toBe(0);
    expect(() => ratePer10k(1, 0)).toThrow(RangeError);
  });
  it("keeps a real zero red and colours by the WHO benchmark, never by raw count", () => {
    expect(accessColor(undefined)).toBe("#777d77");
    expect(accessColor(0)).toBe("#c34236");
    expect(accessColor(WHO_FACILITY_BENCHMARK_PER_10K - 0.01)).toBe("#de8a25");
    expect(accessColor(WHO_FACILITY_BENCHMARK_PER_10K)).toBe("#035352");
    // Three listings are plenty for a village but thin for Gwadar tehsil.
    expect(accessColor(ratePer10k(3, 12000))).toBe("#035352");
    expect(accessColor(ratePer10k(3, 147673))).toBe("#de8a25");
  });
  it("derives people-per-listing and the benchmark shortfall from census population", () => {
    expect(peoplePerListing(3, 74128)).toBe(24709);
    expect(peoplePerListing(0, 74128)).toBeUndefined();
    expect(listingsToBenchmark(74128)).toBe(15);
    expect(listingsToBenchmark(147673)).toBe(30);
  });
  it("formats small rates with one decimal and large ones as whole numbers", () => {
    expect(formatRate(0.4047)).toBe("0.4");
    expect(formatRate(12.4)).toBe("12");
  });
});

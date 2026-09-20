// Listing counts become comparable across tehsils only once divided by the people
// who live inside the same boundary. The denominator is the 2023 census population
// attached to each polygon; the numerator stays a Google listing count, so the
// result is "listings per 10,000 residents", not a facility or need measure.

// WHO Service Availability and Readiness Assessment (SARA) service-availability
// target: 2 health facilities per 10,000 population. Defined for health facilities;
// for pharmacies it is shown as a reference line only, since WHO sets no target.
export const WHO_FACILITY_BENCHMARK_PER_10K = 2;

export function ratePer10k(count: number, population: number) {
  if (!(population > 0)) throw new RangeError("population must be positive");
  return (count * 10000) / population;
}

// One listing for every N residents; undefined when nothing is listed.
export function peoplePerListing(count: number, population: number) {
  return count > 0 ? Math.round(population / count) : undefined;
}

// Listings a tehsil would need to reach the WHO benchmark, rounded up.
export function listingsToBenchmark(population: number) {
  return Math.ceil((population * WHO_FACILITY_BENCHMARK_PER_10K) / 10000);
}

// Red: nothing listed. Orange: listed but under the benchmark. Teal: at or above it.
// Gray: not checked, or Google could not answer. Colors are the outreach status
// palette, distinct from clinical flag colors (ADR 0006).
export function accessColor(rate?: number) {
  if (rate === undefined) return "#777d77";
  if (rate === 0) return "#c34236";
  return rate < WHO_FACILITY_BENCHMARK_PER_10K ? "#de8a25" : "#035352";
}

export function formatRate(rate: number) {
  return rate >= 10 ? rate.toFixed(0) : rate.toFixed(1);
}

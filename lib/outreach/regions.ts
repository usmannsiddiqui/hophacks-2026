import boundaries from "@/public/data/makran-tehsils.json";
import { settlements } from "./settlements";
export { categories, type AccessResult, type Category } from "./settlements";
export { accessColor, ratePer10k, peoplePerListing, listingsToBenchmark, formatRate, WHO_FACILITY_BENCHMARK_PER_10K } from "./rates";

// Pakistan Bureau of Statistics, Census 2023 (Table 1 population and area, Table 16
// disability and functional limitation), transcribed per tehsil. Figures travel with
// the boundary file so the download carries the same numbers the map shows.
export type CensusFigures = {
  unit: string;
  areaKm2: number;
  population2017: number;
  population2023: number;
  urban2023: number;
  rural2023: number;
  disabilityBase2023: number;
  disability2023: number;
  functionalLimitation2023: number;
};

// Published, simplified 2017 ADM3 boundaries. One shared ring drives display and queries.
export const regions = boundaries.features.map((feature) => {
  const boundary = feature.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
  const bounds = {
    south: Math.min(...boundary.map(p => p.lat)), north: Math.max(...boundary.map(p => p.lat)),
    west: Math.min(...boundary.map(p => p.lng)), east: Math.max(...boundary.map(p => p.lng)),
  };
  const census: CensusFigures = feature.properties.census;
  return { id: feature.properties.id, name: feature.properties.shapeName, boundary, bounds, census };
});
export type Region = (typeof regions)[number];

// Census units inside the district that have no polygon in the boundary source.
// They are disclosed, not drawn; their people are otherwise invisible on the map.
export const unmappedUnits = boundaries.unmapped.map((unit) => ({
  id: unit.id, name: unit.shapeName, reason: unit.reason, census: unit.census as CensusFigures,
}));
export const censusSource = boundaries.census;
export const district = boundaries.census.district;

export const pilotBounds = {
  south: Math.min(...regions.map(r => r.bounds.south)), north: Math.max(...regions.map(r => r.bounds.north)),
  west: Math.min(...regions.map(r => r.bounds.west)), east: Math.max(...regions.map(r => r.bounds.east)),
};
// Preserve existing settlement plans; a new region plan never silently replaces them.
export const planningLocations = [
  ...regions.map(r => ({ id: r.id, name: r.name, regionId: r.id })),
  ...settlements.map(s => ({ id: s.id, name: s.name, regionId: "pasni" })),
];

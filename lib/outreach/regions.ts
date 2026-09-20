import boundaries from "@/public/data/makran-tehsils.json";
import { settlements } from "./settlements";
export { accessColor, categories, type AccessResult, type Category } from "./settlements";

// Published, simplified 2017 ADM3 boundaries. One shared ring drives display and queries.
export const regions = boundaries.features.map((feature) => {
  const boundary = feature.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
  const bounds = {
    south: Math.min(...boundary.map(p => p.lat)), north: Math.max(...boundary.map(p => p.lat)),
    west: Math.min(...boundary.map(p => p.lng)), east: Math.max(...boundary.map(p => p.lng)),
  };
  return { id: feature.properties.id, name: feature.properties.shapeName, boundary, bounds };
});
export const pilotBounds = {
  south: Math.min(...regions.map(r => r.bounds.south)), north: Math.max(...regions.map(r => r.bounds.north)),
  west: Math.min(...regions.map(r => r.bounds.west)), east: Math.max(...regions.map(r => r.bounds.east)),
};
// Preserve existing settlement plans; a new region plan never silently replaces them.
export const planningLocations = [
  ...regions.map(r => ({ id: r.id, name: `${r.name} tehsil`, regionId: r.id })),
  ...settlements.map(s => ({ id: s.id, name: s.name, regionId: "pasni" })),
];

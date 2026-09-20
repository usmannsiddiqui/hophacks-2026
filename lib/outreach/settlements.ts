// GeoNames PK.zip, retrieved 2026-09-20; selected populated-place records.
// Adapted to name/id/WGS84 coordinates. CC BY 4.0, https://www.geonames.org/
export const AREA_REACH_METERS = 2000;
export const settlements = [
  {
    "id": "1168312",
    "name": "Pasni",
    "lat": 25.26302,
    "lng": 63.46921
  },
  {
    "id": "1337006",
    "name": "Huddazai",
    "lat": 25.26939,
    "lng": 63.41768
  },
  {
    "id": "1337089",
    "name": "Almas",
    "lat": 25.33356,
    "lng": 63.44215
  },
  {
    "id": "1169857",
    "name": "Mulaship",
    "lat": 25.33333,
    "lng": 63.51667
  },
  {
    "id": "1337123",
    "name": "Gondi",
    "lat": 25.23529,
    "lng": 63.37987
  },
  {
    "id": "11069218",
    "name": "Sindhi Paso",
    "lat": 25.3975,
    "lng": 63.4622
  }
] as const;
export type Settlement = (typeof settlements)[number];
export type Category = "medical" | "pharmacy";
export type AccessResult = { count: number; fetchedAt: string } | { error: string };
export const categories = { medical: "Medical care", pharmacy: "Pharmacies" } as const;
export function accessColor(count?: number) {
  return count === undefined ? "#777d77" : count === 0 ? "#c34236" : count <= 2 ? "#de8a25" : "#035352";
}

// Equal-size pilot sampling cells, not administrative or verified service boundaries.
// Closed counterclockwise geodesic hexagons, shared by display and provider query.
export function communityArea(center: {lat: number; lng: number}) {
  const radians = Math.PI / 180;
  const lat = center.lat * radians, lng = center.lng * radians;
  const distance = AREA_REACH_METERS / 6371000;
  const points = Array.from({length:6},(_,i)=>{
    const bearing = (90-i*60)*radians;
    const latitude = Math.asin(Math.sin(lat)*Math.cos(distance)+Math.cos(lat)*Math.sin(distance)*Math.cos(bearing));
    const longitude = lng + Math.atan2(Math.sin(bearing)*Math.sin(distance)*Math.cos(lat),Math.cos(distance)-Math.sin(lat)*Math.sin(latitude));
    return {lat:latitude/radians,lng:longitude/radians};
  });
  return [...points,{...points[0]}];
}

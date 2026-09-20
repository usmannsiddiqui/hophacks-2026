import { regions } from "./regions";
type Dependencies = { key?: string; fetcher?: typeof fetch; now?: () => number; limit?: number };
type Result = {status: number; body: {count?: number; fetchedAt?: string; error?: string}};
export function createAccessService({key, fetcher = fetch, now = Date.now, limit = 24}: Dependencies) {
  let windowStart = now(); let used = 0;
  return async (input: unknown): Promise<Result> => {
    const fail = (status: number, error: string): Result => ({status, body:{error}});
    if (!input || typeof input !== "object") return fail(400, "Choose a pilot region and category.");
    const {regionId, category} = input as Record<string, unknown>;
    const region = regions.find(s => s.id === regionId);
    if (!region || (category !== "medical" && category !== "pharmacy")) return fail(400, "Choose a pilot region and category.");
    if (!key) return fail(503, "The server map key is not configured yet.");
    if (now() - windowStart >= 60000) {windowStart = now(); used = 0;}
    if (used >= limit) return fail(429, "Request limit reached. Wait one minute, then try again.");
    used++;
    try {
      const response = await fetcher("https://areainsights.googleapis.com/v1:computeInsights", {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(12000),
        headers: {"Content-Type":"application/json", "X-Goog-Api-Key":key},
        body: JSON.stringify({insights:["INSIGHT_COUNT"],filter:{
          locationFilter:{customArea:{polygon:{coordinates:region.boundary.map(point=>({latitude:point.lat,longitude:point.lng}))}}},
          typeFilter:{includedTypes:category === "pharmacy" ? ["pharmacy"] : ["hospital","doctor"]},
          operatingStatus:["OPERATING_STATUS_OPERATIONAL"]
        }})
      });
      if (!response.ok) return fail(response.status === 429 ? 429 : 502,
        response.status === 403 ? "Google denied this request. Check the server key, API access and IP restriction." : "Google could not return a count. Please try again later.");
      const data = await response.json();
      const raw: unknown = data?.count;
      if (typeof raw !== "string" || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) return fail(502,"Google returned an unreadable count. Availability is unknown.");
      return {status:200, body:{count:Number(raw),fetchedAt:new Date(now()).toISOString()}};
    } catch {
      return fail(502,"Could not reach Google. Availability is unknown; try again.");
    }
  };
}

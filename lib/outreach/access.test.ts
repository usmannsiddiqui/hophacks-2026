import { describe, it, expect, vi } from "vitest";
import { createAccessService } from "./access";
const input = { settlementId: "1168312", category: "pharmacy" };
const upstream = (body: unknown, status = 200) => vi.fn(async () => Response.json(body, { status }));
describe("outreach count service", () => {
  it("keeps a real zero distinguishable from unavailable data", async () => {
    const result = await createAccessService({ key: "test", fetcher: upstream({ count: "0" }) })(input);
    expect(result.status).toBe(200);
    expect(result.body.count).toBe(0);
  });
  it.each([{}, {count: ""}, {count: "-1"}, {count: "2.5"}, {count: "9007199254740993"}])("rejects malformed Google counts %j", async body => {
    const result = await createAccessService({ key: "test", fetcher: upstream(body) })(input);
    expect(result.status).toBe(502);
    expect(result.body).not.toHaveProperty("count");
  });
  it("does not leak upstream errors or the secret key", async () => {
    const result = await createAccessService({ key: "private-value", fetcher: upstream({error: {message: "private-value"}}, 403) })(input);
    expect(result.status).toBe(502);
    expect(JSON.stringify(result.body)).not.toContain("private-value");
    expect(result.body).not.toHaveProperty("count");
  });
  it("never queries arbitrary locations or categories", async () => {
    const fetcher = upstream({count:"2"});
    const service = createAccessService({key:"test", fetcher});
    for (const invalid of [null, {}, {...input, settlementId:"unknown"}, {...input, category:"restaurant"}]) {
      expect((await service(invalid)).status).toBe(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses calls without server configuration", async () => {
    const fetcher = upstream({count:"2"});
    expect((await createAccessService({key:"", fetcher})(input)).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses the selected settlement and a fixed operational pharmacy filter", async () => {
    const fetcher = upstream({count:"1"});
    await createAccessService({key:"test", fetcher})(input);
    const init = (fetcher.mock.calls as unknown as [string, RequestInit][])[0][1];
    const body = JSON.parse(init.body as string);
    expect(body.filter.locationFilter).not.toHaveProperty("circle");
    const ring = body.filter.locationFilter.customArea.polygon.coordinates;
    expect(ring).toHaveLength(7);
    expect(ring[0]).toEqual(ring[6]);
    expect(ring[0].longitude).toBeCloseTo(63.4891, 3);
    expect(ring[0].latitude).toBeCloseTo(25.26302, 3);
    let signedArea = 0;
    for(let i=0;i<6;i++) signedArea += ring[i].longitude*ring[i+1].latitude-ring[i+1].longitude*ring[i].latitude;
    expect(signedArea).toBeGreaterThan(0);
    expect(body.filter.typeFilter.includedTypes).toEqual(["pharmacy"]);
    expect(body.filter.operatingStatus).toEqual(["OPERATING_STATUS_OPERATIONAL"]);
    expect(init.cache).toBe("no-store");
  });
  it("bounds upstream spend and allows requests again after the window", async () => {
    let time = 0;
    const fetcher = upstream({count:"1"});
    const service = createAccessService({key:"test", fetcher, now:()=>time, limit:2});
    await service(input); await service(input);
    expect((await service(input)).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(2);
    time=60001;
    expect((await service(input)).status).toBe(200);
  });
  it("reports network failure without substituting zero", async () => {
    const result=await createAccessService({key:"test",fetcher:async()=>{throw new Error("offline")}})(input);
    expect(result.status).toBe(502);
    expect(result.body).not.toHaveProperty("count");
  });
});

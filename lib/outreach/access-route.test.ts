import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/outreach/access", () => ({
  createAccessService: () => async () => ({status: 200, body: {count: 14}}),
}));
import { POST } from "@/app/api/outreach/access/route";

function request(origin: string, host = "localhost:3002") {
  return new Request("http://0.0.0.0:3002/api/outreach/access", {
    method: "POST", headers: {origin, host, "content-type": "application/json"},
    body: JSON.stringify({regionId: "pasni", category: "medical"}),
  });
}

describe("map request origin", () => {
  it("accepts the browser host when Next uses its internal bind address", async () => {
    expect((await POST(request("http://localhost:3002"))).status).toBe(200);
  });
  it("accepts the phone's LAN host", async () => {
    expect((await POST(request("http://10.195.154.101:3002", "10.195.154.101:3002"))).status).toBe(200);
  });
  it.each(["http://other.example:3002", "http://localhost:3000", "null", "https://localhost:3002"])("rejects an unrelated origin %s", async origin => {
    expect((await POST(request(origin))).status).toBe(403);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import canned from "@/data/files/mw-1042.json";
import type { PatientFile } from "@/lib/types";

const store = vi.hoisted(() => ({
  current: null as PatientFile | null,
  saved: null as PatientFile | null,
}));
vi.mock("@/lib/files", () => ({
  getFile: async () => store.current,
  listFiles: async () => (store.current ? [store.current] : []),
  saveFile: async (file: PatientFile) => {
    store.saved = file;
  },
}));
import { PATCH } from "@/app/api/files/[id]/route";
import { POST } from "@/app/api/files/route";
const ctx = { params: Promise.resolve({ id: "MW-1042" }) };
const request = (body: unknown) =>
  new Request("http://localhost/api/files/MW-1042", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  store.current = structuredClone(canned) as PatientFile;
  store.saved = null;
});
describe("file API boundary", () => {
  it("rejects malformed JSON without writing", async () => {
    const response = await PATCH(
      new Request("http://localhost", { method: "PATCH", body: "{" }),
      ctx,
    );
    expect(response.status).toBe(400);
    expect(store.saved).toBeNull();
  });
  it("rejects invalid med provenance", async () => {
    const meds = structuredClone(canned.medList);
    meds[0].herWords = null;
    expect((await PATCH(request({ medList: meds }), ctx)).status).toBe(400);
  });
  it("rejects changed identity", async () => {
    expect((await PATCH(request({ id: "different" }), ctx)).status).toBe(400);
  });
  it("rejects unknown statuses", async () => {
    expect((await PATCH(request({ status: "approved" }), ctx)).status).toBe(
      400,
    );
  });
  it("rejects backwards transitions", async () => {
    expect((await PATCH(request({ status: "recording" }), ctx)).status).toBe(
      409,
    );
  });
  it("cannot sign without advice and reviewer", async () => {
    expect((await PATCH(request({ status: "signed" }), ctx)).status).toBe(400);
  });
  it("recomputes flags rather than trusting caller flags", async () => {
    const response = await PATCH(request({ flags: [] }), ctx);
    expect(response.status).toBe(200);
    expect(store.saved?.flags).toHaveLength(2);
  });
  it("will not accept a forged clinical flag on create", async () => {
    store.current = null;
    const response = await POST(
      request({ ...canned, status: "recording", flags: [{ id: "fake" }] }),
    );
    expect(response.status).toBe(201);
    expect(store.saved?.flags).toHaveLength(2);
  });
  it("does not overwrite an existing id on create", async () => {
    const response = await POST(
      request({ ...canned, status: "recording", flags: [] }),
    );
    expect(response.status).toBe(409);
    expect(store.saved).toBeNull();
  });
});

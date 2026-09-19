import { afterEach, expect, it, vi } from "vitest";
import { saveFile } from "@/lib/files";
import canned from "@/data/files/mw-1042.json";
import type { PatientFile } from "@/lib/types";
afterEach(() => vi.unstubAllEnvs());
it("does not report a saved file when storage is unavailable", async () => {
  vi.stubEnv("DATABASE_URL", "");
  await expect(saveFile(canned as PatientFile)).rejects.toMatchObject({
    status: 503,
  });
});

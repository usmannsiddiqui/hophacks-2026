import { getFile, saveFile } from "@/lib/files";
import { applyFilePatch } from "@/lib/validation";
import { apiError } from "@/lib/api-response";
import { rememberSignedVisit } from "@/lib/remember-visit";

type Ctx = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Ctx) {
  try {
    const file = await getFile((await params).id);
    return file
      ? Response.json(file, { headers: { "Cache-Control": "no-store" } })
      : Response.json({ error: "File not found" }, { status: 404 });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const current = await getFile((await params).id);
    if (!current)
      return Response.json({ error: "File not found" }, { status: 404 });
    const next = applyFilePatch(current, await req.json());
    await saveFile(next);
    // The one place a visit enters Backboard: the moment a pharmacist signs it. Status
    // only moves forward and signed files close, so this fires once per case, ever.
    // Deliberately not awaited — memory must never delay or fail a signature.
    if (current.status !== "signed" && next.status === "signed") {
      void rememberSignedVisit(next);
    }
    return Response.json(next);
  } catch (error) {
    return apiError(error);
  }
}

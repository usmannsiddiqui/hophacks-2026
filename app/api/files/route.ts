import { getFile, listFiles, saveFile } from "@/lib/files";
import { validateFile } from "@/lib/validation";
import { apiError } from "@/lib/api-response";
import { findAssistantId, linkCase, phoneHash } from "@/lib/patients";

export async function GET() {
  try {
    const all = await listFiles();
    return Response.json(
      all.map((f) => ({
        id: f.id,
        patient: f.patient,
        place: f.place,
        status: f.status,
        flags: f.flags.length,
        questionsOpen: f.questions.filter((q) => !q.answeredIn).length,
        createdAt: f.createdAt,
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const file = validateFile(body);
    if (file.status !== "new" && file.status !== "recording")
      return Response.json(
        { error: "A new file must start with intake" },
        { status: 400 },
      );
    if (await getFile(file.id))
      return Response.json({ error: "File already exists" }, { status: 409 });
    await saveFile(file);
    // An optional phone number identifies a returning patient. It is hashed here and the
    // raw number is never stored. `phone` is not part of PatientFile and the validator
    // drops it, so the frozen contract is untouched.
    const phone = typeof body?.phone === "string" ? body.phone : null;
    if (phone) {
      const hash = phoneHash(phone);
      if (hash) {
        // Reuse the assistant an earlier visit created. A new one is NOT minted here —
        // that happens lazily on the first signature, so abandoned intakes leave nothing.
        await linkCase(file.id, hash, await findAssistantId(hash));
      }
    }
    return Response.json(file, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

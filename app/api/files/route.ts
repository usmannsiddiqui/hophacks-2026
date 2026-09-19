import { getFile, listFiles, saveFile } from "@/lib/files";
import { validateFile } from "@/lib/validation";
import { apiError } from "@/lib/api-response";

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
    const file = validateFile(await req.json());
    if (file.status !== "new" && file.status !== "recording")
      return Response.json(
        { error: "A new file must start with intake" },
        { status: 400 },
      );
    if (await getFile(file.id))
      return Response.json({ error: "File already exists" }, { status: 409 });
    await saveFile(file);
    return Response.json(file, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

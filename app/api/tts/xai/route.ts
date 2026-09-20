import { z } from "zod";
import { parseXaiLang, speakWithXai } from "@/lib/voice/xai";
import { TranscriptionError } from "@/lib/voice/stt";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
const bodySchema = z.object({
  text: z.string().min(1).max(15_000),
  language: z.string(),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success)
      throw new TranscriptionError("Send the transcript text and language.", 400);
    const language = parseXaiLang(parsed.data.language);
    if (!language)
      throw new TranscriptionError("Choose Urdu or English for xAI speech.", 400);
    const spoken = await speakWithXai(parsed.data.text, language, request.signal);
    return new Response(Buffer.from(spoken.bytes), {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": spoken.contentType,
        "Content-Length": String(spoken.bytes.byteLength),
      },
    });
  } catch (error) {
    if (error instanceof TranscriptionError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers },
      );
    if (error instanceof SyntaxError)
      return Response.json(
        { error: "Send the transcript text and language." },
        { status: 400, headers },
      );
    return Response.json(
      { error: "xAI speech failed. Please try again." },
      { status: 500, headers },
    );
  }
}

import { readAudioFile } from "@/lib/voice/audio-request";
import { parseXaiLang, transcribeWithXai } from "@/lib/voice/xai";
import { TranscriptionError } from "@/lib/voice/stt";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const language = parseXaiLang(new URL(request.url).searchParams.get("lang"));
    if (!language)
      throw new TranscriptionError("Choose Urdu or English for the xAI transcript.", 400);
    return Response.json(
      await transcribeWithXai(await readAudioFile(request), language, request.signal),
      { headers },
    );
  } catch (error) {
    if (error instanceof TranscriptionError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers },
      );
    return Response.json(
      { error: "The audio request failed. Please try again." },
      { status: 500, headers },
    );
  }
}

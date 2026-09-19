import { MAX_AUDIO_BYTES, isSupportedAudio } from "@/lib/audio";
import { transcribeAudio, TranscriptionError } from "@/lib/transcription";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BODY_BYTES = MAX_AUDIO_BYTES + 64 * 1024;
const headers = { "Cache-Control": "no-store" };
async function readAudio(request: Request): Promise<File> {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    throw new TranscriptionError("Send a recorded audio file.", 400);
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
    throw new TranscriptionError("Audio must be smaller than 4 MiB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new TranscriptionError("An audio file is required.", 400);
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new TranscriptionError("Audio must be smaller than 4 MiB.", 413);
      }
      chunks.push(new Uint8Array(value));
    }
  } finally {
    reader.releaseLock();
  }
  let form: FormData;
  try {
    form = await new Response(new Blob(chunks), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new TranscriptionError("The audio upload could not be read.", 400);
  }
  const audio = form.get("audio");
  if (!(audio instanceof File) || !audio.size)
    throw new TranscriptionError("Record or select an audio file first.", 400);
  if (audio.size > MAX_AUDIO_BYTES)
    throw new TranscriptionError("Audio must be smaller than 4 MiB.", 413);
  if (!isSupportedAudio(audio.type))
    throw new TranscriptionError("Use WebM, MP4, Ogg, WAV or MP3 audio.", 415);
  return audio;
}
export async function POST(request: Request) {
  try {
    return Response.json(
      await transcribeAudio(await readAudio(request), request.signal),
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

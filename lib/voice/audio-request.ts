import { MAX_AUDIO_BYTES, isSupportedAudio } from "@/lib/audio";
import { TranscriptionError } from "@/lib/voice/stt";

export const MAX_TRANSCRIBE_BODY_BYTES = MAX_AUDIO_BYTES + 64 * 1024;

export async function readAudioFile(request: Request): Promise<File> {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    throw new TranscriptionError("Send a recorded audio file.", 400);
  if (Number(request.headers.get("content-length")) > MAX_TRANSCRIBE_BODY_BYTES)
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
      if (bytes > MAX_TRANSCRIBE_BODY_BYTES) {
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

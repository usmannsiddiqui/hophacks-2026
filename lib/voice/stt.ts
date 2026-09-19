import type { Transcript } from "@/lib/audio";
import { ScribeError, transcribeScribe } from "./providers/scribe";

export class TranscriptionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function transcribeAudio(
  file: File,
  signal?: AbortSignal,
): Promise<Transcript> {
  if (!process.env.ELEVENLABS_API_KEY?.trim())
    throw new TranscriptionError(
      "Transcription is not configured. Add ELEVENLABS_API_KEY on the server.",
      503,
    );
  try {
    return await transcribeScribe(file, signal);
  } catch (error) {
    const kind = error instanceof ScribeError ? error.kind : "upstream";
    if (kind === "timeout")
      throw new TranscriptionError(
        "Transcription timed out. Your audio is still available to retry.",
        504,
      );
    if (kind === "busy")
      throw new TranscriptionError(
        "The transcription service is busy. Wait a moment, then retry.",
        429,
      );
    if (kind === "configuration")
      throw new TranscriptionError(
        "The transcription service key needs attention.",
        503,
      );
    if (kind === "no-speech")
      throw new TranscriptionError(
        "No speech was found. Record a clearer sample.",
        422,
      );
    if (kind === "wrong-language")
      throw new TranscriptionError(
        "This recording was not recognized as Urdu. Please check the audio.",
        422,
      );
    if (kind === "unreadable-audio")
      throw new TranscriptionError(
        "The audio could not be read. Try a new recording or another audio file.",
        422,
      );
    if (kind === "invalid-response")
      throw new TranscriptionError(
        "The transcription service returned an unreadable response. Try again.",
        502,
      );
    throw new TranscriptionError(
      "Transcription failed. Your audio is still available to retry.",
      502,
    );
  }
}

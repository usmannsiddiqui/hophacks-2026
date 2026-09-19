import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { z } from "zod";
import type { Transcript } from "./audio";

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const responseSchema = z.object({
  text: z.string().max(20000),
  languageCode: z.string().optional(),
  words: z
    .array(
      z.object({
        text: z.string(),
        type: z.string(),
        start: z.number().finite().nonnegative(),
        end: z.number().finite().nonnegative(),
      }),
    )
    .max(20000)
    .optional(),
});
export async function transcribeAudio(
  file: File,
  signal?: AbortSignal,
): Promise<Transcript> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key)
    throw new TranscriptionError(
      "Transcription is not configured. Add ELEVENLABS_API_KEY on the server.",
      503,
    );
  try {
    const client = new ElevenLabsClient({ apiKey: key });
    const result = responseSchema.safeParse(
      await client.speechToText.convert(
        {
          file,
          modelId: "scribe_v2",
          languageCode: "ur",
          diarize: false,
          tagAudioEvents: false,
        },
        { maxRetries: 0, timeoutInSeconds: 45, abortSignal: signal },
      ),
    );
    if (!result.success)
      throw new TranscriptionError(
        "The transcription service returned an unreadable response. Try again.",
        502,
      );
    if (!result.data.text.trim())
      throw new TranscriptionError(
        "No speech was found. Record a clearer sample.",
        422,
      );
    if (
      result.data.languageCode &&
      !["ur", "urd"].includes(result.data.languageCode)
    )
      throw new TranscriptionError(
        "This recording was not recognized as Urdu. Please check the audio.",
        422,
      );
    return {
      text: result.data.text,
      language: "ur",
      words: (result.data.words ?? [])
        .filter((w) => w.type === "word" && w.end >= w.start)
        .map(({ text, start, end }) => ({ text, start, end })),
    };
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    const upstream = error as { statusCode?: number; name?: string };
    if (upstream.name?.includes("Timeout") || upstream.name === "AbortError")
      throw new TranscriptionError(
        "Transcription timed out. Your audio is still available to retry.",
        504,
      );
    if (upstream.statusCode === 429)
      throw new TranscriptionError(
        "The transcription service is busy. Wait a moment, then retry.",
        429,
      );
    if ([401, 403].includes(upstream.statusCode ?? 0))
      throw new TranscriptionError(
        "The transcription service key needs attention.",
        503,
      );
    if ([400, 422].includes(upstream.statusCode ?? 0))
      throw new TranscriptionError(
        "The audio could not be read. Try a new recording or another audio file.",
        422,
      );
    throw new TranscriptionError(
      "Transcription failed. Your audio is still available to retry.",
      502,
    );
  }
}

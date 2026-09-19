import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { z } from "zod";
import type { Transcript } from "@/lib/audio";
import { parseLang } from "../lang";

const responseSchema = z.object({
  text: z.string().max(20_000),
  languageCode: z.string().nullish(),
  words: z.array(z.unknown()).max(20_000).nullish(),
});
const wordSchema = z.object({
  text: z.string(),
  type: z.string(),
  start: z.number().finite().nonnegative(),
  end: z.number().finite().nonnegative(),
});
export type ScribeFailureKind =
  | "invalid-response"
  | "no-speech"
  | "wrong-language"
  | "timeout"
  | "busy"
  | "configuration"
  | "unreadable-audio"
  | "upstream";
export class ScribeError extends Error {
  constructor(readonly kind: ScribeFailureKind) {
    super(`Scribe ${kind}`);
  }
}

export async function transcribeScribe(
  file: File,
  signal?: AbortSignal,
): Promise<Transcript> {
  try {
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY?.trim(),
    });
    const parsed = responseSchema.safeParse(
      await client.speechToText.convert(
        {
          file,
          modelId: "scribe_v2",
          languageCode: "ur",
          diarize: false,
          tagAudioEvents: false,
          timestampsGranularity: "word",
        },
        { maxRetries: 0, timeoutInSeconds: 45, abortSignal: signal },
      ),
    );
    if (!parsed.success) throw new ScribeError("invalid-response");
    const { text, languageCode, words } = parsed.data;
    if (!text.trim()) throw new ScribeError("no-speech");
    if (languageCode && parseLang(languageCode) !== "ur")
      throw new ScribeError("wrong-language");
    const validWords = (words ?? []).flatMap((word) => {
      const parsedWord = wordSchema.safeParse(word);
      if (!parsedWord.success) return [];
      const { text: wordText, type, start, end } = parsedWord.data;
      return type === "word" && end >= start
        ? [{ text: wordText, start, end }]
        : [];
    });
    return { text, language: "ur", words: validWords };
  } catch (error) {
    if (error instanceof ScribeError) throw error;
    const upstream = error as { name?: string; statusCode?: number };
    if (upstream.name?.includes("Timeout") || upstream.name === "AbortError")
      throw new ScribeError("timeout");
    if (upstream.statusCode === 429) throw new ScribeError("busy");
    if (upstream.statusCode === 401 || upstream.statusCode === 403)
      throw new ScribeError("configuration");
    if (upstream.statusCode === 400 || upstream.statusCode === 422)
      throw new ScribeError("unreadable-audio");
    throw new ScribeError("upstream");
  }
}

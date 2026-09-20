import { TranscriptionError } from "@/lib/voice/stt";
import { xaiApiKey } from "@/lib/voice/xai-key";
import {
  rewriteXaiTranscript,
  synthesizeXaiSpeech,
  transcribeXaiStt,
  XaiVoiceError,
  type XaiSttLang,
} from "@/lib/voice/providers/xai";

export type { XaiSttLang };

export type XaiTranscript = {
  text: string;
  language: XaiSttLang;
  words: { text: string; start: number; end: number }[];
};

function mapXaiError(error: unknown): never {
  const kind = error instanceof XaiVoiceError ? error.kind : "upstream";
  if (kind === "timeout")
    throw new TranscriptionError(
      "xAI timed out. Your audio is still available to retry.",
      504,
    );
  if (kind === "busy")
    throw new TranscriptionError(
      "xAI is busy. Wait a moment, then retry.",
      429,
    );
  if (kind === "configuration")
    throw new TranscriptionError(
      "xAI is not configured. Add XAI_API_KEY on the server.",
      503,
    );
  if (kind === "no-speech")
    throw new TranscriptionError(
      "No speech was found. Record a clearer sample.",
      422,
    );
  if (kind === "unreadable-audio")
    throw new TranscriptionError(
      "The audio or text could not be read. Try again.",
      422,
    );
  if (kind === "invalid-response")
    throw new TranscriptionError(
      "xAI returned an unreadable response. Try again.",
      502,
    );
  throw new TranscriptionError(
    "xAI failed. Your audio is still available to retry.",
    502,
  );
}

export function parseXaiLang(value: string | null): XaiSttLang | null {
  return value === "ur" || value === "en" ? value : null;
}

export async function transcribeWithXai(
  file: File,
  language: XaiSttLang,
  signal?: AbortSignal,
): Promise<XaiTranscript> {
  if (!xaiApiKey())
    throw new TranscriptionError(
      "xAI is not configured. Add XAI_API_KEY on the server.",
      503,
    );
  try {
    const result = await transcribeXaiStt(file, signal);
    return {
      text: await rewriteXaiTranscript(result.text, language, signal),
      language,
      words: result.words,
    };
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    mapXaiError(error);
  }
}

export async function speakWithXai(
  text: string,
  language: XaiSttLang,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (!xaiApiKey())
    throw new TranscriptionError(
      "xAI is not configured. Add XAI_API_KEY on the server.",
      503,
    );
  try {
    return await synthesizeXaiSpeech(text, language, signal);
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    mapXaiError(error);
  }
}

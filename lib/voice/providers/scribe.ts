// ElevenLabs Scribe v2 (batch). SDK: @elevenlabs/elevenlabs-js 2.68.

import { ElevenLabsClient, ElevenLabsError, ElevenLabsTimeoutError } from "@elevenlabs/elevenlabs-js";
import { parseLang, toIso3 } from "../lang";
import { SttError, type ProviderRequest, type ProviderResult } from "../types";

export const SCRIBE_MODELS = ["scribe_v2", "scribe_v2_medical"] as const;

let client: ElevenLabsClient | null = null;

export const hasScribeKey = () => Boolean(process.env.ELEVENLABS_API_KEY);

function scribe(): ElevenLabsClient {
  client ??= new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  return client;
}

export async function transcribeScribe(audio: Blob, req: ProviderRequest): Promise<ProviderResult> {
  const model = req.model ?? "scribe_v2";
  try {
    const res = await scribe().speechToText.convert({
      file: audio,
      modelId: model,
      languageCode: req.lang ? toIso3(req.lang) : undefined,
      keyterms: req.keyterms.length ? req.keyterms : undefined,
      // ADR 0007: speakers come from mic ownership and language, never from the voice.
      diarize: false,
      tagAudioEvents: false,
      timestampsGranularity: "word",
    }, { timeoutInSeconds: 40, maxRetries: 1 }); // the chain is the retry
    return {
      text: res.text.trim(),
      lang: parseLang(res.languageCode),
      languageCode: res.languageCode,
      languageProbability: res.languageProbability,
      seconds: res.audioDurationSecs ?? null,
      words: res.words
        .filter(w => w.type === "word")
        .map(w => ({ text: w.text, start: w.start ?? null, end: w.end ?? null, logprob: w.logprob })),
      model,
      source: "scribe",
    };
  } catch (err) {
    if (err instanceof ElevenLabsTimeoutError) throw new SttError("scribe", "timeout");
    if (err instanceof ElevenLabsError) throw new SttError("scribe", "upstream", err.statusCode, err.requestId, err.body);
    throw err;
  }
}

/** Single-use token for Scribe Realtime in the browser (stretch goal). Expires in 15 min. */
export async function scribeRealtimeToken(): Promise<string> {
  const { token } = await scribe().tokens.singleUse.create("realtime_scribe");
  return token;
}

// Gemini Flash as a transcriber, via audio understanding (generateText + an audio file part).
// Not gemini-3.5-transcribe: Google's dedicated STT model does not list Urdu. Flash does
// Urdu well (FLEURS Urdu 12.5% WER for Gemini Flash 2 on ElevenLabs' own chart).
//
// An LLM transcriber can "help": translate, tidy grammar, romanise, or invent words on
// silence. The prompt forbids all of it, and the chain in stt.ts rejects wrong-script or
// empty output, so a bad result falls through instead of reaching `herWords`.

import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { type SttLang } from "../lang";
import { SttError, type ProviderRequest, type ProviderResult } from "../types";

export const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"] as const;
const TIMEOUT_MS = 40_000;

const LANG_NAME: Record<SttLang, string> = { ur: "Urdu", hi: "Hindi", en: "English" };

const SYSTEM = `You are a verbatim speech transcriber at a pharmacy counter in Pakistan.
Write down exactly what is said, in the language it is said in.
- Urdu speech: Urdu script (Perso-Arabic, as in Nastaliq). Never Devanagari. Never Roman Urdu.
- Hindi speech: Devanagari. English speech: Latin script.
- Do not translate, summarise, explain, correct grammar, reorder or add anything.
- Write medicine, brand and remedy names as spoken, in the script of the surrounding speech.
- If a word is unclear, write your best guess of the sound. Never invent content.
- If there is no speech, return an empty text.`;

const schema = z.object({
  language: z.enum(["ur", "hi", "en", "other", "none"]).describe("Main language spoken"),
  text: z.string().describe("Verbatim transcript in the original language and script"),
});

export const hasGeminiKey = () => Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

function thinking(model: string): GoogleLanguageModelOptions["thinkingConfig"] {
  // Transcription needs no reasoning; keep latency down.
  return model.startsWith("gemini-2.5") ? { thinkingBudget: 0 } : { thinkingLevel: "minimal" };
}

export async function transcribeGemini(audio: Blob, req: ProviderRequest): Promise<ProviderResult> {
  const model = req.model ?? GEMINI_MODELS[0];
  const hints = [
    req.lang ? `Expected language: ${LANG_NAME[req.lang]}.` : "The speaker may use Urdu or English.",
    req.keyterms.length ? `Words that may occur: ${req.keyterms.join(", ")}.` : "",
    "Transcribe the audio.",
  ].filter(Boolean).join("\n");

  try {
    const { output } = await generateText({
      model: google(model),
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: hints },
          {
            type: "file",
            mediaType: audio.type.split(";")[0] || "audio/webm", // drop ";codecs=opus"
            data: new Uint8Array(await audio.arrayBuffer()),
          },
        ],
      }],
      output: Output.object({ schema }),
      // Temperature left at the default: Google advises against lowering it on Gemini 3.
      providerOptions: { google: { thinkingConfig: thinking(model) } satisfies GoogleLanguageModelOptions },
      maxRetries: 1, // the chain is the retry
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const lang = output.language === "ur" || output.language === "hi" || output.language === "en" ? output.language : null;
    return {
      text: output.text.trim(),
      lang,
      languageCode: output.language,
      languageProbability: null,
      seconds: null,
      words: [],
      model,
      source: "gemini",
    };
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new SttError("gemini", "timeout");
    }
    if (APICallError.isInstance(err)) {
      throw new SttError("gemini", "upstream", err.statusCode, undefined, err.responseBody?.slice(0, 500));
    }
    if (NoObjectGeneratedError.isInstance(err)) {
      throw new SttError("gemini", "upstream", undefined, undefined, `no structured output: ${err.text?.slice(0, 200)}`);
    }
    throw err;
  }
}

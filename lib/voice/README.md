# lib/voice — Scribe speech-to-text

The server transcription path is `/api/transcribe` → `stt.ts` → `providers/scribe.ts`.

xAI serves the follow-up questions after the English report (ADR 0009), not the first
recording. `/api/tts/xai` speaks a draft question in Urdu. `/api/transcribe/xai?lang=ur`
transcribes the patient's answer with Grok Voice Transcribe, then rewrites the Hindi
Devanagari it usually emits into Arabic-script Urdu (`lang=en` gives an English
translation instead). `providers/xai.ts` rejects a rewrite that still contains
Devanagari. Neither route replaces the Scribe VisitDraft transcript.
It fixes Scribe v2 to Urdu, requests word timestamps, disables diarization and audio-event
tagging, makes one provider attempt, and forwards the request abort signal with a 45-second
provider timeout. It does not use keyterm hints or transcription fallbacks.

The public response stays the `Transcript` type in `lib/audio.ts`. Provider text is
preserved exactly; only emptiness is checked with trimmed text. Explicit non-Urdu language
labels are rejected through `lang.ts`, while mixed Urdu and Latin drug names are accepted.
Invalid individual timestamp rows are dropped without discarding usable transcript text.

`__tests__/stt.test.ts` and `lib/__tests__/transcribe.test.ts` are offline. The live
fixture suite is opt-in and reads credentials only from the process environment:

```sh
SCRIBE_LIVE=1 ELEVENLABS_API_KEY=... pnpm test lib/voice
```

Without `SCRIBE_LIVE=1`, it performs no provider request. Enabling it without a key fails
clearly. Live output contains only the fixture filename and character error rate.

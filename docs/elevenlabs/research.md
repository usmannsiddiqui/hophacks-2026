# STT research (2026-09-19)

## 1. ElevenLabs Scribe

| Model | Mode | Notes |
|---|---|---|
| Scribe v2 | REST batch | 90+ languages, auto language detect (`language_code`, `language_probability`), keyterm prompting (1000 terms), word timestamps, diarization (32), up to 3 GB / 10 h. Accepts webm/mp3/wav/mp4. |
| Scribe v2 Realtime | WebSocket | ~150 ms, partial + committed transcripts, VAD, PCM 8-48 kHz or mu-law, 50 keyterms. A browser client needs a server-minted token; the API key must never reach the client. |
| Scribe v2 Medical | REST/WS | Clinical-audio variant, 18% fewer errors on clinical audio. Worth a test on drug names. |

**Biggest finding: Urdu is in Scribe's "Moderate" accuracy tier (25-50% WER).** ADR 0003
already names Hindi as the fallback, so the hour-0 decision is real, not a formality.
Measure it before building on it. (I did not verify which tier Hindi is in; check the
language table on the ElevenLabs STT page.)

Fit to our journey:
- **P2 monologue:** REST Scribe v2 on the finished recording. No streaming needed (ADR 0007: processed after it ends).
- **P3 live translate:** push-to-talk means short clips, so REST per turn with language detect is enough. Realtime WS is a stretch goal for the feel.
- **Keyterms:** feed drug and remedy names from `substances.json` (Panadol, Ciproxin, karela, hakeem...) to bias recognition. Cheap, and likely the best accuracy lever for us.
- No TTS (decided 2026-09-19), so Scribe is the whole ElevenLabs integration.

## 2. Scribe vs Gemini vs Grok

| | ElevenLabs Scribe v2 | Gemini 3.5 Transcribe | Grok Voice Transcribe 2.0 |
|---|---|---|---|
| Urdu | Supported, "Moderate" tier (25-50% WER) | Not documented for STT specifically; 85+ languages | **Not confirmed** in any source found; "dozens", formatting documented for 25 |
| Mode | batch + realtime WS | batch-first, streaming added | streaming-first, batch attached |
| English WER | n/a here | 2.6% batch, 4.0% live | 2.7% final streaming |
| Latency | ~150 ms realtime | 0.25 s partial / 0.40 s final | 0.49 s |
| Price / 1000 min | see ElevenLabs pricing | $5.00 batch | $1.67 batch, $3.33 stream |
| Code-switching | auto detect per file | mixed language in one sentence | follows mid-recording switches |
| Keyterm bias | yes | prompt-based | not documented |
| Fits our stack | Sponsor prize, already planned | Already the one Gemini provider (ADR 0005) | New vendor + key; stack is "frozen" |
| Prize value | ElevenLabs x2 | Gemini/MLH | None (SpaceXAI prize needs a space spine, out of reach) |

Caveats: the head-to-head numbers are English-weighted and come from vendor or blog
sources. Grok Voice Transcribe 2.0 shipped Sep 18, so it is one day old. None of this
tells us Urdu quality on a noisy counter. Treat the table as a shortlist, not a verdict.

Strategic read:
- **Grok:** best price and speed on English, but Urdu is unconfirmed, it adds a vendor, and there is no prize. Only worth it if it wins the Urdu test outright.
- **Gemini:** already in the pipeline for translate + structure. It could do STT and translation in one multimodal call on Recording 1, but that gives up the "ElevenLabs Scribe" story and would make the ElevenLabs submission thin.
- **Scribe:** required for the ElevenLabs prizes (the most valuable per the handoff). Keep it primary unless its Urdu is unusable; in that case switch language (Hindi) before switching vendor.

Sources: elevenlabs.io/docs/overview/capabilities/speech-to-text, elevenlabs.io/realtime-speech-to-text,
x.ai/news/grok-voice-transcribe-2, orcarouter.ai blog "Grok Voice Transcribe 2.0 vs Gemini 3.5 Transcribe".

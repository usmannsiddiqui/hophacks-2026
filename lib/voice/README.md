# lib/voice — speech-to-text

Owner: Rayyan. Plan and research: `docs/elevenlabs/`. No TTS here (decided 2026-09-19).

Urdu transcription is the requirement. Three vendors sit behind one seam as a fallback
chain, and every result is checked before it is accepted.

| Vendor | Role | Why |
|---|---|---|
| Gemini Flash | **Her voice, primary** (verdict 2026-09-19) | Best documented Urdu (FLEURS 12.5% WER vs Scribe v1 14.4%, on ElevenLabs' own chart); already our LLM |
| ElevenLabs Scribe v2 | Her voice, fallback | Its own docs rate Urdu "Moderate" (25–50% WER); keeps the ElevenLabs integration |
| Grok | English turns only | Best on English; **Urdu not supported**, so it is never used on her voice |

Provisional until the bake-off on our own clips. If Scribe v2 wins, set `STT_CHAIN_URDU=scribe,gemini`; no code change.

## The chain (`stt.ts`)

| Call | Env | Default |
|---|---|---|
| `lang=ur`, `lang=hi`, or no `lang` (auto-detect) | `STT_CHAIN_URDU` | `gemini,scribe` |
| `lang=en` | `STT_CHAIN_ENGLISH` | `grok,scribe,gemini` |

Each provider is tried in order. The chain moves on when a provider has no key, errors,
times out (40 s each), or returns a transcript `accept.ts` rejects:

- the text is empty;
- it heard a different language from the one asked for;
- **it is in the wrong script** (e.g. Devanagari for Urdu, because spoken Urdu and Hindi are close). Urdu needs at least 60% Arabic-script letters, which leaves room for Latin brand names;
- it heard Hindi on auto-detect (live translate only expects Urdu or English).

Grok is removed from `STT_CHAIN_URDU` in code even if the env lists it. If no provider has
a key, the canned Recording 1 comes back. Every result carries `attempts`, showing what ran and why.

**After the bake-off:** put the Urdu winner first in `STT_CHAIN_URDU`. That is the only change needed.

## Tests

| Suite | Runs | Covers |
|---|---|---|
| `__tests__/stt.test.ts` | always, offline, vendors mocked | chain order, fallback on error / wrong script / Roman Urdu, Grok never on Urdu, canned without keys |
| `__tests__/gemini.live.test.ts` | opt-in, real Gemini API | real Urdu speech (2 FLEURS clips, `__tests__/fixtures/`) → Urdu script, ≤ 20% character error vs the human reference; no drug names invented from keyterm hints; Urdu detected without a hint; silence gives no transcript; chain picks Gemini first; `POST /api/transcribe` end to end |

Run the live suite once a key is in `.env.local` (a few cents):

```sh
# PowerShell
$env:STT_LIVE="1"; pnpm test lib/voice
# bash
STT_LIVE=1 pnpm test lib/voice
```

Without `STT_LIVE` it is skipped. With `STT_LIVE` but no key it fails on purpose, so a skip is never mistaken for a pass. Each test prints the reference, Gemini's transcript and the error rate.

## Files

| File | Does |
|---|---|
| `stt.ts` | `transcribe(audio, { lang?, keyterms?, only?, model? })`, the chain, and `chainFor()` |
| `accept.ts` | `rejectReason()`: the language and script check |
| `providers/scribe.ts` | ElevenLabs Scribe v2 (`@elevenlabs/elevenlabs-js`), plus the Realtime token |
| `providers/gemini.ts` | Gemini Flash audio understanding (`@ai-sdk/google`), with a strict verbatim prompt and structured output |
| `providers/grok.ts` | xAI Grok Voice Transcribe 2.0, plain fetch to `https://api.x.ai/v1/stt` |
| `types.ts` | `Transcript`, `Attempt`, `SttError`, `SttChainError` |
| `lang.ts` · `keyterms.ts` · `canned.ts` | Language codes · 29 bias terms from `substances.json` · no-key fallback |
| `__tests__/stt.test.ts` | Chain and acceptance tests, with vendors mocked (no network, no credits) |

## Env (`.env.local`)

```sh
ELEVENLABS_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
XAI_API_KEY=
# optional, defaults shown
STT_CHAIN_URDU=gemini,scribe
STT_CHAIN_ENGLISH=grok,scribe,gemini
```

`XAI_API_KEY` and the `STT_CHAIN_*` names still need adding to the shared `.env.example`.

## Route

`POST /api/transcribe`: multipart form data.

| Field | Values |
|---|---|
| `audio` | required. webm/opus from MediaRecorder, or any major format. Max 20 MB (Gemini's inline limit). |
| `lang` | `ur` for Recording 1 (P2). Omit for live translate (P3). `en` for English-only clips. |
| `keyterms` | `demo` (default) \| `none` |
| `provider`, `model` | Bake-off only: one provider, no fallback; the result is marked `rejected` if it fails the check. Grok needs `lang=en`. |

Errors: 400 bad input · 413 too large · 502 every provider failed (`attempts` in the body).
`maxDuration` is 130 s to cover the worst case of three providers timing out.

`POST /api/transcribe/token` returns a Scribe Realtime token (stretch goal; nothing calls it yet).

## Gemini-as-transcriber guardrails

An LLM can translate, tidy up, romanise, or invent words on silence. The prompt forbids all
of these, output is structured (`{ language, text }`), thinking is minimal for latency, and
the script check catches what the prompt misses. Temperature is left at the default
(Google advises against lowering it on Gemini 3). Gemini returns no word timings, so
`words` is empty and any `SourceRef.t` would be approximate.

## Grok caveats (docs.x.ai, 2026-09-19)

Urdu is not in its languages (Hindi is) · WebM is not a listed format (OGG, Opus and MKV are) · no confidence scores · a bad key returns 400.

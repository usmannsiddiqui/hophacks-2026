# STT implementation plan (proposal, not built)

Principle: measure Urdu quality first, keep the vendor behind one function, and build
the P2 path end to end before touching P3.

## Step 0 - Bake-off (about 45 min, decides everything)
1. Record 5 clips: 3 x 20 s Urdu (the script from `data/files/mw-1042.json`, read aloud, one on a phone in a noisy room), 1 x Hindi version of the same, 1 x English with drug names.
2. Throwaway script `lib/voice/bakeoff.ts` (run with `tsx`): same clip -> Scribe v2 (with and without keyterms) -> Gemini -> Grok only if it lists Urdu.
3. Score by eye against the known text: are the demo terms (Panadol, Ciproxin, karela juice, hakeem powder, sugar pill) recognised? Not a formal WER.
4. Decision rule: Scribe Urdu usable -> Urdu. Unusable -> Scribe Hindi (ADR 0003 fallback). Switch vendor only if Scribe fails in both and another engine clearly wins; record it in a new ADR (do not edit 0003).

## Step 1 - One seam
`lib/voice/stt.ts`: `transcribe(audio: Blob, opts: { lang?: "ur" | "hi" | "en"; keyterms?: string[] }) -> { text, language, words? }`. Scribe sits behind it, so swapping vendor is a one-file change.
`/api/transcribe` is a thin POST wrapper over it (multipart audio in, JSON out). Server-side key only.

## Step 2 - P2 monologue path
MediaRecorder (webm/opus) -> POST `/api/transcribe` (lang `ur`, keyterms from substances) -> Gemini translate (Stream A's helper, or a small one in `lib/voice/`) -> PATCH `/api/files/:id` writing `recordings[0]` (`urdu`, `english`, `seconds`). Test against the canned file shape.
Handle: mic permission denied, empty audio, API failure. Keep the audio blob, allow retry, offer typed fallback.

## Step 3 - P3 live translate
Push-to-talk clips through the same `transcribe()` with language detect on. `Turn.by` is derived from the returned language via `speakerFor` in `lib/types.ts` (invariant 1). The translation is shown as text, not spoken.
Stretch: Scribe Realtime WS with a server-minted token for live captions.

## Out of scope: TTS
No TTS in this workstream (decided 2026-09-19). Patient-facing Urdu is text on screen only.

## Order and cut line
0 -> 1 -> 2 (demo-critical) -> 3 -> stretch. If behind at 20:00, P3 falls back to typed input. P2 must never be cut.

## Coordination before writing code
- Confirm with Stream A who writes `/api/transcribe` and `/api/tts` (build-order lists them under A).
- Agree the Gemini translate helper's name and location so we do not both write it.
- Any new package goes through one person (`@elevenlabs/elevenlabs-js` is already installed).
- Branch `voice-pipeline` off latest `main`; no force-push; small PRs.

## Open questions
- Which ElevenLabs Urdu voice, and does v3 handle Nastaliq-script input cleanly?
- Is Scribe Realtime worth the token endpoint for the demo, or is REST push-to-talk enough?
- Do we test Scribe v2 Medical for drug names?

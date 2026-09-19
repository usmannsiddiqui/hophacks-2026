# Urdu voice capture implementation plan

> Execute inline with test-driven development and verification-before-completion.

**Goal:** A volunteer starts a visit, records a patient's Urdu account, checks the Scribe transcript and saves a local draft.
**Architecture:** /visit/new is a new outreach entry point. Browser capture and a bounded same-origin /api/transcribe route are separate from the existing PatientFile contract. The server holds the ElevenLabs key. A VisitDraft preserves original and corrected Urdu without inventing an English translation.
**Stack:** Existing Next.js, React, TypeScript, ElevenLabs SDK and Vitest; no new dependency.
**Spec:** Approved outreach wireframes and conversation; ADR 0008. Gemini remains the sole analytical provider, per ADR 0005. No xAI package.

## Constraints
- Fictional rehearsal until access control and clinical review exist.
- Initial patient-only recording; Urdu; no diarization or speaker inference.
- 3-minute browser session limit / 4 MiB server upload cap, bounded request body, supported browser audio MIME types.
- No automatic paid retries; keep audio for deliberate retry while page stays open.
- Empty audio/transcript, missing key, provider rate limit, timeout and malformed response produce explicit errors.
- Review text may be corrected; raw Scribe text must stay separate and immutable.
- Draft is saved in this browser tab only. Never label it sent, structured or shared.
- Minimal UI copy; capture and transcript review follow approved user-facing wireframes.

## Task 1: bounded Scribe API
Files: lib/audio.ts; lib/transcription.ts; app/api/transcribe/route.ts; lib/__tests__/transcribe.test.ts.
- [x] Write route tests using real Request/FormData and mocked external provider boundary. Assert Urdu transcript and timestamps, missing/invalid/oversized audio, bad multipart, missing key, rate limit, timeout and empty speech.
- [x] Run tests red, implement, rerun green.
Interface: POST multipart audio => { text, language: "ur", words: [{text,start,end}] }. Never accepts a URL or client provider configuration.
Provider: ElevenLabsClient.speechToText.convert({ file, modelId: "scribe_v2", languageCode: "ur", diarize: false, tagAudioEvents: false }, { maxRetries: 0, timeoutInSeconds: 45 }).
Return no-store responses; never return provider error bodies or log audio/transcripts.

## Task 2: record and review a local visit
Files: lib/audio-capture.ts; lib/visit-draft.ts; components/voice-visit.tsx; app/visit/new/page.tsx; app/globals.css; components/intake.tsx.
- [x] Test microphone cleanup, pause/resume, nonempty recording and cancellation while permission is pending; test raw-vs-corrected draft and malformed saved data.
- [x] Implement patient setup -> capture/upload -> transcript review -> saved draft.
- [x] Release media tracks on stop, error, cancellation and unmount. Abort uploads on unmount; revoke playback URLs.
- [x] Display permission, unsupported browser, upload and provider failures with retry paths. Handle storage failures visibly.
- [x] Add a discoverable entry from the existing intake. Keep the sample walkthrough intact.

## Task 3: verify and share current context
- [x] Run application tests, lint, TypeScript and webpack production build.
- [x] Inspect real browser intake, missing-key behavior, supported audio upload and saved/recovery states where credentials permit. Report unavailable live-provider/microphone validation explicitly.
- [x] Update build order, glossary, contracts, README and pressure-test status. Export shared docs to Obsidian using the conflict-checked workflow.
- [x] Commit on voice-transcript-capture; draft PR #5 is stacked on judge-demo-journey (#4).

## Subsequent slice
Gemini through lib/llm.ts: translate and structure the reviewed Urdu into a validated case, recompute sourced flags, then connect asynchronous review. English-speaking volunteer interpretation and Urdu TTS follow the initial recording path.

Server duration validation and abuse controls are required before exposing the paid endpoint publicly.

## Verification results
44 tests passed; lint, TypeScript and webpack production build passed. Browser setup and capture controls were inspected. A direct multipart request confirmed the unconfigured-key response is 503. Browser file upload automation failed to attach the synthetic fixture, so upload UI, live microphone, successful paid transcription and browser review/recovery remain unverified; provider boundary and draft recovery are covered by automated tests.

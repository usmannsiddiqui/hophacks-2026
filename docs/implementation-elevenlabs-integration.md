# ElevenLabs branch integration plan

> Use subagent-driven-development for bounded reviews and one coordinated implementation task.

**Goal:** Merge Rayyan's ElevenLabs branch into voice-transcript-capture with its ancestry intact and preserve the approved outreach capture experience.
**Spec:** User integration request of 19 September 2026; ADRs 0001, 0003, 0005, 0007 and 0008; docs/specs/contracts.md outreach boundary.
**Architecture:** Retain the bounded /api/transcribe ingress and public Transcript contract. Use Rayyan's lib/voice/providers/scribe.ts behind one lib/voice/stt.ts service; remove duplicate lib/transcription.ts. Preserve the approved frontend, drafts and wireframes.
**Stack:** Existing Next.js/TypeScript/ElevenLabs SDK/Vitest; pnpm only.

## Global constraints
- Merge origin/ElevenLabs with a merge commit; preserve authorship and all teammate commits. Do not merge PRs #4 or #5 into main.
- POST /api/transcribe success remains {text, language: "ur", words: [{text,start,end}]}; original text is byte-for-byte preserved. Corrections stay in reviewedUrdu.
- Scribe v2 only; Urdu fixed on server; explicit word timestamps, diarize false, tagAudioEvents false, maxRetries 0, 45-second provider timeout and request abort signal. No automatic Gemini/Grok/canned fallback or provider/model client overrides.
- Retain 4 MiB audio and 4 MiB + 64 KiB actual multipart body limits, MIME allowlist, no-store, explicit 400/413/415/422/429/502/503/504 failures. No secret/provider body/transcript logging.
- Keep volunteer recording, pause/resume, transcript correction, saved visit, history, resource cleanup and user-controlled retries. No redesign or translation in this slice.
- Flags remain exclusively computed from the existing sourced interaction table.
- Do not access/use exposed credentials. Live test only after confirmation of a replacement key, and never output a key.

### Task 1: Scribe consolidation and regression validation
Owner: one implementation worker, no overlapping edits. Code scope: app/api/transcribe/**, lib/transcription.ts, lib/voice/**, lib/__tests__/transcribe.test.ts, lib/__tests__/visit-draft.test.ts, components/voice-visit.tsx (MIME filename correction only), lib/audio.ts if needed for that helper. No Git commit while the controller owns the pending merge.

- [x] Adapt Rayyan's Scribe provider in place to the fixed API request policy, exact raw text, safe response validation and error mapping; route -> lib/voice/stt.ts -> providers/scribe.ts. Remove duplicate lib/transcription.ts. Canonical public type remains lib/audio.ts Transcript.
- [x] Remove active Gemini/Grok/canned chain modules, chain types/config, and unused realtime token endpoint. Gemini translation/structuring is explicitly next, not a transcription fallback.
- [x] Reuse the language alias normalization and acceptance tests without the 60% script gate, which can reject legitimate mixed Urdu/Latin drug names. Empty or explicitly non-Urdu results fail; invalid individual timestamps are filtered, preserving usable original text.
- [x] Preserve route tests; add raw whitespace, nullable/invalid timestamp, Urdu alias, wrong-language, no automatic retry/fallback, no diagnostics leakage and unchanged response shape cases. Keep flag/capture/history regression suites.
- [x] Adapt teammate live Gemini tests into opt-in SCRIBE_LIVE=1 Scribe tests using the FLEURS WAVs and CER helper. Default suite never reads .env.local or contacts a provider. Opt-in without key fails clearly; only concise non-sensitive metrics. Preserve dataset attribution and add source/license links.
- [x] Correct WAV/MP3 upload filename extensions without changing visible UI. Add a focused pure helper test if useful.
- [x] Run tests red then green for changed requirements. Run full tests, lint and typecheck; report commands/results and exact code changes.

### Task 2: Integration review, browser verification and shared context
Controller owns .gitignore, docs/** outside lib/voice, context-files.json, README/CONTEXT and Git state. Review worker output against these constraints; delegated reviewers do not edit simultaneously.
- [x] Resolve .gitignore by retaining both local-ignore groups; keep bounded route contract during add/add conflict. Record actual ancestry in the merge commit.
- [x] Browser check approved setup/capture/upload/errors and retry where tool supports it. Run live Urdu fixtures only when replacement key is confirmed; otherwise record skipped validation without a success claim.
- [x] Update build order, integration status, contracts and source-of-truth docs. Import teammate docs before vault edits; export/check through context sync.
- [x] Run production build and appropriate final checks; independent final review.
- [x] Fetch again for teammate pushes, integrate any additions deliberately, verify ancestry, push branch and update existing draft PR #5.
- [x] Leave PR #4 targeting main and PR #5 targeting judge-demo-journey. After approval: merge #4 first, retarget #5 to main, then merge #5 with a merge commit; no squash/rebase.

## Completed integration

Merge commit `db99b32` has parents `46f2876` and Rayyan's `6156436`; all 12 teammate commits are retained. The branch is pushed and draft PR #5 updated, with neither PR merged into main. Final independent review found no blocking defects.

Validation: 62 tests passed and 3 live checks were skipped; lint, TypeScript and the webpack production build passed. Browser checks covered Urdu fixture upload, missing-key errors, deliberate retries and the 390px layout. No confirmed replacement key was available, so live transcription and the physical microphone remain unverified. PR #4's conflicts with main after concurrent PR #6 are documented for separate reconciliation.

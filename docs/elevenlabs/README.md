# ElevenLabs workstream

Original voice backend and Urdu fixtures: **Rayyan**, branch `ElevenLabs` (12 commits through `6156436`). Integrated into `voice-transcript-capture` for draft PR #5 using a merge commit; original authorship and ancestry are retained.

## Current integration

`/visit/new` follows the approved community-outreach journey: volunteer records the patient's Urdu account, reviews/corrects its transcript, and saves a tab-local visit. The patient needs no account or keyboard and need not wait for the remote pharmacist.

One bounded route calls one service: `/api/transcribe` → `lib/voice/stt.ts` → Rayyan's adapted `lib/voice/providers/scribe.ts`. Scribe v2 transcribes Urdu; Gemini translation and structuring are next. No active Grok, Gemini transcription fallback, canned response or realtime token endpoint is part of this slice.

Original Urdu stays separate from corrections. No diarization, speaker inference, provider/model selector or automatic paid retry. Missing keys and provider failures return explicit errors. See `lib/voice/README.md` and `docs/specs/contracts.md` for the executable boundary; `docs/pressure-test.md` records actual verification and remaining limitations.

## What was reused

Rayyan's Scribe adapter, language normalization, relevant acceptance coverage, FLEURS Urdu audio/reference fixtures, and live-test scoring logic. The old multi-provider tests are adapted to enforce Scribe-only failures and the approved frontend contract. His research/proposal remain marked historical below.

## Ownership and next steps

- Voice provider and fixtures: Rayyan (Stream B); integration coordinated on PR #5.
- Approved frontend, wireframes, table-based flags and outreach workflow remain intact.
- Next: reuse/reconcile Ahmad's Gemini structure work (PR #6, now on main) with this outreach flow; then shared review/persistence, Urdu TTS and volunteer delivery status. It has not been pulled into this Scribe-only branch.
- Paid provider validation requires a confirmed replacement ElevenLabs key. The exposed key must be revoked and is never used by this integration.

## Historical notes

`research.md` and `plan.md` preserve the pre-integration exploration. They do not override accepted ADRs or the current build order. In particular, old provider comparisons, counter-only journeys, language-based speaker inference and canned STT fallback are not current implementation instructions.

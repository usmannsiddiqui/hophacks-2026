# Pressure test: 19 September implementation passes

Read the external handoff, all sixteen supplied wireframe boards, repo ADRs and contracts,
and the GIC Claude design artifact. Handoff suggestions were treated as historical context,
not permission to reopen decisions or act outside the user's request.




## Live Scribe follow-up (19 September, ~17:50)

- User reported refreshing the ElevenLabs key with STT/TTS access. The configured key was copied privately into the ignored feature-worktree .env.local; no value was printed or committed.
- Dedicated opt-in Scribe suite passed all 4 checks: configuration, two real FLEURS Urdu fixture transcriptions under the existing CER threshold, and the offline scoring helper.
- Browser live flow observed: fictional visit → public Urdu WAV upload → successful Scribe transcript → Urdu correction with original separately visible → save → reload → start another visit → restore previous transcript.
- This supersedes the missing-key/live-unverified limitation in the initial integration report below. It does not establish medical vocabulary accuracy, noisy-room/physical-phone performance, or tested TTS playback. Revocation of the old key was not independently verified.
- TTS permission alone does not implement advice playback. Next feature integration remains reviewed Urdu → Gemini translation/structuring → sourced-table flags → remote pharmacist review, followed by approved Urdu advice/readback.

## Initial ElevenLabs merge integration verification

- Rayyan's source branch: origin/ElevenLabs at 6156436 (12 original commits). Integrated
  by merge commit into voice-transcript-capture; no cherry-pick/squash/rebase.
- One Scribe-only route/service/provider; missing keys and failures never substitute
  Gemini/Grok or a canned account. Existing bounded uploads and no-store/errors remain.
- 62 automated tests passed; 3 opt-in paid Scribe checks were skipped. ESLint, TypeScript
  and webpack production build passed. Context-sync regression suite: 3 passed.
- Independent backend, frontend-contract and test reviews informed integration; code
  review found no blocking issues. Fixed the stale language-helper commentary/exports.
- Browser: fictional volunteer setup, real FLEURS Urdu WAV upload (6 seconds), explicit
  missing-key error, deliberate retry with retained audio and no false review state.
  Phone-width 390x844 inspection showed no horizontal overflow.
- No confirmed replacement key was available, so no live Scribe request was made.
  Actual transcription quality/latency, successful browser transcript review/save and
  physical microphone remain unverified. Offline tests cover raw/corrected Urdu and history.
- The exposed credential was not reproduced, committed or used. Revocation and configuring
  a replacement remain the credential owner's responsibility.
- Approved design/wireframes, interaction table/flag computation, recording lifecycle
  and VisitDraft storage are unchanged. Frontend code change only corrects upload extensions.
- Original checkout's unrelated AGENTS.md and handoff edits remain untouched.
- Concurrent remote change: PR #6 put Ahmad's structure code on main (bfae2f8). This voice
  branch does not import it. PR #4 now reports conflicts with main; reconcile it before
  the eventual #4 → main, retarget #5 → main, merge-commit sequence. Neither PR was merged.

## Latest voice slice
- Implemented Scribe route, bounded audio uploads, explicit errors, microphone cleanup,
  pause/resume, three-minute browser session limit, upload fallback and transcript review.
- Original Scribe text is preserved separately from corrections. Previous tab-local drafts
  remain available when starting another visit.
- Fixed a review finding where delayed MediaRecorder finalization inflated duration and
  rejected a successful three-minute transcription.
- Server audio-size limits are enforced; media duration is checked only in the browser.
  Add server duration validation, access controls and rate limits before public exposure.
- No local keys were configured during implementation. Live Scribe quality, physical phone
  recording, Urdu accuracy, paid quota and latency remain unverified.
- Gemini remains the chosen analysis provider; no xAI dependency or fallback is installed.
- Existing sample /file routes remain the previous counter-oriented demo until migrated.

## Fixed in the initial walkthrough pass

| Finding | Consequence | Change |
|---|---|---|
| globals.css had starter colors, Arial, dark mode and undefined product tokens | Actual UI did not implement DESIGN.md despite the handoff saying it did | Restored light paper/ink tokens, Inter/Nastaliq, density, focus and responsive rules |
| All screens were placeholders | No judge could walk the product end to end | Built the explicitly labeled sample journey and Stream C review/report screens |
| saveFile returned success without a database | Newly created files disappeared | Return 503 for unconfigured persistence; browser-local sample mode is explicit |
| JSON casts were the entire API validation layer | Invalid provenance, forged flags, arbitrary identity changes and empty sign-offs | Runtime Zod validation and regression tests; recompute flags on POST and PATCH |
| “Forward-only” test only checked enum membership | It did not test backwards writes | Added API transition tests and post-signature immutability |
| Citation labels were vague institutions | Judge could not inspect evidence | Link the two supported rows to MSK and FDA; qualify bitter-melon wording |
| Old user journey contradicted ADRs | Team might build cut Backboard/chart/reminder features | Replaced it with current flow and explicit integration status |
| Review draft disappeared on refresh; recording answers were omitted from review/report | Pharmacist could lose work or miss an answer | Tab-local unsigned draft recovery and unified recording/turn answer display |
| Live queue failure hid browser-local samples | Rehearsal depended on database availability | Load sample cases independently and bound API request time |
| Shared context had no ownership or sync workflow | Duplicate vault/repo notes could drift | Allowlisted sync, two-sided conflict checks and explicit import/export |

## Must finish for the live hackathon demo

1. **Live voice/model work:** validate the implemented Scribe capture with a key, then implement Gemini normalization and translation and Urdu TTS.
   The current sample flow does not call those services. Typed fallback and playback error
   handling are implemented. An ElevenLabs prize submission must show the actual integration.
2. **Neon + HTTPS:** create database, configure environment, push schema, then exercise the
   same case on two devices. Browser-local sample persistence is only for one-browser rehearsal.
3. **Concurrent file updates:** PATCH currently reads and writes whole JSON. Two devices can
   overwrite each other's updates. Add optimistic concurrency or transactional field updates
   before relying on simultaneous counter/pharmacist editing.
4. **Clinical curation:** 143 terms / 105 rows, only 2 sourced rows. No-match is not clearance.
   Source existence does not validate an exact priority or establish a patient's diagnosis.
   Prioritize reviewed demo interactions over bulk-added citations.
5. **Urdu review:** have an Urdu-speaking teammate test actual audio and review the final
   clinical translation. Both language versions are required for signature; neither is
   currently generated automatically in the review form.

## Before any real-patient pilot

Public file routes and typed reviewer identity are not authentication or verified credentials.
The prototype is for fictional demonstrations. Add access controls, identity verification,
consent, retention rules and clinical governance before entering real patient information.
These were cut from the hackathon scope and are not represented as implemented.

## Deliberately deferred

Document upload/extraction, photo identification, manual correction audit trail, true audio
level meter, live interpreter turn-taking, real Urdu playback, and nonessential glass overlays.
The import screen explains its unavailable state. The fixture's prescription is illustrative,
not a downloadable file; no broken PDF link is exposed.

## Earlier walkthrough verification

- Application suite: 44 passing tests, including Scribe API, recording lifecycle and draft history.
- Context-sync suite: 3 passing tests, including both-side edits and private-note exclusion.
- TypeScript and ESLint passed.
- Production build passed using `pnpm build --webpack`. Turbopack's worker-port bind failed
  in this execution environment; no compiler switch was imposed on teammates.
- Voice browser check: visit setup and capture controls inspected; direct multipart API request
  returned the expected missing-key 503. Browser upload automation could not attach its
  synthetic fixture; successful upload/review UI remains unverified without credentials.
- Original sample browser walkthrough: intake → sample account → file → findings → q2 answer → pharmacist
  review → signed advice. Reload preserved the signed file and recovered unsigned pharmacist advice/verdicts.
  Phone view checked at 390×844, with no horizontal report overflow.
- Not verified against paid providers, a configured Neon database, a real microphone,
  production HTTPS or a physical printer.

## Reference sources

- Taste: https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md
  Current skill scopes itself to marketing surfaces; the product follows the supplied
  wireframes, using applicable spacing, hierarchy, states and accessibility guidance.
- GIC reference: https://claude.ai/artifact/JqHZX2RGakx9sDDq9BZoU3
- Bitter melon: https://www.mskcc.org/cancer-care/integrative-medicine/herbs/bitter-melon
- FDA fluoroquinolone warning: https://www.fda.gov/media/114192/download


## English report integration checkpoint (19 September, ~18:45)

English report integration passed 100 automated tests (3 opt-in/live skips), lint,
TypeScript and webpack build; independent final review approved. Live Gemini and
browser evidence, current branch heads, exact fictional-vs-recorded input boundary
and remaining limitations are in `docs/implementation-english-report.md`. Reports
survive reload/history restoration; provider failures/cancel preserve saved Urdu.
The bubble-map/data expansion remains deferred.

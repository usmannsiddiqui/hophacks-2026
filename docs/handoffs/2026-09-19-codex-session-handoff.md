# Mashwara — next Codex session handoff

Snapshot: **19 September 2026, approximately 18:38 EDT / 22:38 UTC**.
Prepared in a side conversation at the user's request. This is a continuity record,
not a claim that the active main task has finished.

## Read this first: another session may still be writing

The main Codex task **“Review hackathon design and build”** was active when this
snapshot was taken. Its thread ID is `01a0bb0a-277f-7572-9dca-1b5e8c97864f`.
The latest observed feature commit is `3793fe6`. The backend and frontend report
implementations exist; integrated review, final validation, documentation, push and
PR update may still be in progress. **Reconcile with newer commits and the main
task's final response before making edits. Do not launch a competing implementation.**

This handoff does not stop the main task or its workers. No subagents were contacted,
no code/Git state was changed, and no service was stopped while preparing it.
The side conversation only read current state and wrote this handoff.

If code, the task ledger, or a newer validation record contradicts a checkpoint
below, use the newer evidence. Earlier “pending” ledger lines remain in the file;
later completion entries supersede them. Do not restart completed tasks.

## User intent and agreed scope

The user is building Mashwara with teammates for the Johns Hopkins HopHacks 2026
Bloomberg Philanthropies track. The name is provisional. Their immediate priority
is a lean, judge-understandable, end-to-end product and a working build they can
personally test. They are frustrated by long waits and repeated approval questions.

The latest authorized feature is:

1. A volunteer records a patient's spoken Urdu, or uploads Urdu audio.
2. ElevenLabs Scribe transcribes in Urdu.
3. The volunteer reviews/corrects the transcript; original Urdu remains separate.
4. Save the visit without losing previous visit drafts.
5. Gemini translates the **reviewed** Urdu to English and extracts medication
   mentions and clarification questions.
6. Present an English pharmacist draft report with existing deterministic flags.

The patient need not type, own an account, visit a pharmacy, or wait for a remote
pharmacist. Volunteers may visit homes or communities. They may speak Urdu locally
or be English-speaking visitors. Initial capture is a patient-only monologue;
pause while the volunteer speaks. Two Urdu speakers cannot be distinguished by
language. Remote pharmacists work in English and review asynchronously. Later,
the volunteer returns/contacts the patient with approved advice and checks understanding.

Keep the approved frontend and user journey. The user approved implementation of
rough wireframes and specifically deferred “sexier” bubble-map/flag visuals until
the voice/report path works. Do not spend this slice redesigning the map. They
prefer brief user-facing copy; detailed behavior belongs in docs/expandable evidence.

Providers are **ElevenLabs + Gemini**. Earlier Grok discussions are superseded.
No active Grok, no automatic Gemini transcription fallback, no canned transcript
substitution on missing keys/errors. ElevenLabs Agents can be connected to LLMs,
but this slice uses direct Scribe STT plus direct Gemini report generation, not a
new conversational-agent architecture. TTS is later even though the replacement
ElevenLabs key has STT and TTS permissions.

## Workspaces — use the right checkout

**Current implementation worktree:**

`/Users/usmansiddiqui/.codex/worktrees/voice-transcript-capture/hophacks-2026`

- Branch: `voice-transcript-capture`.
- Last observed HEAD: `3793fe6` (`Add English visit report flow`).
- Last cached remote head: `origin/voice-transcript-capture = 0df438e`.
- Git reported ahead by 10 commits, including merged main ancestry. This is not
  equivalent to 10 newly authored feature commits.
- Use this existing worktree rather than creating another copy of the same work.
- In this environment it is outside the default writable roots; request scoped
  escalation when necessary for authorized writes/build output. Do not relocate
  or overwrite it just to avoid permission handling.

**Original checkout:**

`/Users/usmansiddiqui/dev/projects/hophacks-2026`

- Branch: `judge-demo-journey` at `51e4239`, matching its cached remote.
- Preserve unrelated modified `AGENTS.md` and untracked
  `docs/handoffs/2026-09-19-claude-to-codex.md`.
- This new handoff is another untracked file here. It has not been committed,
  pushed, or synced to Obsidian by the side conversation.
- Do not accidentally develop the report feature in this older checkout.

Remote: `https://github.com/usmannsiddiqui/hophacks-2026.git`.
Local `main` was still `26b568c`; cached `origin/main` is `bfae2f8`.
Do not use the stale local-main tip as the latest integration baseline.

## Git history, PRs, authorization

Relevant observed commits:

| Commit | Meaning |
| --- | --- |
| `19e357d` | Original Urdu capture and reviewed visit drafts |
| `46f2876` | Voice slice handoff |
| `db99b32` | Merge of Rayyan's ElevenLabs branch; parents `46f2876` and `6156436` |
| `11f751d` | Integrated voice validation/review notes |
| `0df438e` | Real Scribe/browser verification; last cached pushed voice tip |
| `bfae2f8` | Main's merge of PR #6, Ahmad's Gemini groundwork |
| `1875b05` | Merge main into voice feature, preserving Ahmad's ancestry and approved UI |
| `313991e` | Grounded English visit-report backend |
| `ab1fd28` | Total request deadline and provider-schema hardening |
| `3793fe6` | English report frontend and request lifecycle |

Cached teammate heads: `origin/ElevenLabs = 6156436`,
`origin/Ahmad-Gemini-branch = 695abd2`.
Rayyan's 12 commits are preserved via an actual merge, not file copying/cherry-picks.
Ahmad's work also remains in ancestry through main's merge into the voice feature.
At `1875b05`, these three conflicts were deliberately resolved to keep our approved UI:
`app/globals.css`, `app/file/[id]/page.tsx`, and
`app/file/[id]/findings/page.tsx`. The unused competing findings view was subsequently
removed by the backend task. Approved wireframes were not replaced.

Last verified PR arrangement (refresh before acting):

- [PR #4](https://github.com/usmannsiddiqui/hophacks-2026/pull/4): draft,
  `judge-demo-journey → main`; had conflicts after PR #6 landed.
- [PR #5](https://github.com/usmannsiddiqui/hophacks-2026/pull/5): draft,
  `voice-transcript-capture → judge-demo-journey`.
- PR #6: Ahmad's Gemini branch was merged into main.

The user authorized integration, pushing the voice branch, and updating **existing
draft PR #5**, with teammate attribution. **Neither PR #4 nor PR #5 is authorized
to merge into main yet.** Eventual order after review: reconcile/merge #4 into main,
then retarget #5 to main and merge it **with a merge commit**. No squash/rebase that
loses the ElevenLabs commits' ancestry. Fetch/check for extra teammate pushes before
finalizing. This handoff's GitHub refresh failed due to network access, so the PR
state above is explicitly last-known, not newly verified.

At snapshot, the voice worktree also had:

- Modified `CONTEXT.md`, `context-files.json`, `docs/build-order.md`,
  `docs/implementation-elevenlabs-integration.md`, `docs/specs/contracts.md`.
- Untracked `docs/implementation-english-report.md`.
- Staged deletion of
  `.superpowers/sdd/implementation-english-report/task-2-report.md`.
  That scratch report was accidentally included in `3793fe6`; its working copy still
  existed as ignored evidence. Preserve the deliberate cleanup; do not blindly
  restore the staged deletion or broadly stage all scratch files.

## Repository instructions and source of truth

Every shell command uses the `rtk` prefix (`rtk proxy` for unfiltered commands).
Use pnpm. Read `AGENTS.md`, `CONTEXT.md`, accepted ADRs, contracts, current build
order and user journey before changing behavior. Existing ADRs are immutable;
add a superseding ADR only for a real decision change. No direct main commits.

Core documents in the feature worktree:

- `CONTEXT.md`, `DESIGN.md`
- `docs/adr/0001-...` through `0008-...`
- `docs/specs/contracts.md`
- `docs/build-order.md`, `docs/user-journey.md`
- `docs/implementation-voice-capture.md`
- `docs/implementation-elevenlabs-integration.md`
- `docs/implementation-english-report.md`
- `docs/pressure-test.md`, `docs/context-workflow.md`

Canonical shared prose lives at:

`/Users/usmansiddiqui/dev/NathanDrake/01-Projects/Hophacks/team-context`

The repository contains normal tracked mirrors so teammates see them on pull.
An ignored `.context-sync.local.json` configures the vault in the voice worktree.
`context-files.json` currently has 23 paths including the new English-report plan.
Workflow: `rtk pnpm context:check`; import incoming teammate repo changes before
editing the vault; export vault changes before the PR; check again. Stop/reconcile
conflicts on both sides. Never use `skip-worktree` or absolute symlinks to hide docs.
Do not run a sync simultaneously with the still-running main task.

Historical references:

- `/Users/usmansiddiqui/dev/Design.html` (original wireframes)
- `/Users/usmansiddiqui/dev/NathanDrake/01-Projects/Hophacks/handoff-codex-2026-09-19.md`
- `docs/specs/wireframes.html` (approved repo snapshot)
- Design inspiration: https://claude.ai/artifact/JqHZX2RGakx9sDDq9BZoU3
- User-requested taste skill: https://github.com/leonxlnx/taste-skill

Do not reopen settled design merely because older context describes a pharmacy
counter. ADR 0008 and the current outreach journey supersede that assumption.

## What is built: Scribe slice

`/visit/new` is the live outreach route. `/file/new` is the separate, explicit sample
walkthrough using sample data. Do not present the sample as live provider output.

- `components/voice-visit.tsx`: patient setup, record/pause/resume or audio upload,
  transcription, Urdu correction, save, previous visit restoration, now report action.
- `lib/audio-capture.ts`: MediaRecorder limits, permission/abort handling, resource
  cleanup and elapsed time. Preserve these safeguards.
- `lib/audio.ts`: public transcript shape and correct WAV/MP3 upload filenames.
- `app/api/transcribe/route.ts → lib/voice/stt.ts → lib/voice/providers/scribe.ts`:
  the single active transcription path, adapted from Rayyan's backend.
- Fixed Scribe v2/Urdu/word timestamps; no diarization, automatic retries, Grok,
  Gemini STT fallback, or canned success. Explicit sanitized errors; no-store.
- Audio maximum 4 MiB; multipart bound 4 MiB + 64 KiB. Browser max 3 minutes.
  Server-side media-duration parsing and public abuse controls remain limitations.
- Provider deadline 45 seconds; browser transcription deadline 55 seconds.
- Transcript contract: `{ text, language: 'ur', words: [{ text, start, end }] }`.
  Preserve raw text exactly. Omit bad individual word intervals rather than inventing them.

Earlier verified evidence: 62 offline tests passed / 3 opt-in skips; lint,
TypeScript, production build, and context-sync tests passed. Later, real Scribe
testing passed both public Urdu FLEURS WAVs plus configuration/CER checks (4 checks).
Browser success was observed for fictional visit setup → real WAV/Scribe Urdu →
correction while preserving original → save → reload → another visit → restore.
This does not establish physical-phone microphone or clinical vocabulary accuracy.

Fixtures: `lib/voice/__tests__/fixtures/urdu-short.wav` (~6.2 seconds) and
`urdu-hospital.wav` (~10.4 seconds), with `urdu.json` references. These public Google
FLEURS clips are not clinical case narratives. Opt-in test:
`lib/voice/__tests__/scribe.live.test.ts`, enabled with `SCRIBE_LIVE=1` and the
privately loaded environment. Never describe a mocked test as a live-provider test.

## What is built: English report slice

### Server and contract

- `lib/llm.ts` is the sole active Gemini adapter; `prepareVisitReport` translates
  reviewed Urdu and extracts grounded medicines/questions in one structured call.
- Explicit model: **`gemini-3.6-flash`**, zero SDK retries. Do not revert to 2.5
  based on the old plan: a metadata lookup accepted 2.5, but generation returned
  404 and recommended 3.6. Simple and then full structured generation succeeded
  with 3.6. There is no runtime provider/model fallback.
- Provider JSON schema is structural only. The earlier full schema failed with
  400 invalid argument; length bounds remain enforced in a separate strict runtime
  schema. Intermittent Google 503 high-demand responses were also observed.
- `POST /api/structure` now accepts only JSON
  `{ draftId, rawUrdu, reviewedUrdu }`. It no longer accepts the old DB/PatientFile
  request, client-supplied English, or provider override. Unsupported fields reject.
- Request body max 256 KiB, text fields max 20,000 characters. Absolute server
  deadline 25 seconds includes stalled body ingestion; route maxDuration 30.
- Safe errors/no-store: malformed 400, oversized 413, content type 415,
  client cancellation 499, missing configuration 503, timeout 504, provider/invalid
  generated output 502. Inspect current code for any subsequent changes.
- `lib/visit-report.ts`: versioned client-safe `VisitReport` schema and `attachReport`.
  Fields include `schemaVersion: 1`, `draftId`, exact `rawUrdu`, exact `reviewedUrdu`,
  `generatedAt`, `model: { provider: 'google', name }`,
  `english: { account, summary }`, `medList`, `questions`, and `flags`.
- Medicines have closed-vocabulary term, English display name, original `herWords`,
  requested/takes/remedy role and `{ kind: 'reviewed-urdu', excerpt }` evidence.
  Unknown terms become `unidentified`; voice “prescribed” becomes “takes”.
- Quotes/herWords absent from reviewed Urdu are rejected/dropped. Do not infer
  that substring grounding proves the model chose the correct medicine identity.
- No report audio timestamps: corrected Urdu cannot reliably be mapped back to
  original Scribe word timings. Never manufacture start-of-recording timestamps.
- Summary and question rationales are locally derived. Translation and questions
  are AI drafts, not clinical assessment/advice. Missing unidentified/ask-only
  follow-ups are surfaced by deterministic rules.
- Faithful translation may include the patient's reported diagnosis or clinician's
  instructions. Do not erase those with a clinical-word blacklist. The model must
  not generate new treatment advice.
- Flags always come from unchanged `computeFlags` and `data/substances.json`.
  Only 2 of the 105 interaction rows had sources at the last established audit;
  no match does not mean safe. Do not have Gemini decide “dangerous or not”.
- Ahmad's vocabulary/insight/normalization groundwork and relevant tests are
  retained/adapted; pure legacy helpers are not the new active provider path.

### Saved drafts and frontend

- `lib/visit-draft.ts`: optional report added to existing tab-local drafts.
  Status remains `transcript-review` / `transcript-ready`; no fake sent/signed state.
- Report attachment requires transcript-ready status and matching draft ID plus
  exact raw/reviewed snapshots. Corrections invalidate a stale report. Hydration
  can discard an invalid report while retaining a valid transcript.
- Session keys: `mashwara-visit-draft-v1`, `mashwara-visit-history-v1`.
  Existing drafts remain compatible and previous patients remain in tab history.
- `lib/report-request.ts`: request owner, abort/late-response guards, schema
  validation and snapshot attachment. Browser deadline currently 35 seconds.
- `components/voice-visit.tsx`: Prepare English report after save; loading/cancel,
  deliberate retry/regenerate; previous report preserved if regeneration fails;
  edits update React and storage and invalidate report; cancellation on review,
  edit, restore, another visit, and unmount.
- `components/visit-report.tsx`: English patient account, medicines/remedies,
  draft questions, table flags/citations, expandable source Urdu and print/save PDF.
  Visible/printed label: **AI draft · not sent · not pharmacist-reviewed**.
- Scoped report styles added to `app/globals.css`; no bubble-map redesign.

## Evidence and exact remaining work

Evidence is checkpoint-specific; this side conversation did not rerun the tests.

| Checkpoint | Evidence observed in task records |
| --- | --- |
| Backend initial | 91 passing tests / 3 skips; lint, tsc and production build passed |
| Backend after `ab1fd28` fixes | 93 passing / 3 skips; lint and tsc passed; independent backend review clean per ledger |
| Live full Gemini report | Ledger records success; fictional Urdu → English, 3 grounded items, 3 questions, 1 deterministic table flag |
| Frontend `3793fe6` | 17 test files, 98 passing / 3 live skips; lint, tsc and whitespace check passed, per frontend implementation report |
| Latest integrated checkpoint, read just before handoff completion | Ledger now records production build passing, 99 tests passing / 3 skipped, and frontend task review approved; a Vite native-config migration advisory was noted |
| Browser/final review | Report retry/error paths verified per latest ledger; full report rendering still pending successful live browser generation; broad final review/finalization not yet confirmed complete |

The live fictional account mentioned daily metformin, morning bitter-gourd juice,
a three-day cough, and unknown Hakeem powder at night. This was a real API response
to fictional text, not a validation study. Raw evidence was stored locally at
`.superpowers/sdd/implementation-english-report/live-fictional-report.json`.

The backend review already prompted fixes for a stalled request body escaping
the deadline, provider-schema incompatibility, and model-generated clinical question
rationale. Do not redo those fixes. A final read before saving this handoff confirmed
the frontend task review is approved and Task 2 complete at `3793fe6`.
One deferred minor finding remains for final review: the browser request deadline
currently ends when response headers arrive rather than covering response-body
completion. This is recorded in the ledger; do not lose it during final review.

The active task ledger is:
`.superpowers/sdd/implementation-english-report/progress.md`.
Other temporary evidence there: `backend-report.md`, `task-2-report.md`,
`task-1-brief.md`, `task-2-brief.md`, and review diffs
`review-1875b05..313991e.diff`, `review-313991e..ab1fd28.diff`,
`review-ab1fd28..3793fe6.diff`. These files may be removed after final review;
the substantive findings and evidence above are preserved in this handoff.
Do not depend on old subagent handles surviving into the next session.

Remaining, unless newer main-task evidence says completed:

1. Complete broad final review and any concrete fixes. Frontend task review has
   now passed; carry the response-body deadline finding into final review.
2. The latest ledger says the **integrated frontend+backend** build passed; rerun
   only if subsequent code changes or unresolved verification gaps require it.
3. Browser test Prepare report on a saved draft, explicit failure/retry,
   correction invalidation, cancel/late-result behavior, reload/history restore,
   print layout, source preservation and a 390px mobile viewport.
4. Verify a real provider-backed report in the browser. Separate that evidence
   from the already-observed standalone server function success.
5. Final automated tests, lint and TypeScript appropriate to any intervening fixes;
   do not repeatedly rerun unchanged checks without reason.
6. Finalize the Obsidian build order/glossary/contracts/integration status, export
   and context:check. Current prose still includes some historical “next” wording.
7. Commit final docs and scratch-report index cleanup deliberately; inspect staged
   paths so secrets, scratch files and unrelated original-checkout work do not enter.
8. Fetch current remotes/PR states, reconcile extra teammate pushes, confirm both
   teammate heads remain ancestors, push the voice branch and update draft PR #5
   around the full Urdu → reviewed text → English-report implementation/evidence.
9. Leave main unmerged. Present the testable local build and limitations to the user.

Not implemented/validated by this slice: shared Neon persistence and pharmacist
queue delivery for VisitDraft, pharmacist signing of the new report, approved advice
translation/readback/TTS, follow-up delivery tracking, full two-way live interpretation,
real-phone/noisy-room capture, clinical translation/extraction accuracy, and public
access/rate controls. Legacy sample pages may depict some of these; they are not
proof that the live outreach path implements them.

## Keys, local servers and browser state

Never print/commit/copy credentials into this handoff or chat. Only `.env.local` is
used for secrets; `.env.example` lists empty values. The worktree privately received
the replacement `ELEVENLABS_API_KEY` and configured `GOOGLE_GENERATIVE_AI_API_KEY`.
No `DATABASE_URL` was configured at the last presence-only check. Confirm presence
without outputting values. A local Postgres listener does not mean Neon is configured.

An earlier ElevenLabs key was exposed in a screenshot. Never use or reproduce it.
User said they refreshed the key with STT/TTS permissions; actual old-key revocation
was not independently verified. Real Scribe tests used the refreshed configured key.

The user asked this side conversation to stop local preview servers before testing.
Ports **3000, 3002, 3999 and 63870** were stopped and verified clear at that time;
unrelated services were untouched. **Main has since restarted port 3002**: the latest
observed listener was PID `86281` with cwd equal to the voice worktree. Do not kill it
again based on the earlier instruction; recheck current state and coordinate ownership.
Older recorded process IDs/session IDs may be dead. No further server changes were
made for this handoff.

Expected app URL: `http://127.0.0.1:3002/visit/new`.
Prior in-app browser tab 14 contained a fictional FLEURS saved visit with corrected
Urdu. Browser IDs/tab handles may change. Never clear all session storage: prior
drafts are part of the feature/user data. Reload after production rebuilds; the
existing Next start process does not hot-reload. Inspect the process/build before
claiming the user is viewing the latest code.

For browser checks use the available CUA/browser tool and its current documentation.
Prior browser bindings are not guaranteed in a new session. File upload worked via
waitForEvent('filechooser'), clicking the actual input, then chooser.setFiles with
an existing WAV path. No hidden-state injection is needed. Test only fictional data.

## Suggested first actions for the next session

Read this handoff, inspect the main task's completion/progress, and avoid simultaneous
edits. In the **voice worktree**, inspect status, recent log and current ledger. Then
fetch and inspect PR #4/#5 and teammate heads when network access allows. Do not
assume cached refs are current. Reconcile anything that changed after `3793fe6`.

Useful commands (run from the voice worktree; all shell commands prefixed with rtk):

```sh
rtk git status --short --branch
rtk git log -12 --oneline
rtk proxy cat .superpowers/sdd/implementation-english-report/progress.md
rtk pnpm context:check
rtk git fetch origin
rtk gh pr view 4
rtk gh pr view 5
rtk git merge-base --is-ancestor origin/ElevenLabs HEAD
rtk git merge-base --is-ancestor origin/Ahmad-Gemini-branch HEAD
```

Only after confirming which validations are still needed:

```sh
rtk pnpm test
rtk pnpm lint
rtk pnpm exec tsc --noEmit
rtk pnpm build
```

Earlier successful builds sometimes used `rtk pnpm build --webpack`; use the current
project's working build command and report the actual one. Start a preview only if
one is not already serving the right build; a typical command is
`rtk pnpm start --hostname 127.0.0.1 --port 3002` after a successful production build.

## Paste into the next Codex session

> Read `/Users/usmansiddiqui/dev/projects/hophacks-2026/docs/handoffs/2026-09-19-codex-session-handoff.md`
> first. Reconcile the current main task and newest code against this snapshot before
> editing; the main task may have continued after it. Continue only unfinished work
> in `/Users/usmansiddiqui/.codex/worktrees/voice-transcript-capture/hophacks-2026`.
> Preserve unrelated local changes and both teammates' history. Finish the current
> Urdu capture → reviewed transcript → Gemini English pharmacist-draft feature,
> validation and context sync; update existing draft PR #5 as already authorized,
> but do not merge PR #4 or #5 into main. Keep visual redesign deferred. Then show
> me the latest tested local product so I can try it. Report which live-provider
> paths actually succeeded and what remains unimplemented.

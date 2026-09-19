# Next Codex session: Mashwara visualization handoff

Snapshot: **19 September 2026, approximately 19:15 America/New_York**. This is the handoff from the completed Urdu voice → English report implementation session. The implementation baseline is commit **9488ca8** on **voice-transcript-capture**; a documentation-only handoff commit follows it.

This note records user decisions, observed state and recommendations separately. It does not authorize a merge into main or make historical branch snapshots authoritative forever. Refresh Git/PR state before acting. Read this note first, then the indicated code/docs; there is no need to replay the previous long chat.

## 1. The user's latest request and working style

The user explicitly wants a fresh Codex session because the previous chat is long. **The next requested focus is a beautiful, understandable data visualization**, using:

- Requested skill repository: https://github.com/chrisvoncsefalvay/claude-d3js-skill
- Skill entry: https://github.com/chrisvoncsefalvay/claude-d3js-skill/blob/main/SKILL.md
- Raw entry: https://raw.githubusercontent.com/chrisvoncsefalvay/claude-d3js-skill/main/SKILL.md
- Its declared skill name is **d3-viz**. The repository also has `references/` and `assets/`.

The repository and entry were inspected for this handoff, but this session did **not** install the skill or implement D3. Load/read the skill and relevant references in the next session; use the skill installer if installation is actually needed. Do not assume a GitHub link automatically makes a skill installed in Codex.

The user previously requested the taste skill (https://github.com/leonxlnx/taste-skill), likes GIC's design foundations, and prioritizes a judge understanding the end-to-end journey immediately. Discover/read the taste skill if applying it; do not claim it is installed without checking. The concrete current design contract is in this repo's DESIGN.md, CSS and approved wireframes.

User preferences:
- Lean screens with short, user-facing copy. Detailed implementation notes belong in docs or expandable evidence.
- Discuss meaningful new visual directions with the user and show a rough proposal before making a large redesign. Existing approved frontend/journey must not be discarded.
- A previous request explicitly allowed implementation once rough wireframes were approved. The current voice/report slice is already approved and implemented; a particular new D3 composition is **not yet chosen**.
- Act autonomously on authorized fixes, read-only inspection, tests and routine reversible work. Avoid repeated permission questions or long pauses. Give brief useful progress updates.
- Earlier user authorized bounded independent subagent reviews and coordinated development; avoid overlapping implementer edits. Current task is visualization, not a mandate to recreate the voice feature.
- The previous suggestion to build shared persistence/queue next is an outstanding roadmap item, **not a reason to ignore this newer visualization request**.

## 2. Product purpose and the accepted journey

Working name: **Mashwara** (not necessarily final). HopHacks Fall 2026 at Johns Hopkins; a three-person hackathon project aimed at the Bloomberg Philanthropy track, using Gemini and ElevenLabs. Do not reintroduce Grok to chase prizes. Historical sponsor/prize notes are not a verified current prize rules source.

The product is for community outreach in Pakistan, not restricted to an over-the-counter pharmacy sale:
1. A volunteer starts a home/community/counter visit.
2. A patient speaks Urdu; they do not need to type, have an account, or operate the app.
3. The volunteer checks/corrects the transcript while retaining original Scribe text.
4. Gemini translates the reviewed account into English and extracts medicines and clarification questions. A sourced table supplies supported interaction flags.
5. Eventually, the volunteer sends the case to a remote pharmacist who speaks English.
6. The pharmacist asynchronously requests clarification or approves English advice.
7. The volunteer later contacts/returns to the patient, relays translated Urdu advice, and checks understanding. Approval and delivery are separate events.

A local volunteer may also speak Urdu: always-on live translation is unnecessary in that conversation. An English-speaking visiting volunteer may need spoken interpretation later. Initial implemented capture is a **patient-only monologue**; pause while the volunteer speaks. Do not infer speaker identity from language when both can speak Urdu.

The patient does **not** need to wait while the remote pharmacist responds. Current live implementation reaches an English draft only; shared delivery and pharmacist review are not connected to it yet.

## 3. Use the correct checkout

### Active implementation worktree — start here

`/Users/usmansiddiqui/.codex/worktrees/voice-transcript-capture/hophacks-2026`

- Branch: `voice-transcript-capture`.
- Implementation HEAD before this documentation follow-up: `9488ca8361dce087e8331c5c5e8273bfe6a9945e`.
- Implementation was pushed to origin, clean before this handoff.
- This worktree has the merged teammate code, latest voice/report implementation, installed dependencies, ignored credential configuration and context-sync configuration.
- Codex may open the new session in a different cwd. Set `workdir` explicitly; never assume the original checkout has these changes.
- Writes here may need sandbox escalation in a new Codex session. The prior session's default writable repo was the original path; authorized escalations were used for this managed worktree and the Obsidian vault.

### Original checkout — preserve unrelated work

`/Users/usmansiddiqui/dev/projects/hophacks-2026`

- Branch: `judge-demo-journey` at `51e4239` when checked.
- Local modified `AGENTS.md` contains the user's RTK instructions.
- Untracked `docs/handoffs/2026-09-19-claude-to-codex.md`.
- Untracked `docs/handoffs/2026-09-19-codex-session-handoff.md`.
- These were preserved, not cleaned, stashed, overwritten or committed by this implementation.

All shell commands must start with **rtk**, per the user's explicit instruction. For commands without a dedicated filter, use `rtk proxy ...`. Use **pnpm only**. Do not use broad `git add .`, hard resets, `git clean -fdx`, skip-worktree or absolute symlinks for shared docs.

For a separate visualization branch, start from the latest integrated voice branch/commit, not stale main. Use an isolated worktree if needed; retain the parent history and follow the project's task-branch naming instructions. No new visualization branch was created in this session.

## 4. Git and PR state — refresh before changing it

Remote: https://github.com/usmannsiddiqui/hophacks-2026.git

Latest fetched snapshot at handoff:

| Ref | Head | Meaning |
| --- | --- | --- |
| origin/main | bfae2f8 | Contains merged PR #6, Ahmad's earlier Gemini work |
| origin/judge-demo-journey | 51e4239 | Draft PR #4 approved frontend/sample journey/context sync |
| origin/voice-transcript-capture | 9488ca8 before handoff docs | Draft PR #5 integrated live voice/report implementation |
| origin/ElevenLabs | 6156436 | Rayyan's 12 commits; already ancestors of voice branch |
| origin/Ahmad-Gemini-branch | 695abd2 | Merged through PR #6/main, then into voice branch |
| origin/demo-scenario-scaffold | **4646645** | Separate newer Ahmad D3/mock/model-slider work; NOT integrated |

The demo branch advanced from a57a684 to 4646645 while this handoff was prepared. Fetch again next session; teammate pushes are active.

PRs:
- **#4**, draft/open: `judge-demo-journey` → `main`, last checked **CONFLICTING** after PR #6 landed. https://github.com/usmannsiddiqui/hophacks-2026/pull/4
- **#5**, draft/open: `voice-transcript-capture` → `judge-demo-journey`, last checked **MERGEABLE**, title “Complete Urdu capture and English pharmacist draft flow”. https://github.com/usmannsiddiqui/hophacks-2026/pull/5
- **#6**, merged: `Ahmad-Gemini-branch` → `main`, title “Structure step: transcript to file, with findings on screen”. https://github.com/usmannsiddiqui/hophacks-2026/pull/6
- No open PR for demo-scenario-scaffold was returned by the latest listing.

Important commits already present:
- `db99b32`: merge of Rayyan's ElevenLabs branch; parents 46f2876 and 6156436.
- `0df438e`: Scribe live/browser validation checkpoint.
- `1875b05`: merge current main/Gemini history into voice branch. Three conflicts in globals.css and file/findings route pages retained our approved frontend.
- `313991e`: grounded English report backend.
- `ab1fd28`: total request deadline and provider schema compatibility fixes.
- `3793fe6`: English report UI and request lifecycle.
- `de5c6d6`: visible Urdu provenance, response-body deadline, Vitest config cleanup.
- `9488ca8`: shared context and final validation.

**User authorization already given:** integrate teammate code using merge commits, push the working feature branch, update existing draft PR #5. **No permission to merge either PR into main.** Required eventual order remains:
1. Reconcile PR #4 against current main and merge #4 after user review.
2. Retarget PR #5 to main, then merge with a **merge commit**.

Do not squash/rebase away teammate ancestry. Both Rayyan's and Ahmad's original heads were verified ancestors of the integrated voice branch. No PR was merged into main by this session.

## 5. Existing teammate D3 work — inspect before building another map

On `origin/demo-scenario-scaffold`:
- `a57a684`: mock scenario through structure, zoomable D3 bubble map, model-speed slider.
- `4646645`: improved force-map zoomed copy inside bubbles and wording distinguishing unidentified items from flags.
- Relevant files: `components/bubble-map-force.tsx`, `components/bubble-map.tsx`, `components/scenario-workbench.tsx`, `components/model-slider.tsx`, `components/file-bits.tsx`, `components/screen-shell.tsx`, `lib/structure-lanes.ts`.
- Adds `d3` ^7.9.0 and `@types/d3` ^7.4.3.
- Also changes many app routes, global styles, the structure API, structure model code, package.json and lockfile.
- `structure-lanes.ts` explicitly contains xAI/Grok lanes and Gemini 3.5; its package.json lacks our context-sync scripts.

**Do not wholesale replace our branch or package.json with that branch.** It contains useful visual work plus conflicting backend/provider/demo assumptions. Inspect its map and demo before proposing reuse. A merge must preserve current voice/report APIs, approved frontend, Gemini-only boundary, context scripts and teammate history. Check for new pushes and coordinate scope. The user has not selected whether to adapt that exact map or build a new direction with d3-viz.

Useful read-only commands from the active worktree:

```sh
rtk git fetch origin --prune
rtk git log --oneline origin/main..origin/demo-scenario-scaffold
rtk proxy git show origin/demo-scenario-scaffold:components/bubble-map-force.tsx
rtk proxy git diff voice-transcript-capture...origin/demo-scenario-scaffold -- components/bubble-map-force.tsx components/bubble-map.tsx
```

## 6. What actually works now

### Live outreach flow: /visit/new

The home/sample intake has a “Start a voice visit” link. `/visit/new` provides:
- Name, age and sex setup; Urdu patient language.
- Browser MediaRecorder with pause/resume, cleanup, recording limit, permission errors and upload alternative.
- Real Scribe transcription via `/api/transcribe`.
- Editable Urdu review, separately expandable original Scribe text and in-memory audio playback.
- Save transcript, tab-local history, start another visit and restore prior drafts.
- Explicit Prepare English report action; loading, cancel, safe error and deliberate retry.
- English report: translated patient account, locally derived summary, English medicine names with short original Urdu phrases visible, draft questions, sourced flags/citation links, expandable longer evidence and original/reviewed Urdu.
- Report label: **AI draft · not sent · not pharmacist-reviewed**.
- Print / save PDF button and print CSS; actual PDF output not independently verified.

This report is not a PatientFile submitted to the remote queue. Do not imply a real remote pharmacist has received or approved it.

### Existing sample/legacy journey

`/file/new`, `/file/[id]/...`, and `/pharmacist` provide the earlier approved sample walkthrough: file, findings/map, questions, typed bilingual answers, queue/review, signed advice and printable report. Fictional sample files use DEMO- IDs and separate demo storage. These demonstrate the intended journey but are **not the connected live outreach case lifecycle**.

No DATABASE_URL is configured. Real storage writes fail explicitly instead of silently succeeding. Do not confuse a sample screen with working two-device persistence.

## 7. File map and contracts the visualization must respect

| File | Responsibility |
| --- | --- |
| components/voice-visit.tsx | Current recording → correction → saved visit → report UI |
| components/visit-report.tsx | English draft rendering and print control |
| lib/report-request.ts | Client request ownership, cancellation, 35-second end-to-end deadline, response parsing |
| lib/visit-draft.ts | VisitDraft schema, backward-compatible hydration, storage/history and report invalidation |
| lib/visit-report.ts | Client-safe VisitReport schema, exact source/identity validation, attachReport |
| app/api/transcribe/route.ts | Bounded multipart Scribe route |
| lib/voice/stt.ts and lib/voice/providers/scribe.ts | Sole live transcription service and adapted Rayyan Scribe backend |
| lib/audio.ts and lib/audio-capture.ts | Shared transcript/upload contract and capture resource lifecycle |
| app/api/structure/route.ts | Current report request, bounded JSON reader, safe errors, cancellation/deadline |
| lib/llm.ts | Sole active Gemini adapter; translation + extraction; local summaries/rationales/follow-up gaps |
| lib/flags.ts | Only flag-producing algorithm |
| data/substances.json | Closed vocabulary and sourced/unsourced interaction table |
| lib/vocab.ts and lib/insights.ts | Ahmad's reusable vocabulary and table/question helpers |
| lib/structure.ts and lib/transcript.ts | Retained legacy normalizer/provenance helpers; not the active report provider |
| components/interaction-map.tsx | Existing React SVG map for legacy PatientFile; no D3 currently on voice branch |
| components/file-views.tsx, components/pharmacist.tsx | Legacy/sample file and pharmacist surfaces using the map |
| components/file-provider.tsx, lib/demo.ts, lib/files.ts | Separate demo state and legacy persistence paths |
| app/globals.css, DESIGN.md, docs/specs/wireframes.html | Approved visual foundations/reference |

Current POST `/api/structure` accepts ONLY:

```ts
{ draftId: string, rawUrdu: string, reviewedUrdu: string }
```

It returns `VisitReport` directly, not `{file, insights}`. Do not resurrect Ahmad's older database-coupled request or trust client English. Runtime schema is authoritative; conceptual shape:

```ts
type VisitReport = {
  schemaVersion: 1;
  draftId: string;
  rawUrdu: string;
  reviewedUrdu: string;
  generatedAt: string;
  model: { provider: 'google'; name: string };
  english: { account: string; summary: string };
  medList: Array<{
    id: string; term: string; name: string; herWords: string;
    role: 'requested' | 'takes' | 'remedy';
    source: { kind: 'reviewed-urdu'; excerpt: string };
  }>;
  questions: Array<{
    id: string; text: { urdu: string; english: string }; why: string;
    source: { kind: 'reviewed-urdu'; excerpt: string }; status: 'draft';
  }>;
  flags: Array<{
    id: string; severity: 'high' | 'moderate';
    a: string; b: string; reason: string; citation: string;
  }>;
};
```

`flag.a` and `flag.b` reference **medicine item IDs**, not vocabulary term IDs. Distinct mentions may share a term; do not silently coalesce IDs and break edges/evidence. VisitReport source excerpts differ from legacy PatientFile's recording/attachment references. Build a small read-only graph adapter instead of fabricating a PatientFile with fake place/reviewer/status fields.

VisitDraft retains patient metadata, raw transcript/word timings, reviewedUrdu, duration, status `transcript-review` or `transcript-ready`, and optional report. Storage keys:
- `mashwara-visit-draft-v1`
- `mashwara-visit-history-v1`

It uses **sessionStorage**, scoped to the browser tab/origin. Audio is not persisted across reload. Changing corrected Urdu removes the old report. A late result cannot attach unless the draft ID, ready status, raw Urdu and reviewed Urdu match exactly. Invalid/foreign persisted reports are discarded while preserving a valid transcript draft.

Scribe success contract remains `{text, language:'ur', words:[{text,start,end}]}`. Original whitespace/text is preserved. Report evidence refers to corrected text and intentionally does not invent raw-audio timestamps after corrections.

## 8. Visualization meaning and design constraints

Accepted ADRs 0001–0008 remain binding unless the user approves a superseding decision. Read them; do not overwrite old ADRs. ADR 0002's “no chart” means **no pre-existing medical chart**, not a prohibition on a graph visualization.

Data snapshot: **143 substances, 105 interaction rows, only 2 citable major/moderate rows**. These are verified counts, not promises of coverage.

Non-negotiable semantic rules:
- A flag comes only from `computeFlags` and the sourced table. Gemini must never invent an interaction edge, risk severity or clinical recommendation.
- Rows without a citable source do not become flags. Ambiguity and missing evidence become questions.
- Unidentified substance ≠ proven interaction or danger. Keep it visually distinct without implying safety.
- No matching flag ≠ safe. Keep coverage limits understandable.
- Preserve English medicine name + patient Urdu phrase together; retain source/citation inspection.
- No fabricated severity percentages, probability scores, prevalence, dosage quantities, or evidence counts.
- Keep original/corrected Urdu separate; a map selection should reveal existing evidence, not generate new claims.
- Derive the graph from the current report/file; graph geometry is not clinical data and should not be stored in the report schema.

Current legacy map: deterministic elliptical positions; node radius derives from worst touching flag (31 high, 25 moderate, 18 neutral); edges come from file.flags; unidentified is dashed; keyboard selection shows patient words. This is a working baseline, not the final D3 design.

Visual direction already accepted: GIC-inspired warm paper and ink, Inter + Noto Nastaliq Urdu, tight hierarchy, 8/16/24 radius ladder, sensible whitespace, restrained glass only for floating surfaces. Main tokens: surface #fefffc, ink #2c2c2c, muted #646464, line #dee2de; semantic ask amber and flag red. No rainbow medication categories, gratuitous gradients, branding imitation, or decorative risk colors. Existing tokens/CSS are the source of truth. User wants beauty and a compelling judge journey, not more explanatory clutter.

**Recommendation, not an approved design:** begin with a patient-specific interaction network, with clear English labels, visible short Urdu phrases, restrained selected-node emphasis, clickable sourced edges and a concise evidence panel. Prefer an understandable six-item demo to showing all 143 substances. Ask which surface is primary (live English report/evidence view versus legacy pharmacist findings); recommend connecting to the actual VisitReport so the live workflow benefits.

D3 implementation considerations to evaluate next session:
- Inspect the teammate force map before duplicating it.
- Use stable IDs and clone graph nodes/links before D3 force simulation mutates them. Never mutate report state.
- Keep React and D3 ownership explicit; derived D3 layout with React SVG rendering is one option, an isolated D3-owned SVG subtree another.
- Responsive sizing, collision/label handling, bounded zoom/reset and touch behavior matter more than perpetual motion.
- Preserve keyboard navigation, focus rings, text alternatives, legend/empty/single-node states and reduced-motion behavior.
- Show citations in a readable panel rather than forcing long text into small bubbles. Support no-flags/unidentified-only cases honestly.
- Keep accessible textual medicine/flag/question lists available. A graph must complement the report, not replace its evidence.
- Avoid widening the clinical data set or changing model/API behavior merely to make the graph dramatic.

## 9. Provider decisions, credentials and operational traps

Credentials exist only in ignored `.env.local` in the active worktree. Presence-only check at handoff: ELEVENLABS_API_KEY configured, GOOGLE_GENERATIVE_AI_API_KEY configured, DATABASE_URL absent/empty. Never print, commit, paste into a browser, or send their values in a handoff. `.env.example` contains empty entries.

An old ElevenLabs key appeared in a screenshot. It must be revoked; the user later said they refreshed the key with STT+TTS permissions. The replacement was copied privately into the worktree and used for successful live tests. The old value was never reproduced, committed or used here. Revocation itself was not independently verified.

Active choices:
- ElevenLabs Scribe v2, Urdu, word timestamps, no diarization, no automatic retries; no Grok or Gemini transcription fallback.
- Gemini **3.6 Flash** is fixed in lib/llm.ts; no runtime model switch/fallback.
- 2.5 Flash metadata GET succeeded, but generation returned 404 for this account recommending 3.6. Do not revert based on stale model metadata/examples.
- Simple and full structured generation succeeded with 3.6. Google also intermittently returned 503 high demand. Isolated probes of 3.8 and 3.5 returned high demand too; they are not part of the app.
- A stricter provider-facing JSON schema produced an invalid-argument error. Current code sends a simpler structural schema, then separately validates strict bounds/grounding on returned data. Do not collapse those two schemas without a live compatibility check.
- Faithful translation may include a patient's reported diagnosis or clinician instructions. Do not blacklist such words and erase evidence. The app does not ask Gemini for new treatment advice; summary and question rationale are local. Translation and questions still need human review.

Limits: 4 MiB audio and 4 MiB + 64 KiB multipart body; 3-minute browser capture/upload limit; server does not independently parse audio duration. Scribe provider deadline ~45 seconds, browser transcription ~55 seconds. Structure body limit 256 KiB, 20,000-character Urdu snapshots, absolute server deadline 25 seconds including body reading, browser deadline 35 seconds including JSON response consumption. Errors are explicit and sanitized; no fabricated success, no automatic retry. No transcripts/provider secrets are logged by the active routes.

## 10. Validation already completed — do not overclaim or rerun indiscriminately

Final code baseline:
- **100 passed, 3 opt-in/live skipped**, 17 Vitest files.
- ESLint clean; TypeScript clean.
- `pnpm build --webpack` production build passed.
- Three Python context-sync regression tests passed.
- Independent backend, frontend and whole-integration reviews approved; final provenance/deadline findings fixed.
- The Vite __dirname advisory was fixed using import.meta.dirname in vitest.config.mts.

Live evidence:
- Scribe's opt-in suite passed both public FLEURS Urdu WAV fixtures plus configuration/helper checks in the earlier integration; fresh browser upload in the report session also reached actual Urdu transcription.
- Actual fixture files: `lib/voice/__tests__/fixtures/urdu-short.wav` and `urdu-hospital.wav`; references/license in adjacent files. They are public nonclinical speech, not medical utterances.
- Direct live Gemini test on typed fictional Urdu returned English, metformin + bitter gourd + unidentified powder, three draft questions and one table-computed flag.
- Browser test used actual FLEURS audio, then deliberately replaced reviewed text with a typed fictional medication account to test correction provenance/report fields. Original FLEURS text stayed separate. A live browser report returned two draft questions and one table flag. Question count/wording is model-dependent; flags are deterministic for the extracted med list.
- Verified browser failures/retry, cancellation, transcript reload, report reload, start another visit and restore from two saved visits.
- Checked 390×844 layout with document width 390: no horizontal overflow. Short Urdu medicine phrases remain visible beside English names; longer evidence expands.
- Browser console check after final reload returned no errors.
- Print control was clicked but the in-app browser exposed no print preview. Actual PDF output is **unverified**.

Fictional reviewed text used for manual/API validation:

> میں روز میٹفارمن لیتی ہوں۔ میں صبح کریلے کا رس بھی پیتی ہوں۔ مجھے تین دن سے کھانسی ہے۔ میں حکیم کا ایک نامعلوم سفوف رات کو لیتی ہوں۔

Expected meaning: daily metformin, morning bitter gourd juice, cough for three days, unknown Hakeem powder at night. This fixture is for demonstrations/tests only; it is not a real patient's data or proof of medical translation accuracy.

The browser tab used for validation contained “Fictional report QA” with a saved English report and “FLEURS fictional test” as another saved visit. These were left available. They may no longer exist if the user closes the tab; never assume sessionStorage transfers into a new tab.

Remaining unimplemented/unverified:
- Shared Neon persistence and asynchronous remote submission/review connected to VisitDraft/VisitReport.
- Pharmacist sign-off, approved-advice translation/TTS and delivery tracking in the live outreach flow.
- Hands-free bilingual interpretation, multi-speaker attribution and clinical audio accuracy.
- Physical microphone/noisy-room/phone-over-HTTPS checks.
- Real clinical validation, authenticated/verified pharmacist workflow, access/rate controls and server media-duration validation.
- D3 visualization improvement (the next requested focus).

Use fictional visits only. Do not present the product as having solved the above limitations.

## 11. Server and practical restart commands

Manual preview: **http://127.0.0.1:3002/visit/new**. It returned **HTTP 200** while preparing this handoff. It serves the production build from the active worktree. Last parent terminal session ID was 61177, but tool session IDs are not guaranteed to carry into a new chat.

A sandboxed curl once incorrectly appeared unable to connect (000); an escalated check returned 200. Attempting another server produced EADDRINUSE because the correct server was already running. Therefore check the listener/HTTP response before launching or killing anything. Other ports may belong to the user or another task; do not terminate unrelated servers.

From the active worktree:

```sh
rtk git status --short --branch
rtk git fetch origin --prune
rtk gh pr view 4
rtk gh pr view 5
rtk pnpm context:check
rtk proxy curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/visit/new
```

If no server is running and a current production build exists:

```sh
rtk pnpm start --hostname 127.0.0.1 --port 3002
```

After code changes, use a known free development port or rebuild/restart only your own preview:

```sh
rtk pnpm dev --hostname 127.0.0.1 --port 3002
rtk pnpm test
rtk lint
rtk tsc --noEmit
rtk pnpm build --webpack
rtk proxy python3 -m unittest discover -s scripts -p 'test_*.py'
```

Do not run start and dev on the same occupied port. Do not mistake stale production assets for new code. Runtime node scripts/tests do not automatically load .env.local the same way Next does; use a private env-file loader if deliberately running paid live tests. Default Vitest must remain offline.

For browser work use the provided CUA browser tool, read its current documentation, discover tabs fresh and preserve the existing tab's saved visits. Old JS handles do not carry across sessions. Prior browser ID was 1 and report tab ID 14; treat those only as hints. Upload works through `waitForEvent('filechooser')` + clicking the actual file input + `chooser.setFiles(absolutePath)`. Do not fake live browser success by injecting storage or replacing provider responses. Reset temporary viewport overrides after testing.

## 12. Shared context and reading order

Canonical Obsidian folder:
`/Users/usmansiddiqui/dev/NathanDrake/01-Projects/Hophacks/team-context`

The user wanted less local clutter but also wants teammates to receive specs/build order/context on git pull. Agreed solution: **regular tracked repo mirrors**, managed by the explicit context sync workflow. Never delete tracked context locally to hide it, use skip-worktree, or replace files with machine-specific symlinks. Hide docs in the editor if desired.

This handoff's canonical file is under that folder at `docs/handoffs/2026-09-19-voice-report-to-visualization.md`; a matching tracked copy is in the active repo. It is added to context-files.json, bringing the allowlist from 23 to **24** files.

Workflow:
1. Run `rtk pnpm context:check` from the relevant checkout.
2. After pulling/merging teammate docs, `rtk pnpm context:import` brings repo edits into the vault **before** vault edits.
3. Edit the canonical vault documents; `rtk pnpm context:export` updates tracked repo mirrors.
4. On conflict, reconcile both copies deliberately; never force overwrite.
5. Run check before the PR. Use context:init for new allowlisted files; it refuses differing existing copies.

Read in this order:
1. This handoff.
2. Current AGENTS.md plus the user's RTK instruction; applicable skill instructions.
3. CONTEXT.md and DESIGN.md.
4. ADRs 0001–0008, especially 0001 flags, 0006 design, 0008 outreach.
5. docs/user-journey.md and current sections of docs/build-order.md.
6. docs/specs/contracts.md, lib/visit-report.ts, lib/visit-draft.ts.
7. docs/implementation-english-report.md and docs/pressure-test.md.
8. Current map/report components and the separate teammate D3 branch.
9. The requested d3-viz skill, then only the references needed for the chosen design.

Historical context if needed:
- `/Users/usmansiddiqui/dev/Design.html`: original pasted wireframes.
- `/Users/usmansiddiqui/dev/NathanDrake/01-Projects/Hophacks/handoff-codex-2026-09-19.md`: old broad handoff.
- GIC inspiration artifact: https://claude.ai/artifact/JqHZX2RGakx9sDDq9BZoU3
- Current approved export is docs/specs/wireframes.html; original/historical files do not override current code and accepted outreach decisions.

Old scaffold checklists contain counter-only terminology and already-completed tasks. Do not rebuild those blindly. The old “18 hours left” clock is historical; reconfirm the actual hackathon deadline before time-sensitive work. Local README/AGENTS prose about only six ADRs is stale: eight ADR files exist.

## 13. Recommended first actions in the next chat

1. Confirm active checkout, dirty files, current remote branches and PRs. Preserve unrelated work and the existing manual-test server.
2. Read the requested D3 skill and inspect Ahmad's updated map branch before installing dependencies or implementing another graph.
3. Show the user a concise proposed visualization/user interaction and identify which live surface it will serve. Clarify only the consequential open design choice; avoid re-asking settled product questions.
4. Implement the agreed visualization as a bounded slice atop the integrated voice branch. Keep the source-derived flags and current API/storage boundaries intact.
5. Validate a cited pair, unidentified item, no flags, no medicines, long English/Urdu labels, narrow screens, keyboard interaction, reduced motion, selection/citation inspection and unmount cleanup. Run appropriate existing tests/lint/tsc/build.
6. Sync context alongside code, preserve teammate attribution/history, present the result for review. Do not merge main unless the user gives new authorization.

No visualization code, new task, new visualization branch or new skill installation was created by this handoff request. The previous implementation is complete for its stated slice; continue with the user's newly chosen visual focus.

## Ready-to-paste next-session prompt

Read `/Users/usmansiddiqui/dev/NathanDrake/01-Projects/Hophacks/team-context/docs/handoffs/2026-09-19-voice-report-to-visualization.md` first. Work from `/Users/usmansiddiqui/.codex/worktrees/voice-transcript-capture/hophacks-2026`, checking fresh Git/PR/local state before edits. I want to build a beautiful, judge-friendly data visualization using https://github.com/chrisvoncsefalvay/claude-d3js-skill. Inspect Ahmad's current demo-scenario-scaffold D3 work before duplicating it. Preserve our approved outreach frontend, working Urdu → reviewed transcript → English report journey, source-derived flags, and teammate Git history. Show me a concise proposed visual/user journey before a large redesign. Do not merge anything into main yet.

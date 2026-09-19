# Urdu capture to English pharmacist draft

Approved scope: keep the volunteer recording → reviewed Urdu → saved visit journey, then prepare an English pharmacist report. ElevenLabs Scribe owns transcription. Gemini translates the reviewed Urdu and extracts medicines and clarification questions. Existing interaction-table flags remain deterministic. Visual redesign, Neon queue delivery, pharmacist signing and TTS are later slices.

## Global constraints
- Preserve both teammates’ commit ancestry and the approved frontend. Work on voice-transcript-capture; never merge main without approval.
- Original Urdu and reviewed Urdu remain separate. No silent fixtures or fallback providers. Gemini-only LLM boundary in lib/llm.ts. Explicit configuration/provider errors, bounded requests, cancellation and user-triggered retries.
- The report is an AI draft stored in this browser tab, not sent or signed. No AI treatment advice. Quotes must be grounded in reviewed Urdu; do not invent timestamps after corrections. Flags come only from lib/flags.ts and the sourced table.
- Preserve old saved drafts. Changing reviewed Urdu invalidates analysis; stale requests cannot attach to another draft.

## Task 1: Gemini backend and report contract
Reuse Ahmad’s vocabulary, normalization, insights and tests. Replace the database-coupled /api/structure contract with a bounded validated saved-visit request. One Gemini call translates reviewed Urdu and extracts source-grounded medication/request/question fields. Derive report prose from these fields, rather than generating treatment or diagnoses. Add a client-safe versioned report schema, immutable input identity, model/time metadata, and optional report persistence on VisitDraft. Disable xAI and remove unused alternate findings view. Validate structured output and safe errors with automated tests.

## Task 2: Approved voice journey extension
After saving reviewed Urdu offer Prepare English report. Show English account, medication list, clarification questions, and existing sourced flags with an explicit AI-draft/not-sent label. Use existing report styles and printable layout. Preserve source Urdu and corrections, tab history, all recording cleanup and user-controlled retry. Cancel/ignore stale requests on edits or another visit. Add meaningful lifecycle tests.

## Task 3: Validation and handoff
Run automated tests, lint, typecheck, production build; validate real Gemini on fictional Urdu if a key is configured; browser-check recording/report/review/history and narrow-screen layout. Review implementation independently. Update the Obsidian mirrors, build order, glossary and integration status. Check teammate pushes, push and update draft PR 5 with evidence and limitations.

## Provider validation notes

Google's model metadata endpoint advertised Gemini 2.5 Flash, but generation returned
404 for this account and explicitly recommended Gemini 3.6 Flash. A direct structured
Urdu-to-English test succeeded with 3.6; this is an explicit model selection, not a
runtime fallback. Full-report live validation subsequently succeeded after simplifying the provider-facing
JSON schema while retaining strict runtime validation. Intermittent 503 high-demand
responses remain a real provider limitation and require deliberate user retry.

Faithful translation can contain the patient's reported diagnosis or instructions
from a clinician. Do not erase that evidence with a clinical-word blacklist. The app
does not request new treatment advice: summaries and question rationales are derived
locally, translation/questions remain unreviewed drafts, and interaction flags are
computed from the table. Human review of translation and extraction remains required.

## Backend validation checkpoint

`313991e` adds the report backend and `ab1fd28` hardens the total request deadline
and Gemini-facing schema. Independent backend review is clean. Automated checks:
93 tests passed, 3 opt-in/live skips; lint and TypeScript passed.

Observed live Gemini 3.6 output on a fictional Urdu account: accurate English account
covering daily metformin, morning bitter gourd juice, three-day cough, and an unknown
Hakeem powder at night; three extracted items; three draft questions; one flag
computed by the existing table. This confirms the provider call and schema path,
not clinical validation or medical translation accuracy across patients. Integrated
browser and final build checks follow the frontend task.

## Completed implementation and validation

- Main/Gemini history merged in `1875b05`; backend `313991e`, request/schema fixes
  `ab1fd28`, report UI `3793fe6`, final provenance/deadline fixes `de5c6d6`.
- Independent backend, frontend and final integration reviews approved.
- Final offline suite: 17 files, 100 tests passed, 3 opt-in/live skips. ESLint and
  TypeScript passed; webpack production build passed. Context-sync regression
  tests: 3 passed. The Vite configuration advisory was resolved.
- Real Scribe browser test on the public FLEURS Urdu WAV reached review. The original
  transcription remained intact after entering an explicitly fictional medication
  account as reviewed text. Live Gemini then produced the English account, medicine
  list, two draft questions and one sourced table flag in the browser. The medical
  report test used typed fictional Urdu, not recorded clinical speech.
- Verified failure/retry, cancellation, saved transcript reload, saved report reload,
  start-another-visit and restoration from two retained visits. Automated coverage
  checks report invalidation on correction and stale/cross-draft responses.
- The report fits a 390 × 844 viewport without horizontal overflow. Short patient
  Urdu phrases stay visible beside English medicine names; longer evidence expands.
- Print control is present, and print-specific styles preserve the AI-draft label.
  The in-app browser did not expose a print preview, so actual PDF output is unverified.

## Remaining limitations and merge state

Google intermittently returned 503 high-demand errors before succeeding. Explicit
user retry is required; no automatic model/provider fallback exists. Gemini 3.8 and
Ahmad's earlier 3.5 also returned high-demand errors in isolated diagnostic tests;
they were not added to the runtime. The active model remains Gemini 3.6 Flash.

Reports are tab-local drafts, not delivered to a remote pharmacist and not signed.
No database/queue migration, Urdu advice TTS, physical microphone/noisy-room test,
medical-vocabulary accuracy study or clinical validation is claimed. Public exposure
still needs access/rate controls and server-side audio-duration validation.

Final remote check: main `bfae2f8`, ElevenLabs `6156436`, Ahmad `695abd2` unchanged.
New `demo-scenario-scaffold` (`a57a684`) is separate teammate visual/model work and
was left untouched. PR #4 remains conflicting against main; PR #5 remains draft
against judge-demo-journey. After user review, reconcile/merge #4 first, retarget #5
to main, then merge #5 with a merge commit. No main merge is authorized or performed.

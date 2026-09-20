# Build order

**Now: Saturday ~14:00. Hacking ends Sunday ~08:45.** ~18 hours. Reserve the last 3 for
rehearsal, video and Devpost. That leaves ~15 build hours × 3 people.

Owners: A = unassigned · B = unassigned · C = Codex implementation pass (team owner still to confirm).

Wireframes are the spec: `docs/specs/wireframes.html` (open in a browser). Contract:
`docs/specs/contracts.md` ↔ `lib/types.ts`. Canned file: `data/files/mw-1042.json` —
every screen after P2 renders against it with no env vars.


## Current slice: xAI follow-up questions after the English report

On `Ahmad-Branch-GrokSTT`, Scribe remains the source of the first recording. xAI is
on the output side only (ADR 0009): each draft question in the report has "Ask in
Urdu" (xAI speech) and "Record patient answer" (Grok STT rewritten into Arabic-script
Urdu, editable). Answers sit on the draft as `followUps` until "Add answers and update
English report" appends them as `سوال:`/`جواب:` dialogue and re-runs Gemini. Browser
verified 20 Sep: answer mentioning metformin → new report extracted Metformin from the
`جواب:` line and dropped the answered dose question. The earlier xAI transcript panes
on the input side are removed.

Gemini: the free-tier daily quota on `gemini-3.6-flash` ran out during testing and
`gemini-3.8-flash` returned intermittent 503 "high demand". Primary is now
`gemini-3.5-flash-lite`; `lib/llm.ts` tries 3.5-lite → 3.8 → 3.7 → 3.6 on quota/busy
only (still one provider) and reports 429/503 with plain messages instead of a
generic failure. The "stuck on Preparing
English report" symptom was an orphaned `next dev` process with a broken stdout pipe
(`EPIPE`), not the report code; restart `pnpm dev` if a route stops answering.

## Current slice: English report after reviewed Urdu

The backend and frontend are implemented and reviewed on `voice-transcript-capture`.
The full browser journey reached a live English report; final verification is recorded
in the implementation note. Scope: patient Urdu recording → original
Scribe transcript → volunteer corrections → saved visit → Gemini English translation
and pharmacist draft. No visual/map redesign in this slice.

- Gemini is called only through `lib/llm.ts`, live-verified on Gemini 3.6 Flash then
  switched to 3.5 Flash-Lite as primary on 20 Sep (see the xAI follow-up slice above).
- Reports preserve raw and reviewed Urdu, source-ground extracted quotes, and compute
  flags only from the existing interaction table. No Grok or provider fallback.
- Reports remain in the current browser tab. Shared queue, pharmacist approval, Urdu
  advice/TTS and delivery tracking are the next integration slice.
- See `docs/implementation-english-report.md` for validation evidence and limitations.

## Latest integration: Rayyan's ElevenLabs branch (19 September)

PR #6 (Ahmad's Gemini structure step) landed on main at `bfae2f8`. Main is now merged into `voice-transcript-capture` through `1875b05`, preserving Ahmad's commits and resolving the three frontend conflicts in favor of the approved outreach screens. Urdu-to-English report integration is in progress; see `docs/implementation-english-report.md`. PR #4 still needs separate reconciliation against main before its eventual merge.

- Integrated `origin/ElevenLabs` (`6156436`) into `voice-transcript-capture` via merge commit `db99b32`; Rayyan's 12 commits and approved outreach UI are retained. Draft PR #5 is updated for review.
- One Scribe-only backend and `/api/transcribe` contract. No active Grok, Gemini transcription fallback or canned transcript substitution.
- Reuse Scribe adapter, language handling and Urdu fixtures; preserve bounded uploads, explicit errors, raw/corrected Urdu, cleanup, deliberate retries and previous drafts.
- Keep flags derived from `data/substances.json`; Gemini translation/structuring is the next slice.
- Live Scribe follow-up passed two real Urdu fixtures and browser transcription/correction/save/reload/history with the refreshed key. Physical-phone and TTS checks remain open; see `docs/pressure-test.md`.
- Review order: PR #4 → main first; then retarget PR #5 → main and merge with a merge commit. Neither PR is authorized to merge yet. Never squash/rebase away Rayyan's ancestry.

## Latest slice: Urdu voice capture (19 September, ~17:00)

Approved direction is community outreach with asynchronous volunteer follow-up (ADR 0008).
Gemini + ElevenLabs only. The counter-specific checklist below is historical.

- /visit/new now records patient-only Urdu, pauses/resumes, uploads audio to Scribe,
  and preserves raw plus corrected transcripts in tab-local drafts.
- /api/transcribe validates bounded uploads and maps provider/configuration failures.
- Live Scribe and browser upload/review/save were subsequently verified with the refreshed key; physical-microphone checks remain unverified.
- Next: Gemini translation/structuring through lib/llm.ts, then outreach review/delivery
  lifecycle and shared persistence. Existing sample walkthrough remains separate.
- See docs/implementation-voice-capture.md for the slice's exact boundary and validation.

## Current implementation snapshot (19 September, Codex pass)

The original scaffold checklist below is historical. This is the current status:

- Implemented: responsive GIC-inspired foundations; intake; patient file; cited findings;
  keyboard-accessible derived map; one-question flow; bilingual typed answer fallback;
  queue polling; pharmacist review with per-item decisions; signed advice; printable report.
- Explicit sample walkthrough works without keys and survives refresh in the same browser.
  Sample files use `DEMO-` IDs. It is not a two-device or live voice demo.
- API fixes: runtime contract validation, recomputed create/update flags, immutable identity,
  forward-only statuses, complete advice/reviewer required before signing, closed signed files,
  duplicate-create rejection, and an explicit 503 instead of silently dropping writes.
- Citation labels now link to inspectable MSK and FDA sources. Only 2 of 105 rows are sourced.
  No-match states explicitly say coverage is limited. Clinical priority calibration still needs review.
- Shared context now lives in the owner's Obsidian `team-context` folder with versioned repo
  exports. Follow `docs/context-workflow.md`; teammates can keep editing repo docs normally.

### Next integration priorities

1. A/B: connect Gemini structure/translation to /visit/new, then ElevenLabs Urdu TTS.
   `RecordingView` and `SpeakButton` report unavailable services honestly; no fake live audio.
2. A: Neon setup plus integration tests for shared persistence and concurrent writes.
3. B: test actual Urdu speech and readback on a real phone over HTTPS.
4. C: verify the fully live journey and record the fallback demo video.
5. Only then: document extraction, photo ID, correction UI, extra polish.

Do not use real patient data: authentication and verified pharmacist credentials are outside
this hackathon prototype. See `docs/pressure-test.md` for the remaining concrete risks.

## 0. Done
- [x] Repo, collaborators, docs, ADRs 0001–0007, glossary.
- [x] Wireframes: 16 boards (P1–P5 phone, W0–W4 web, 2A–2C pharmacist, sheet, flow, contract).
- [x] Scaffold: Next 16, Tailwind 4 tokens, Inter + Nastaliq, manifest (PWA), all 11 routes
      as placeholders, `lib/types.ts`, `lib/flags.ts` (pure, tested), `lib/files.ts`
      (Neon or canned), `/api/files` GET/POST, `/api/files/[id]` GET/PATCH, Drizzle schema.
- [x] `data/substances.json` patched: bitter_gourd, Pakistani aliases, 2 sourced demo rows.

## 1. Next 30 min — everyone
- [ ] `pnpm i && pnpm dev` → open `/` → click every route.
- [ ] Redeem perks (DO $200, ElevenLabs Creator, Cursor). Create Neon DB, put
      `DATABASE_URL` in `.env.local`, `pnpm db:push`.
- [ ] Assign owners. Branch.

## 2. Must — in demo order

### Stream B — phone (P1 → P2 → P3 → P4 → P5)
- [ ] P1 New case: 3 fields → `POST /api/files` (status `recording`).
- [ ] P2 Let her talk: mic (MediaRecorder) → `/api/transcribe` → Scribe (ur) → Gemini
      translate → `recordings[0]` + `history`. Ink-dot level meter. Big "Done".
- [ ] P3 Live translate (same component renders W0 at web width — one screen, two widths): push-to-talk, Scribe with language detect → `Turn` (by = language),
      TTS the translation in the other language. Typed fallback under each side.
- [ ] P4 Ask her this: one open question; tap → TTS `text.urdu`; opens P3; answer sets
      `answeredIn`.
- [ ] P5 Advice: `advice.urdu` large, Play in Urdu (TTS), verdict chips.

### Stream A — the file's brain
- [ ] `/api/structure`: Recording 1 english+urdu → Gemini structured output →
      `request[]`, `medList[]` (term ∈ substances ∪ unidentified, herWords mandatory),
      `questions[]` (english ends with `?`, why, from). Then `computeFlags`. Status →
      `structured`.
- [ ] `source` on every interaction row; Urdu aliases on the ~30 substances the demo could
      touch. Rows without source never flag — that is intended.
- [ ] `/api/tts` (ElevenLabs v3, ur) and `/api/transcribe` (Scribe) thin wrappers so B
      does not block on keys.
- [ ] W3 Import (only if above is green by 20:00): PDF/photo → Gemini → `Attachment.extracted`
      → merge as `document` items, raise questions on disagreement.

### Stream C — web + pharmacist (against the canned file from minute 0)
- [ ] Components from `DESIGN.md` / the component sheet — all of them, one file each in
      `components/`: Button (primary/secondary, phone 64 / web 48 / secondary 44),
      FlagPill, RoleTag + SourceGlyph, FileHeader (label 11px over value), RecordingCard
      (ink-dot level, never a waveform), MedicineRow (+ document empty state in ask
      colour), FlagCard (cannot render without citation), QuestionCard (+ phone variant,
      Urdu large), TranslateBubble (English left hairline / Urdu right fill; translation
      row = replay button), ListenButton (mic idle / square live / ink dot — never red),
      GlassToast + GlassTooltip, AdviceCard (Stop is the only colour), ReportSection
      (13px ink-muted heading; Limitations mandatory).
- [ ] Three densities as CSS: phone 25/15px, web 15/13px, report 17/15px — Urdu over
      English at ~0.7× in ink-muted. Add `text-phone-ur`, `text-web-ur`, `text-report-ur`
      utilities to `globals.css` so screens never hand-pick sizes.
- [ ] W1 File: sources rail + the file.
- [ ] W2 Findings: bubble map (SVG, derived), flag cards, questions, "Send to pharmacist"
      → status `sent`.
- [ ] 2A Queue (poll `/api/files` every 3 s) → 2B File open (map + advice draft +
      verdict radios + impression) → 2C Signed (PATCH advice, reviewedBy, status `signed`).
- [ ] W4 Report (print stylesheet). Limitations section always.

## 3. Saturday 20:00 — deploy (must: mic + camera need HTTPS on a phone)
- [ ] DigitalOcean App Platform, env vars, `DATABASE_URL`. Add to Home Screen on the demo phone.
- [ ] GoDaddy domain once the name is final.

## 4. Sunday 05:45 — stop building
- [ ] Rehearse twice: P1 → P2 (real Urdu) → W2 → P4 → P3 → 2B → 2C → P5.
- [ ] Product video (fallback).
- [ ] Devpost ×7: main, Bloomberg, ElevenLabs, ElevenLabs/MLH, Gemini/MLH, DigitalOcean/MLH,
      GoDaddy/MLH, Auctor. ElevenLabs showcase PR.

## Cut — do not reopen
Patient history across visits, Backboard, Synthea, notifications, WhatsApp, auth,
multi-pharmacist routing, dark mode, Solana / Tiger / Snowflake / SpaceXAI / OPEF.

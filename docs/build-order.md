# Build order

**Now: Saturday ~14:00. Hacking ends Sunday ~08:45.** ~18 hours. Reserve the last 3 for
rehearsal, video and Devpost. That leaves ~15 build hours × 3 people.

Owners: A = unassigned · B = unassigned · C = Codex implementation pass (team owner still to confirm).

Wireframes are the spec: `docs/specs/wireframes.html` (open in a browser). Contract:
`docs/specs/contracts.md` ↔ `lib/types.ts`. Canned file: `data/files/mw-1042.json` —
every screen after P2 renders against it with no env vars.


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

1. A/B: connect Scribe capture, Gemini structure/translation, and ElevenLabs Urdu TTS.
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

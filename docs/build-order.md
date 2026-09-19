# Build order

**Now: Saturday ~14:00. Hacking ends Sunday ~08:45.** ~18 hours. Reserve the last 3 for
rehearsal, video and Devpost. That leaves ~15 build hours × 3 people.

Owners: A = ___ · B = ___ · C = ___ (fill in, commit).

Wireframes are the spec: `docs/specs/wireframes.html` (open in a browser). Contract:
`docs/specs/contracts.md` ↔ `lib/types.ts`. Canned file: `data/files/mw-1042.json` —
every screen after P2 renders against it with no env vars.

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
- [ ] P3 Live translate: push-to-talk, Scribe with language detect → `Turn` (by = language),
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
- [ ] Components from `DESIGN.md`: file header, medicine row, flag card, question card,
      translate bubble, flag pill, buttons, role/source tags.
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

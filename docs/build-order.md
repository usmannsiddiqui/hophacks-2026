# Build order

Hacking ends **Sunday Sep 20, ~8:45 AM ET**. Last commit before that. Reserve the last
3 hours for rehearsal, video and Devpost writeups.

Owners: A = ___ · B = ___ · C = ___ (fill in, then commit).

## 0. Done

- [x] Repo, collaborators, first commit after 9 PM Friday.
- [x] Idea locked: Nani, counter operator, remote pharmacist, Urdu, flags from a table.
- [x] Glossary (`CONTEXT.md`), ADRs 0001–0006, contracts (`docs/specs/contracts.md`).
- [x] Wireframe prompt written; wireframes underway in Claude Design.

## 1. Hour 0–2 — everyone, together

- [ ] Redeem capped perks: Cursor Pro (400 seats), Grok credits (250), ElevenLabs
      Creator via Discord `#coupon-codes`, DigitalOcean $200.
- [ ] Urdu test: one Urdu sentence through ElevenLabs v3 TTS; one 15 s Urdu voice note
      through Scribe. Decide Urdu vs Hindi. Write the answer into ADR 0003.
- [ ] Scaffold: `create-next-app`, Tailwind 4, Geist/Inter + Noto Nastaliq, `lib/types.ts`
      from contracts, `data/cases/nani.json`, `.env.example`.
- [ ] Assign owners above. Each stream branches.

## 2. Must — the demo dies without it

### Stream A — data + logic
- [x] `data/substances.json` — 142 substances, 103 interactions, screening questions (already on main).
- [ ] Retarget it to Pakistan: add `aliases_ur` (Urdu script + roman Urdu), Pakistani
      brand names (Panadol, Brufen, Flagyl, Augmentin…), desi remedies (karela, methi,
      joshanda, hakeem powders). Drop/ignore `aliases_es`.
- [ ] Add a `source` field to every interaction row (ADR 0001 — every flag is citable).
      Demo rows first: karela × metformin, and whatever touches Nani's list.
- [ ] Map severities: file uses `major/moderate/minor`; contracts use `high/moderate`.
      Pick one, update `lib/types.ts`.
- [ ] `lib/normalize.ts` — Gemini structured output: utterance → `MedItem[]` or
      `unrecognised`.
- [ ] `lib/flags.ts` — pure function `medList × interactions → Flag[]`. Vitest for the
      four invariants.
- [ ] Neon `cases` table, Drizzle schema, `drizzle-kit push`.
- [ ] Routes: `POST /api/cases`, `PATCH /api/cases/:id` (append utterance / med item /
      status), `GET /api/cases`, `GET /api/cases/:id`, `POST /api/cases/:id/advice`.

### Stream B — voice + counter screen
- [ ] Scribe streaming STT → `Utterance` with `original` + `english`.
- [ ] Urdu prompts for the three intake questions (TTS; Agent if time).
- [ ] Counter screen states: idle → listening → flag → sent → advice.
- [ ] Hold banner on first flag.
- [ ] Readback: advice `textUr` → TTS → play button.

### Stream C — design + pharmacist console
- [ ] `DESIGN.md` + `app/globals.css` tokens (ADR 0006).
- [ ] Components: button, med-item card, flag card, question card, hold banner, plan
      card, transcript pair, queue row, flag pill, Urdu/English text pair.
- [ ] Pharmacist console: queue → case open (transcript / bubble map / action) →
      approved. Built against `data/cases/nani.json` from hour 2.
- [ ] Bubble map (nodes = med items, size = severity, edges = flags).

## 3. Cheap prizes — Saturday evening, ~1 h total
- [ ] Deploy to DigitalOcean App Platform.
- [ ] Register domain via GoDaddy (needs the final name).

## 4. Nice — only if section 2 is green by Saturday 6 PM
- [ ] Photo → product ID (Gemini vision) as a second `MedItem.source`.
- [ ] Gemini "question for pharmacist" fallback (ADR 0001 §2).
- [ ] ElevenLabs Agents Platform for real turn-taking instead of scripted prompts.

## 5. Last 3 hours — everyone
- [ ] Rehearse the 3-minute demo twice (open on Nani, Urdu live, flag, hold, cut to
      pharmacist, readback).
- [ ] Product video (fallback if live voice fails).
- [ ] Devpost: main + Bloomberg + ElevenLabs ×2 + Gemini + DigitalOcean + GoDaddy +
      Auctor. Seven writeups.
- [ ] ElevenLabs showcase PR + feedback form (swag).

## Cut — do not reopen
Patient history, Backboard, Synthea chart, notifications, follow-up scheduling, WhatsApp,
auth, multi-pharmacist routing, dark mode, Solana / Tiger / Snowflake / SpaceXAI / OPEF.

# Handoff → Codex: Mashwara (HopHacks Fall 2026)

**Written:** Sat 2026-09-19 ~14:15 ET by Claude (Opus 5), for Codex taking over implementation.
**Hacking ends:** Sun 2026-09-20 ~08:45 ET. Last commit must land before then. ~18 h left; the
last 3 are rehearsal + video + Devpost. That leaves ~15 build hours × 3 people.

Read in this order, then start: this file → `AGENTS.md` → `CONTEXT.md` → `docs/adr/0001–0007`
→ `docs/specs/contracts.md` → `docs/build-order.md` → open `docs/specs/wireframes.html` in a
browser (all 16 boards; it is the visual spec).

---

## 1. What this is

A free tool that puts a **qualified remote pharmacist** behind an **unqualified pharmacy
counter** in Pakistan. Premise (unverified stat, do not put on a slide without a source):
most counter "pharmacists" in Pakistan are not qualified.

- **Patient** (demo: Nasreen Bibi, 64 F, Urdu-only) talks into a phone, uninterrupted.
- **Counter operator** (a volunteer or the shopkeeper, English-speaking; demo: Imran Ali)
  holds the phone, then works the web app: the file builds, findings appear, questions get
  asked one at a time via live translate.
- **Remote pharmacist** (pro bono; demo: Sana Qureshi, Pharm-D) reviews from a queue, writes
  advice + keep/stop/swap per item, signs. Nothing is sold before this.
- Advice is played back in Urdu; a signed report goes home with her for a doctor.

Hackathon track: **Bloomberg — Most Philanthropic Hack** (one track only). Philanthropic
claim = free + two giving mechanisms (volunteers give time on the ground, pharmacists give
expertise remotely). Not urgent care — "advice, not emergencies," said out loud.

## 2. Repo + workspace

- GitHub: `usmannsiddiqui/hophacks-2026` (public). Local: `~/dev/projects/hophacks-2026`.
  Collaborators with write: `Rayyan2235`, `Ahmad-Darami`.
- `main` at `26b568c`. PRs #1 (docs), #2 (scaffold), #3 (build-order/CSS sync) merged.
- Obsidian vault (owner's strategy notes, not for the team):
  `~/dev/NathanDrake/01-Projects/Hophacks/` — `tracks.md` (all prizes + rubrics),
  `user-journey.md` (older 10-step version), `team-handoff-2026-09-19.md` (Ahmad's original,
  partly superseded), `wireframe-prompt.md`, `wireframes-2026-09-19.html`.
- Workflow (from owner's global rules): **pnpm**, one branch per task (plain kebab-case),
  push, PR, **merge commit**, never commit to `main` directly. No `Co-Authored-By` or
  "Generated with" lines. Secrets only in `.env.local`.

## 3. State of the code (all on `main`, `pnpm build` green, `pnpm test` 4/4)

```
app/globals.css        Tailwind 4 @theme tokens (ADR 0006), `urdu` utility, glass utilities,
                       three density utilities (text-phone-ur/en, text-web-*, text-report-*)
app/layout.tsx         Inter + Noto Nastaliq Urdu via next/font; PWA meta; viewport-fit=cover
public/manifest.json   standalone PWA, start_url /file/new; public/icon.svg
app/page.tsx           dev index linking all 11 screens
app/file/new           P1   app/file/[id]/record P2   app/file/[id]/translate P3+W0
app/file/[id]/ask P4   app/file/[id]/advice P5   app/file/[id] W1
app/file/[id]/findings W2   app/file/[id]/import W3   app/file/[id]/report W4
app/pharmacist 2A      app/pharmacist/[id] 2B+2C        ← all placeholders (label + h1 + Urdu line)
app/api/files/route.ts        GET (queue summary) / POST (create)
app/api/files/[id]/route.ts   GET / PATCH (shallow merge; ALWAYS recomputes flags; status forward-only → 409)
lib/types.ts           executable contract (PatientFile etc.) + speakerFor(heard)
lib/flags.ts           computeFlags(medList) — pure; the ONLY producer of Flag; skips rows w/o `source`, skips `minor`, skips `unidentified`
lib/files.ts           getFile/listFiles/saveFile — Neon if DATABASE_URL set, else canned MW-1042 (read-only)
lib/db/index.ts        getDb() lazy (import-time neon() broke `next build`)
lib/db/schema.ts       `files` table: id, status, data jsonb<PatientFile>, created_at, updated_at
drizzle.config.ts      postgresql, out ./drizzle. `pnpm db:push`
lib/__tests__/invariants.test.ts   the contract's 4 rules against the canned file
vitest.config.mts      (.mts — .ts triggered an ESM warning)
data/substances.json   143 substances, 105 interactions (see §5)
data/files/mw-1042.json canned PatientFile, status "sent", 6 items, 2 flags, 4 questions (q1 answered)
DESIGN.md              tokens + component rules transcribed from the wireframe sheet
.env.example           DATABASE_URL, GOOGLE_GENERATIVE_AI_API_KEY, ELEVENLABS_API_KEY
```

Deps installed: `ai`, `@ai-sdk/google`, `zod`, `drizzle-orm`, `@neondatabase/serverless`,
`nanoid`, `@elevenlabs/elevenlabs-js`; dev: `drizzle-kit`, `vitest`, `tsx`. Next 16.3.5,
React 19.2.8, Tailwind 4.

**Next 16 gotchas already hit:** route `params` is a `Promise` (`const { id } = await params`);
`node_modules/next/dist/docs/` has the real docs — read before assuming App Router APIs;
`next dev` re-adds an `<!-- nextjs-agent-rules -->` block to `AGENTS.md` — commit it, don't fight it.
**zsh gotcha:** quote `[id]` paths or `nomatch` errors.

## 4. Decisions (ADRs are the reasoning; this is the list)

| ADR | Decision | One-line why |
|---|---|---|
| 0001 | Flags only from the interaction table (with citation). LLM output is only ever a **question** (must end `?`). | No hallucinated clinical claim in front of Hopkins clinicians. RxNav API is dead. |
| 0002 | No chart, no cross-visit memory. File starts from zero; she may bring documents. | A Karachi counter has no records. Backboard/Synthea cut. |
| 0003 | Transcribe in Urdu, never dub. Store `spoken` + `translated` side by side. Hindi is the fallback language (owner: "sounds basically the same"). | Provenance pair (term + her words) must always be formable. |
| 0004 | Pharmacist is async. Nothing is sold before signing. Not urgent care. | Pro bono pharmacist may answer in hours. |
| 0005 | Next 16 + Neon/Drizzle (one table) + Gemini via Vercel AI SDK + ElevenLabs + DigitalOcean deploy + GoDaddy domain. | Team muscle memory from their Pearl project. |
| 0006 | Design = fork of the GIC foundations; three status tokens added; **colour only ever marks a flag or a question**. Light only. Nastaliq for all Urdu. | Design is the team's edge; tablet in daylight. |
| 0007 | Recording 1 is a **monologue** (single speaker by mic ownership). After that, **live translate** attributes turns by language heard (ur = patient, en = volunteer). Questions asked one at a time. **No diarisation, ever.** | Diarisation fails on a noisy counter; uninterrupted talk catches more. |

Decisions made in conversation but not in an ADR:
- Volunteer and shopkeeper are the **same role** ("counter operator"); same screens.
- One codebase serves phone + web + pharmacist. Phone = PWA (Add to Home Screen). Demo
  plan: iOS Simulator on the laptop for the phone *layout* (no mic in the simulator), the
  owner's real phone for the live Urdu moment, laptop browser for the pharmacist.
- **Deploy is a must by Sat 20:00**, not a nice-to-have: mic/camera need HTTPS on a phone.
- Photo → product ID, W3 document import: only if the must-list is green by 20:00.
- Bubble map is derived, never stored.
- Name **"Mashwara"** (Urdu: advice) is a **working name, not final**. Owner considered
  Nuskha. GoDaddy submission blocked until decided.

## 5. `data/substances.json` — what a teammate built and what I changed

Ahmad (probably) pushed it to `main` before the pivot: 142 substances, 103 interactions,
28 classes, `screening_questions`. Built for the *old* framing (Spanish/Haitian-Creole
aliases, "chart / Disclosed" language in `meta`). Interaction rows have `a, b, severity
(major|moderate|minor), effect, ask` — **no `source`** originally.

I added (PR #2): `bitter_gourd` substance; `aliases_ur` + Pakistani brand aliases on
acetaminophen (panadol), ciprofloxacin (ciproxin), metformin, amlodipine; two interaction
rows **with `source`** (`bitter_gourd×metformin` major, `ciprofloxacin×metformin` moderate);
a `meta.source_field_note`. **Rows without `source` never become flags** — intentional.
Stream A's job: add `source` to every row, Urdu aliases for the ~30 substances the demo
could touch. `lib/flags.ts` maps `major→high`, `moderate→moderate`, `minor→null`.

## 6. Streams and owners

Owners **not yet assigned** — `docs/build-order.md` has blanks. Owner (Muhammad) is likely
Stream C (design). Ahmad thinks in invariants → A. Rayyan → B. Confirm with them.

- **A — the file's brain:** `/api/structure` (Recording 1 → Gemini structured output →
  `request[]`, `medList[]` with mandatory `herWords`, `questions[]` with `why` + `from`),
  `source` on every interaction row, `/api/tts` + `/api/transcribe` wrappers, W3 import if time.
- **B — phone P1→P5:** MediaRecorder → Scribe (ur) → translate; live translate with
  language detect → `Turn`; TTS of `text.urdu`; P5 playback.
- **C — components + web + pharmacist:** every component in `DESIGN.md`, W1, W2 (SVG bubble
  map), 2A queue (poll every 3 s), 2B/2C, W4 print. Build against `data/files/mw-1042.json`
  from minute 0 — no keys needed.

## 7. Prizes to submit (Devpost, seven writeups; Sunday 05:45 start)

Main (auto) · Bloomberg (track) · ElevenLabs direct (judged on *agentic depth*, lifelike
interaction — do not use ElevenLabs as a dumb mic/speaker) · ElevenLabs/MLH · Google
Gemini/MLH · DigitalOcean/MLH · GoDaddy/MLH · Auctor AI. Plus ElevenLabs showcase PR
(`showcase.elevenlabs.io`) + feedback form for swag. Full rubrics: vault `tracks.md` and
`docs/prizes-and-rubrics.md`. Rules: first commit after 9 PM Fri (ours 21:45 ✓), last commit
before end, in-person demo, all teammates on the Devpost.

Perks not yet redeemed: DigitalOcean $200, ElevenLabs Creator (Discord `#coupon-codes`),
Cursor Pro (400 seats), Grok credits (250).

## 8. Demo (3 min, in this order)

P1 New case → P2 she talks in Urdu (real, on the owner's phone) → W2 findings (2 flags,
bubble map, 4 questions) → P4 ask her this (phone speaks Urdu) → P3 live translate answer →
2B pharmacist reviews → 2C signs → P5 advice plays in Urdu. Say "free" and "advice, not
emergencies" out loud. Never open on the pharmacist dashboard.

## 9. Open items / risks

1. **Urdu TTS quality untested.** Owner says ElevenLabs has Urdu (v3). If poor → Hindi. Test
   in the first 10 minutes of Stream B.
2. **No API keys in the repo.** Each dev needs `.env.local` with the three keys. Canned mode
   works without any.
3. **Neon DB not created yet.** `pnpm db:push` after `DATABASE_URL`.
4. **Name not final** → blocks GoDaddy + every header string (currently "Mashwara").
5. **"95% unqualified" stat** has no source. Find one or soften it in the pitch.
6. `app/file/[id]/translate` must render both P3 (390px) and W0 (1440px) — one component,
   two widths.
7. `history` vs `recordings[0]`: history is the same text as one block; keep them in sync in
   `/api/structure`.

## 10. Suggested skills for the next agent

- `superpowers:brainstorming` is **not** needed — design is locked. Do not reopen ADRs.
- `superpowers:test-driven-development` / `tdd` for `lib/` logic (`/api/structure` parsing,
  `computeFlags` edge cases, status transitions).
- `superpowers:verification-before-completion` before every PR (`pnpm build && pnpm test`).
- `superpowers:using-git-worktrees` if three streams work in one checkout.
- `frontend-design` / `impeccable` / `emil-design-eng` for Stream C components — the sheet
  in `wireframes.html` is the source, `DESIGN.md` the rules.
- `claude-api` is irrelevant — the LLM is **Gemini** (`@ai-sdk/google`); use `generateObject`
  with a zod schema for `/api/structure`.
- `anthropic-skills:handoff` again when handing back.

## 11. Things I did NOT do

- No real screen implemented (all 11 are placeholders).
- No ElevenLabs or Gemini call written.
- No Neon DB created, no deploy, no domain.
- Did not touch Ahmad's `screening_questions` — they map naturally onto P2's Urdu prompt
  card and P4; use them.
- Did not add the Hophacks row to the vault's root `CLAUDE.md` project table (owner edits
  that file only on explicit ask).

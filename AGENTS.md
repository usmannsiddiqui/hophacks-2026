# Mashwara — agent + team config

Working name: **Mashwara** (not final). HopHacks Fall 2026, JHU. 36 hours, three people.

## Read first

1. `CONTEXT.md` — the glossary. Terms in code, tests and conversation match it.
2. `docs/adr/` — decisions we do not reopen at hour 20. Six of them, all load-bearing.
3. `docs/specs/contracts.md` — the two JSON shapes every stream builds against.
4. `docs/build-order.md` — what is done, what is next, what is cut.
5. `docs/user-journey.md` — the 10 steps and the 3-minute demo beat.

Strategy, prize math and pitch notes live in Muhammad's Obsidian vault
(`01-Projects/Hophacks/`), not here.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Vercel AI SDK with
`@ai-sdk/google` (Gemini) · ElevenLabs (Scribe STT, TTS/Agent) · Neon Postgres +
Drizzle (one `cases` table) · pnpm. See ADR 0005.

## Workflow

- **pnpm** only. `pnpm dev`, `pnpm build`, `pnpm test`.
- One branch per task, plain kebab-case (`counter-transcript-view`). Push, open a PR,
  merge commit. Nobody commits to `main` directly — even at 3 AM.
- **Hackathon git rule:** last commit must land before hacking ends Sunday morning.
  Nothing after.
- Secrets in `.env.local` only. `.env.example` lists every key with an empty value.
- When a new domain term appears in code, add it to `CONTEXT.md` in the same commit.
- A decision that changes an ADR gets a new ADR that supersedes it. Do not edit old ones.

## Streams

| Stream | Owns |
|---|---|
| A — Data + logic | closed vocabulary, interaction table, Gemini normalization, question fallback, Neon `cases`, API routes |
| B — Voice + counter | Scribe live transcript, Urdu prompts, counter screen, Urdu readback |
| C — Design + pharmacist | `DESIGN.md` + tokens, components, bubble map, pharmacist console, video, Devpost |

Owners are assigned in `docs/build-order.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

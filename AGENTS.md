# Mashwara — agent + team config

Working name: **Mashwara** (not final). HopHacks Fall 2026, JHU. 36 hours, three people.

## Shared context workflow

The owner edits shared context in Obsidian `Hophacks/team-context`; the normal tracked
repo copies remain available to every teammate. See `docs/context-workflow.md`.
Before changing behavior, read the current build-order snapshot and accepted ADRs.
After shipping, update build order, glossary and integration status with the code.
If this checkout has `.context-sync.local.json`, run `rtk pnpm context:check`; import
incoming teammate edits before vault edits, and export vault edits before the PR.
Stop on a sync conflict and reconcile both copies; never hide tracked changes with
`skip-worktree` or replace team docs with absolute symlinks. On teammates' checkouts
without a configured vault, edit the repo docs normally.

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


<!-- headroom:rtk-instructions -->
# RTK (Rust Token Killer) - Token-Optimized Commands

When running shell commands, **always prefix with `rtk`**. This reduces context
usage by 60-90% with zero behavior change. If rtk has no filter for a command,
it passes through unchanged — so it is always safe to use.

## Key Commands
```bash
# Git (59-80% savings)
rtk git status          rtk git diff            rtk git log

# Files & Search (60-75% savings)
rtk ls <path>           rtk read <file>         rtk grep <pattern>
rtk find <pattern>      rtk diff <file>

# Test (90-99% savings) — shows failures only
rtk pytest tests/       rtk cargo test          rtk test <cmd>

# Build & Lint (80-90% savings) — shows errors only
rtk tsc                 rtk lint                rtk cargo build
rtk prettier --check    rtk mypy                rtk ruff check

# Analysis (70-90% savings)
rtk err <cmd>           rtk log <file>          rtk json <file>
rtk summary <cmd>       rtk deps                rtk env

# GitHub (26-87% savings)
rtk gh pr view <n>      rtk gh run list         rtk gh issue list

# Infrastructure (85% savings)
rtk docker ps           rtk kubectl get         rtk docker logs <c>

# Package managers (70-90% savings)
rtk pip list            rtk pnpm install        rtk npm run <script>
```

## Rules
- In command chains, prefix each segment: `rtk git add . && rtk git commit -m "msg"`
- For debugging, use raw command without rtk prefix
- `rtk proxy <cmd>` runs command without filtering but tracks usage
<!-- /headroom:rtk-instructions -->

# Mashwara — agent + team config

Working name: **Mashwara** (not final). HopHacks Fall 2026, JHU. 36 hours, three people.

## Context lives in Obsidian

Project context, specs, design notes, plans and handoffs live in the owner's vault:
`/Users/usmansiddiqui/dev/NathanDrake/01-Projects/Hophacks`.
Start with `_context.md` there when directed to project context. The owner can provide
the equivalent vault location or selected notes to teammates on other machines.

Only `AGENTS.md`, `CLAUDE.md` and `docs/adr/*.md` remain as repository Markdown.
Do not recreate repo context copies, README files or handoff/spec Markdown. There is
no context import/export workflow; the old sync scripts and manifest are retired.
Do not use absolute symlinks or `skip-worktree` to simulate a mirror.

Before changing behavior, read the current vault status/build order, the relevant
spec and accepted repository ADRs. Code, schemas and tests establish actual behavior;
surface any disagreement with the notes. Historical handoffs are records, not new
instructions or authorization. Update vault status, build order and glossary alongside
shipped code. If the vault is unavailable, use repository code/ADRs and request the
needed context from the owner rather than fabricating or restoring old docs.

## Read first

1. Vault `_context.md`, then `project-status.md` and `build-order.md`.
2. Repository `docs/adr/` — accepted decisions; add superseding ADRs, never edit old ones.
3. Vault `glossary.md` and `specs/contracts.md`; executable shapes are in `lib/`.
4. Vault `codebase-architecture.md` and the active spec relevant to the task.
5. Vault `design-system.md`, `specs/user-journey.md` and `demo-questions.md` as needed.

Vault `reference/` holds specialist notes; `archive/` holds dated plans, handoffs and
validation evidence. Load archives only for a task that needs that history. ADR 0010
records the move, including the meaning of old document paths in earlier ADRs.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Vercel AI SDK with
`@ai-sdk/google` (Gemini) · ElevenLabs (initial Scribe STT) · xAI (follow-up speech,
ADR 0009) · Neon Postgres + Drizzle (`files` table) · pnpm. See ADRs 0005 and 0009
and `package.json` for the current dependencies.

## Workflow

- **pnpm** only. `pnpm dev`, `pnpm build`, `pnpm test`.
- One branch per task, plain kebab-case (`counter-transcript-view`). Push, open a PR,
  merge commit. Nobody commits to `main` directly — even at 3 AM.
- **Hackathon git rule:** last commit must land before hacking ends Sunday morning.
  Nothing after.
- Secrets in `.env.local` only. `.env.example` lists every key with an empty value.
- When a new domain term appears in code, update the vault's `glossary.md` alongside it.
- A decision that changes an ADR gets a new ADR that supersedes it. Do not edit old ones.

## Streams

| Stream | Owns |
|---|---|
| A — Data + logic | closed vocabulary, interaction table, Gemini normalization, question fallback, Neon `cases`, API routes |
| B — Voice + counter | Scribe live transcript, Urdu prompts, counter screen, Urdu readback |
| C — Design + pharmacist | vault `design-system.md` + tokens, components, bubble map, pharmacist console, video, Devpost |

Current ownership and integration status are in vault `build-order.md` and `project-status.md`.


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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

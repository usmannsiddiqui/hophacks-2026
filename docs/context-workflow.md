# Shared context and Obsidian

Muhammad's editable source of truth is `Hophacks/team-context/` in his Obsidian vault.
The matching files in this repository are the versioned team copy. They remain regular
tracked files so a teammate's clone is complete. Only paths in `context-files.json` sync.
Strategy notes and historical handoffs outside that folder are never exported.

`AGENTS.md` remains the repository-owned entry point. Code, JSON data, and tests remain
authoritative for runtime behavior; vault prose must be updated to match shipped code.
Historical ADRs are immutable. Add a superseding ADR rather than changing one.

## Owner workflow

Use the full vault path via `--vault`, or set `MASHWARA_CONTEXT_VAULT` in your shell.
It should point to the new `team-context` folder, not the whole vault.
The owner's checkout also has an ignored `.context-sync.local.json` containing this path,
so `rtk pnpm context:check`, `context:import` and `context:export` work without extra arguments.

```sh
rtk pnpm context:check --vault /path/to/Hophacks/team-context
rtk pnpm context:import --vault /path/to/Hophacks/team-context
rtk pnpm context:export --vault /path/to/Hophacks/team-context
```

After pulling, import teammate changes before editing the vault. After shipping a feature,
update build order, current behavior and blockers in the vault, then export and commit
the corresponding repo copies with the code. Run check before opening the PR.
No background process or Git hook overwrites either side.

If both sides changed, the command stops before copying anything. Compare the two versions,
merge deliberately into both copies, then rerun import/export to record the common baseline.
A missing file is an error, not a deletion instruction. First-time setup uses
`rtk pnpm context:init --vault /path/to/Hophacks/team-context` and refuses to overwrite
an existing differing vault file.

## Teammates

Teammates can continue reading and editing the repository docs normally. They do not need
Obsidian, the owner's filesystem path, or the sync commands. The owner imports their
changes after pulling. Each feature PR should include its context update.

## Decluttering locally

Hide `docs/`, `CONTEXT.md`, and `DESIGN.md` in your editor's file explorer if desired.
Do not delete tracked files, commit absolute symlinks, or use `skip-worktree` to hide edits.
Those approaches either break teammates' checkouts or conceal incoming changes. Keeping
the small mirrors on disk preserves Git's normal conflict detection and agent discoverability.

## Current vs historical notes

Start in `team-context/START-HERE.md` in Obsidian. Earlier handoffs elsewhere in the vault
remain historical snapshots. When prose disagrees, accepted ADRs and the executable contract
take precedence; the current build order describes actual completion, not planned completion.

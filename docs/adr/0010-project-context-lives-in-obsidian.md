# 0010 — Project context lives in Obsidian

**Status:** Accepted from explicit owner direction, 20 September 2026.
**Supersedes:** Repository documentation-location references in earlier ADRs only.
Product, clinical, provider and design decisions are unchanged.

## Decision

Project Markdown belongs in the owner's Obsidian vault at
`/Users/usmansiddiqui/dev/NathanDrake/01-Projects/Hophacks`. Keep `AGENTS.md`,
`CLAUDE.md` and accepted ADRs in this repository. Other Markdown, including READMEs,
specs, design notes, implementation records and handoffs, moves to the vault.

The durable entry notes are `_context.md`, `project-status.md`, `build-order.md`,
`codebase-architecture.md`, `demo-questions.md`, `design-system.md` and `glossary.md`.
Focused specs and reference notes live in subfolders; dated records live in `archive/`.
There is no synchronized repository mirror. Retire `context-files.json`, the Python
sync scripts and the `context:*` package commands. Do not replace them with symlinks
or hidden Git index flags. Repository ignore rules discourage new context Markdown.

Code, schemas and tests remain authoritative for executable behavior. Update the
vault alongside implementation changes. Teammates without this vault use code/ADRs
and context supplied by the owner; the repository no longer includes the full notes.

## Earlier paths

Existing ADRs remain byte-for-byte historical records. Interpret their old prose
references using this mapping; do not restore the deleted documents to satisfy them.

| Previous repository path | Current vault path relative to Hophacks |
|---|---|
| `CONTEXT.md` | `glossary.md` |
| `DESIGN.md` | `design-system.md` |
| `docs/build-order.md` | `build-order.md` |
| `docs/specs/contracts.md` | `specs/contracts.md` |
| `docs/user-journey.md` | `specs/user-journey.md` |
| `docs/context-workflow.md` | `_context.md` |
| `docs/handoffs/` | `archive/handoffs/` |

The HTML wireframes remain at `docs/specs/wireframes.html`. Runtime fixtures stay in
the repository; their attribution stays beside the audio in `ATTRIBUTION.txt`.

## Migration and recovery

Every original repo/vault context file, including differing versions and uncommitted
handoffs, is preserved in the vault's
`archive/context-migration-2026-09-20-originals.zip`. The adjacent
`context-migration-manifest.json` records SHA-256 hashes and destinations. Verify the
archive and destinations before removing sources. Old documents remain recoverable
from Git history as well; the migration does not rewrite history or other branches.

# ElevenLabs workstream

Owner: Rayyan (Stream B, voice + phone). Docs only here; code lives in the paths listed below.

| File | What |
|---|---|
| `README.md` | Status so far + where voice touches the user journey |
| `research.md` | Scribe API options + Scribe vs Gemini vs Grok comparison |
| `plan.md` | Proposed STT implementation plan (nothing built yet) |

## Where we are (Sat Sep 19)

- Repo set up, `origin/main` merged into `ElevenLabs` (scaffold PR #2, build-order PR #3).
- `pnpm` 9.15.9 installed via npm (corepack fails on this machine), `pnpm i` clean, 4/4 invariant tests pass, `pnpm dev` runs on :3000 against the canned file `MW-1042` (Nasreen Bibi, Karachi).
- Local-only: `docs/research/` and `CLAUDE.local.md` are gitignored.
- Not started: any voice code. `.env.local` keys, `/api/transcribe`, `/api/tts` and the P1-P5 screens are all still placeholders.
- The Notion "HopHacks 2026" page is empty; repo docs are the source of truth.

## Where STT sits in the journey (ADR 0003, 0007)

No TTS in this workstream (decided 2026-09-19). Speech-to-text only.

| Step | Screen | Voice work |
|---|---|---|
| Recording 1 (2-3 min monologue) | P2 | MediaRecorder -> Urdu STT -> Gemini translate -> `recordings[0]` |
| Live translate | P3 / W0 | push-to-talk, STT with language detect -> `Turn` (`by` derived from language), translation shown as text |
| Ask her this | P4 | answer captured through P3 |

Hard rules: no Dubbing; transcribe in-language; store `original` + `english`; never ask a model who was speaking.

## Ownership / conflict boundaries

Mine: `app/file/new/`, `record/`, `translate/`, `ask/`, `advice/`, `app/api/transcribe/`, `app/api/tts/`, `lib/voice/`.

Not mine: `lib/types.ts`, `lib/flags.ts`, `data/substances.json`, `components/*`, `globals.css`, `package.json`.

Note: `build-order.md` assigns `/api/tts` and `/api/transcribe` to Stream A. Confirm with them before building.

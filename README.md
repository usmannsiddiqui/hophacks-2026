# Mashwara (working name)

HopHacks Fall 2026 · JHU · Bloomberg "Most Philanthropic Hack" track.

A free tool that puts a qualified remote pharmacist behind an unqualified pharmacy
counter. The patient speaks Urdu; the counter sees English and flags; a pro bono
pharmacist approves; the patient hears the plan in Urdu.

<img width="474" height="784" alt="journey sketch" src="https://github.com/user-attachments/assets/b47e1652-f827-4b3c-8218-4031b51e6858" />

Start with `AGENTS.md`, then `CONTEXT.md`, then `docs/adr/`.

Run `pnpm install` and `pnpm dev`, then open `/file/new`. The **Sample walkthrough**
works without keys: fictional intake → findings → follow-up → pharmacist review →
signed Urdu text → printable report. It is saved only in this browser. Live speech,
translation, Urdu audio, and cross-device Neon persistence still need integration.

Shared context is authored in the owner's Obsidian `Hophacks/team-context` folder and
exported here as regular versioned files. Teammates can read and edit these docs as usual.
See [context workflow](docs/context-workflow.md) for conflict-checked sync commands and
[pressure-test findings](docs/pressure-test.md) for what is fixed and what remains.

| Doc | What |
|---|---|
| `AGENTS.md` | team + agent workflow, stack, streams |
| `CONTEXT.md` | glossary — the words we use |
| `docs/adr/` | seven accepted architectural decisions |
| `docs/specs/contracts.md` | `PatientFile` and related JSON, frozen |
| `docs/build-order.md` | done / must / nice / cut |
| `docs/user-journey.md` | 10 steps + the 3-minute demo |
| `docs/prizes-and-rubrics.md` | every prize, every rubric |
| `docs/specs/wireframe-prompt.md` | the Claude Design brief |
| `data/substances.json` | closed vocabulary + interaction table (source of truth for what exists and what interacts) |
| `docs/handoffs/` | earlier team handoffs (partly superseded — ADRs win) |


### First live integration: Urdu capture
Open /visit/new (also linked from intake). Add ELEVENLABS_API_KEY to .env.local, restart
the server, enter fictional patient details, record/upload Urdu audio, transcribe and
review. Microphone access requires localhost or HTTPS. No Neon or Gemini key is needed
for this slice. Use fictional audio; provider retention follows the ElevenLabs account.

Drafts are stored in the current browser tab, with original and corrected Urdu separate.
Start another visit retains previous transcripts under Saved transcripts. Raw audio is
kept only in memory for playback/retry. English analysis and pharmacist submission are
not wired yet. See docs/implementation-voice-capture.md.

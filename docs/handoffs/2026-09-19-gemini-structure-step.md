# Handoff — Stream A, the structure step

**Sep 19, 2026 · written for whoever picks this up next**

Branch `Ahmad-Gemini-branch`, three commits, pushed. Everything below is verified unless
it says otherwise. Read `AGENTS.md` first for the project rules; this covers only what
changed today and what is still wrong.

---

## 1. What landed

Step 2 of the pipeline: a transcript becomes `request[]`, `medList[]` and `questions[]`,
then the interaction table is read over the result.

| Commit | What |
|---|---|
| `67fe76c` | The structure step: `lib/vocab.ts`, `lib/transcript.ts`, `lib/structure.ts`, `lib/insights.ts`, `app/api/structure/route.ts` |
| `b232b58` | Mock test over the whole pipeline; pins the citation rule |
| `6ad4560` | Fixes for double-counting on re-run, and `prescribed` coming from voice |

**No PR is open.** The branch is pushed and tracking `origin/Ahmad-Gemini-branch`.
`gh` is installed at `C:\Program Files\GitHub CLI\gh.exe` (not on the shell PATH) but
has never been logged in — no `~/.config/gh/hosts.yml`, no `GH_TOKEN`. `git push` works
because git uses Git Credential Manager, which `gh` does not read. Either run
`gh auth login`, or open the PR at
<https://github.com/usmannsiddiqui/hophacks-2026/pull/new/Ahmad-Gemini-branch>.

## 2. How the step is built, and why

```
data/substances.json          <- loaded FIRST, before any transcript
  |-- vocabularyPrompt()      143 substances, Urdu aliases where we have them
  |-- interactionPrompt()     105 rows, each marked CITABLE or ASK-ONLY
        |
        v
  Gemini (gemini-3.5-flash, temperature 0)   <- transcript goes in here, second
        |
        v
  normalise()                 distrusts the result, see below
        |
        +--> computeFlags()   lib/flags.ts, table only, never the model
        +--> readMedList()    lib/insights.ts, what the table still owes
```

The ordering is deliberate. The vocabulary and the table constrain the model up front
rather than correcting it afterwards. **The model's output schema has no flag-shaped
field**, so ADR 0001 is enforced structurally, not by instruction — it has nowhere to put
an interaction claim even if it tries.

### The files

- **`lib/vocab.ts`** — the closed vocabulary and interaction table. `canFlag()` mirrors
  the rule in `lib/flags.ts` so the two never disagree about what is citable.
- **`lib/transcript.ts`** — the ElevenLabs Scribe boundary. **Nothing here calls out**;
  it states the shape Stream B must hand over, since the mic path is not built.
  `locate()` slides a quoted phrase over Scribe's word timings so a med item points at
  the second it was said. It returns `null` rather than guessing — the pharmacist uses
  that timestamp to replay audio and check us, so a wrong one is worse than none.
- **`lib/structure.ts`** — the Gemini call, then distrusts it: terms outside the
  vocabulary downgrade to `unidentified` (and are reported in `rejectedTerms`), items
  with no words of hers are dropped (contract rule 2), questions are forced interrogative
  (contract rule 3), `prescribed` from voice becomes `takes`, ids do not collide.
- **`lib/insights.ts`** — the deterministic read, independent of the model. Works out
  which questions the table *proves* are owed (every ASK-ONLY row whose two substances
  are both present, plus every `unidentified` item) and which nothing covers. Uncovered
  ones are **reported, not filled in** — writing Urdu for a question nobody asked would
  be a fabrication.
- **`app/api/structure/route.ts`** — orchestration. Status moves to `structured`, never
  backwards.

### Glossary additions

`citable row`, `ask-only row`, `owed question`, `uncovered` are in `CONTEXT.md`.

## 3. Verified, and how

Live against the real Gemini API, Urdu monologue in:

```
m7   acetaminophen   requested   t=8    پیناڈول
m8   ciprofloxacin   requested   t=8    سیپروکسن
m9   metformin       takes       t=11   سفید گولی لیتی ہوں شوگر کے لیے
m10  bitter_gourd    remedy      t=19   کریلے کا جوس
m11  unidentified    remedy      t=25   حکیم صاحب کا سفوف

flags: high m9+m10 (NHS · NIH ODS) · moderate m8+m9 (Ciprofloxacin FDA label)
rejectedTerms: []   uncovered: []
```

It asked *"What is the name of your white sugar tablet, and is it metformin?"* instead of
asserting it. That is the ADR 0001 behaviour on live output.

- **27 tests**, 3 files, all green. `tsc` and `eslint` clean.
- The mock test (`lib/__tests__/pipeline.test.ts`) runs the whole step with
  `generateObject` mocked, so **it needs no API key** — it works in CI and on a fresh
  clone.
- **Mutation-checked.** Deleting the `!row.source` check from `computeFlags` originally
  left all 25 tests green, because the demo scenario contains no uncited pairs. There is
  now a test using `warfarin + st_johns_wort` (major, real, uncited) that fails on that
  mutant. Disabling `isKnownTerm` fails 5 tests.

### Not verified

- Every Recording after the first (`answers[]` is always empty).
- `/api/transcribe` and `/api/tts` — not written. Stream B.
- Attachments / W3 import. `structureTranscript` only handles voice.

## 4. Traps

**`/api/structure` computes but does not persist.** `DATABASE_URL` is empty, so
`saveFile()` returns early (`lib/files.ts:24`, "canned mode is read-only"). The route
returns the merged file in its response and **throws it away**. Every run starts from the
canned `MW-1042` again. Create the Neon DB and run `pnpm db:push` before assuming state
sticks.

**Do not test the endpoint with `curl` from Git Bash on Windows.** It mangles Urdu to
`????`. This cost time today and looked like an app bug. Drive it from Node with `fetch`
instead — a working script is in §7.

**Latency is 12–18s** for a 40-word transcript. ADR 0007 says the file builds while she
is at the counter, so it is survivable, but the real monologue is minutes long and this
has not been measured at that length.

**`.env.local`** currently has `GOOGLE_GENERATIVE_AI_API_KEY` set;
`DATABASE_URL` and `ELEVENLABS_API_KEY` are empty. That key was pasted into a chat
transcript and **should be rotated**.

**pnpm** is 9.15.9, installed via `npm install -g pnpm@9.15.9`. `corepack enable` fails
with `EPERM` on this machine — it wants to write into `C:\Program Files\nodejs` and needs
admin. Do not retry corepack.

## 5. Known gaps, in priority order

**1. Only 2 of 105 interaction rows are citable.** `computeFlags` requires a `source`,
so exactly two pairs in the entire table can ever flag — the two demo rows. The other 103
include `warfarin + st_johns_wort` and `warfarin + vitamin_k`, both `major`, both
unflaggable. They route to questions, which is ADR-correct, but off the canned script the
bubble map will look far emptier than the table implies. **Adding `source` to more rows
is pure data work and directly buys demo surface.**

**2. Only 4 of 143 substances have Urdu aliases** (`amlodipine` has the key but an empty
array). All five terms the canned demo needs are covered, so that path works — but the
transcript is Urdu, and anything off-script gives the model very little to match against.
`docs/build-order.md` lists this as a Stream A todo.

**3. `app/globals.css` is still the stock Next.js starter.** Verified in the browser:
`body` computes to white, not the `#fefffc` surface token; every `--color-*` token from
`DESIGN.md` is unset; `bg-surface` / `text-ink` / `text-ink-muted` generate no CSS; there
is no `.urdu` utility, so Urdu renders LTR in Arial. This contradicts `DESIGN.md`
("Executable truth is `app/globals.css`") and `docs/build-order.md`, which lists
"Tailwind 4 tokens" as done. **Anyone building Stream C components will get silently
unstyled output.** Not started — it is Stream C's file and this branch is Stream A.

**4. All 11 route pages are 3-line stubs.** Only `app/page.tsx` (the dev index) has
content.

**5. `docs/handoffs/2026-09-19-team-handoff-ahmad.md` describes a different product** —
a Haitian Creole clinic kiosk reconciling a Synthea chart, with Disclosed / Undisclosed /
Ask flags and Backboard memory. The ADRs, wireframes and code describe Mashwara: an Urdu
pharmacy counter where, per ADR 0002, everything starts from zero with no chart. The two
models are incompatible and the flag taxonomy differs. **This work assumed the ADRs win**,
since ADRs supersede and they match the committed code and the component sheet. Confirm
with the team before building further on either.

**6. `CONTEXT.md` was wrong** and is corrected here: it claimed the interaction table has
"~40 rows" and that "every row has a citable source." It is 105 rows and 2 sources.

**7. The wireframe is not new.** A `wireframes-2026-09-19.html` was handed over as a new
design. All 16 frames are byte-identical to the committed `docs/specs/wireframes.html`
after normalising export-time random IDs. Nothing to adopt; if changes were expected,
something was lost between the design tool and the download.

## 6. What to do next

- Curate `source` on the interaction rows the demo could touch (gap 1) — highest value.
- Urdu aliases on the ~30 substances the demo could touch (gap 2).
- Wire `globals.css` to the `DESIGN.md` tokens (gap 3) — blocks all of Stream C.
- Neon DB + `pnpm db:push` so structure results persist.
- `/api/transcribe` so Stream B can hand real Scribe output to this step.
- Open the PR.

## 7. Commands

```bash
pnpm dev            # http://localhost:3000, dev index lists every route
pnpm test           # 27 tests, no API key needed
pnpm lint
npx tsc --noEmit
```

Drive the structure endpoint from Node (not curl — see §4):

```js
const urdu = "روز صبح ایک سفید گولی لیتی ہوں شوگر کے لیے۔";
const words = urdu.split(/[\s\u060C\u06D4.]+/).filter(Boolean)
  .map((text, i) => ({ text, start: +(8 + i * 0.6).toFixed(1), end: +(8.4 + i * 0.6).toFixed(1) }));

const res = await fetch("http://localhost:3000/api/structure", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fileId: "MW-1042",
    transcript: { n: 1, seconds: 170, urdu, english: "Every morning I take one white tablet for sugar.", words },
  }),
});
console.log(JSON.stringify(await res.json(), null, 2));
```

Route responses: `400` missing fields · `404` unknown file · `503` no API key ·
`502` model call failed · `200` with `{ file, insights }`.

---

## The rules this step is built on — do not relax them

1. **A flag comes only from a cited row in `data/substances.json`.** Never from the
   model. Everything else is a question (ADR 0001).
2. **A question's `english` ends with `?`** and renders interrogative. Never a statement
   about her (ADR 0001).
3. **`term` is from the closed vocabulary or `unidentified`.** `unidentified` is a useful
   answer, not a failure — it drives the follow-up question.
4. **A voice or photo item carries her words.** Always. No exceptions (contract rule 2).
5. **Speaker is never inferred from a voice.** Recording = mic ownership, Turn = language
   heard (ADR 0007).
6. **Colour only ever marks a status.** No coloured buttons, borders or accents. No dark
   mode. Urdu is Noto Nastaliq, RTL, never a Latin fallback (ADR 0006, `DESIGN.md`).

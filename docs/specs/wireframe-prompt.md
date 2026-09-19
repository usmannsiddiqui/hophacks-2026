---
title: "HopHacks F26 — Claude Design wireframe prompt"
tags: [hophacks, design, wireframes, prompt]
date: 2026-09-19
status: ready
---

# Claude Design prompt — Mashwara wireframes

> Paste everything below the line into Claude Design. Attach the GIC design-system artifact link as reference: https://claude.ai/artifact/JqHZX2RGakx9sDDq9BZoU3

---

## Prompt

Design mid-fidelity wireframes for **Mashwara** (working name — treat as placeholder text), a free tool that puts a qualified remote pharmacist behind an unqualified pharmacy counter in Pakistan. Two devices, two users, one case flowing between them. This is a 36-hour hackathon MVP; every screen must be buildable in Next.js + Tailwind by one person in under a day, so keep component count low and reuse aggressively.

### The story the screens must tell

Nani, 60s, walks into a corner pharmacy in Karachi with a fever and asks for two medicines. She speaks only Urdu. The person behind the counter (a volunteer or the shopkeeper) holds a tablet. The tablet talks to Nani in Urdu and shows the counter person a live English transcript. It asks what else she takes — medicines, home remedies, anything from a hakeem. Everything she says is turned into a medication list with her exact words beside each clinical term. A verified interaction table flags risky combinations (e.g. karela + metformin). The counter person holds the sale, sends the case to a remote volunteer pharmacist, who reviews and writes advice. The advice is read back to Nani in Urdu. Not urgent care — advice, not emergencies.

### Design foundations (fork of the attached system — use its neutrals, radius ladder, glass recipe, focus rule, Inter; ignore its imagery, logo, blue panel and marketing-scale spacing)

- **Ground:** warm off-white paper (`surface` #fefffc), `ink` #2c2c2c text, `ink-muted` #646464 secondary, `line` #dee2de hairlines. No dark mode.
- **Color is almost absent. The only color on any screen is a flag.** Add exactly three status tokens: `clear` (muted sage green), `ask` (amber), `flag` (red). Nothing else is colored — no blue buttons, no purple, no gradients.
- **Type:** Inter for all English/Latin. **Noto Nastaliq Urdu** for every patient-facing Urdu string — rendered right-to-left, generous line-height (Nastaliq needs ~1.9). Urdu is never shown in a Latin fallback.
- **Density:** app spacing 4/8/12/16/24/32. Counter screen = large type (18–24px body, 32px+ for the one Urdu prompt), one thing at a time, readable at arm's length in daylight. Pharmacist screen = dense, 14px body, multi-column.
- **Glass** only for floating elements (the hold banner, the send button, toasts): translucent fill + 1px translucent border + backdrop blur + soft shadow — all four together.
- **Radii:** 8px controls, 16px cards, 24px full panels. Pill only for the flag-count badge.
- **Buttons:** primary = solid `ink` fill with white text. Secondary = hairline outline. Never colored.
- **Provenance is a UI invariant:** every med list item shows the clinical term (Inter) and, beneath it, Nani's own words in Urdu (Nastaliq) with a small source glyph (voice / photo). Every flag shows its source citation (e.g. "FDA label · NHS").
- **Questions are questions:** anything the LLM suggests renders as an interrogative with a "?" glyph and the `ask` color — never as a statement or a flag.

### Screen 1 — Counter (tablet, landscape, 1280×800)

Split layout: **left 60% = the conversation, right 40% = the case building.**

**State 1A — Idle.** Big Urdu greeting in Nastaliq centered left ("السلام علیکم، آپ کیا لینا چاہتی ہیں؟") with the English line beneath in `ink-muted`. One large "Start" button. Right column empty with a ghosted med-list skeleton.

**State 1B — Listening.** Left: a subtle audio-level indicator (no colored waveform — use ink dots), live transcript streaming in: Urdu line in Nastaliq, English line beneath in Inter, timestamp in `caption`. Speaker labels: "Nani" / "Counter" / "Mashwara" (the app's own prompts, slightly indented). Right: med list items appear as they are recognized — a card per item: clinical term, Urdu words, source glyph, and a tag "Requested" / "Takes" / "Remedy". An item the app didn't recognize shows as a dashed card "Unrecognised — asking…".

**State 1C — Flag.** Two items now connect: a flag card slides in at the top of the right column — red `flag` token, severity label (High / Moderate), the two term names, one-line reason, source citation. A **glass hold banner** floats over the bottom of the left column: "Hold the sale — 2 flags. Send to pharmacist." with a single primary button. Flag-count pill badge in the header.

**State 1D — Sent / waiting.** Transcript frozen and collapsed to a summary. Right column becomes a case summary card: med list, flags, "Sent 14:02 · waiting for pharmacist" in `ink-muted`. Quiet — no spinner drama.

**State 1E — Advice back.** Pharmacist's advice appears as a plan card: Urdu (Nastaliq, large) above, English below. A "Play in Urdu" button with a speaker glyph. Per-item verdicts: Keep / Stop / Swap, each a small hairline chip (Stop uses the `flag` color, the only color on the card).

### Screen 2 — Pharmacist console (desktop, 1440×900)

**State 2A — Queue.** Left sidebar 280px: list of cases, each row = time, shop name, flag count pill (colored only if > 0), status. Main area empty state: "No case open."

**State 2B — Case open.** Three columns:
- **Left (transcript):** the full conversation, Urdu + English pairs, scrollable, with the app's prompts visually distinct.
- **Center (the map):** a **bubble map** — nodes are med list items, node size = severity of the worst flag it touches, node fill = clear/ask/flag token (neutral outline if none), edges between nodes = a table row (interaction). Edge labeled with the severity. Hovering a node shows Nani's own words. Beneath the map: the flag list as cards with citations, then a section "Questions worth asking" (interrogative, `ask` color) for LLM-suggested gaps.
- **Right (action):** case header (shop, time, 2 requested meds), an advice textarea, per-item Keep / Stop / Swap selectors, and one primary button "Approve & send in Urdu". Photos attached to the case (if any) as a small strip above the textarea.

**State 2C — Approved.** Toast (glass) "Sent to counter · will be read in Urdu". Case row in sidebar moves to "Done".

### Also produce

1. A **component sheet**: button (primary/secondary), med-item card (3 tags), flag card, question card, hold banner, plan card, transcript pair, queue row, flag-count pill, Urdu/English text pair spec.
2. A **flow diagram** of the 10-step journey with the screen state each step maps to.
3. Annotate every screen with the JSON it reads: `Case { id, transcript[], medList[], flags[], questions[], status, advice?, photos[] }` and `MedItem { term, herWords, source: "voice"|"photo", role: "requested"|"takes"|"remedy" }`.

Do not add: login, settings, patient history, notifications, dark mode, a marketing page, illustrations, or any colored element that is not a flag.

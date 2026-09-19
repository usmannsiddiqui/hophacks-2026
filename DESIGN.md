# DESIGN — Mashwara

Executable truth is `app/globals.css`. The component sheet in `docs/specs/wireframes.html`
is the visual reference. ADR 0006 is the rationale.

## Rule
Colour only ever marks a flag or a question. Everything else is paper and ink.

## Tokens
| token | value | use |
|---|---|---|
| surface | #fefffc | page |
| surface-raised | #f9faf7 | side columns |
| surface-sunken | #f3f5f2 | quoted words (her words) |
| line | #dee2de | hairline |
| ink | #2c2c2c | text, primary buttons |
| ink-muted | #646464 | secondary text, translations |
| clear / -wash / -line | #4f7a57 / #eef3ee / #cfe0d1 | nothing found |
| ask / -wash / -line | #8a5a12 / #fdf4e6 / #e6cfa4 | a question |
| flag / -wash / -line | #b3261e / #fbeceb / #e9bdb9 | verified risk |

Radii: 8 controls · 16 cards · 24 panels · pill only for the flag count.
Spacing: 4 / 8 / 12 / 16 / 24 / 32. Focus: solid 2px ink ring, 2px offset, every control.

## Type
- Inter for Latin. Noto Nastaliq Urdu for every patient-facing string: `urdu` utility
  (rtl, right-aligned, line-height 1.9). Never a Latin fallback.
- Three densities. Phone 25/15px · web 15/13px · report 17/15px — Urdu over English,
  English at ~0.7× in ink-muted.

## Components (from the sheet)
- **Buttons.** Primary = solid ink, white text, never coloured. Secondary = hairline
  outline. Phone 64px, web primary 48px, secondary 44px. Nothing on the phone under 44.
- **Flag pill.** Takes the colour of the worst flag on the file; disappears at zero;
  hairline outline once signed.
- **Role tags** (Requested / Takes daily / Remedy / Prescribed) and **source glyphs**
  (Voice / Photo / Document) are never coloured.
- **Medicine row.** Term over her words (surface-sunken, urdu). A document item has no
  words — the row says so in ask colour rather than leaving a gap.
- **Flag card.** Severity label, "A + B", reason, citation. Cannot render without a
  citation.
- **Question card.** `?` glyph in ask colour, English, why, source ref. On the phone:
  Urdu large, English under.
- **Translate bubbles.** Spoken on top in its language; translation under in ink-muted,
  and the translation row is the replay button. English left with hairline; Urdu right
  with fill and no border.
- **Listening button.** Never red. Mic when idle, square when live, ink dot in the
  status strip.
- **Glass** only for floating things (toast 20px blur, tooltip 10px): fill + border +
  blur + shadow, all four.
- **Report.** 13px ink-muted section headings. Limitations section is mandatory.

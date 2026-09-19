# 0006 — Design: fork the GIC foundations; the only color on screen is a flag

**Status**: Accepted
**Date**: 2026-09-19

## Context

The team's edge is design. A captured design system (generalintelligencecompany.com —
warm off-white paper, near-absent color, glass floating controls, Inter with tight
tracking) exists as a Claude artifact. It is a marketing-site system for another
company's brand: no status colors, marketing-scale spacing, their logo and imagery.
The product is two app screens whose entire job is to show flags, one of them on a
tablet in daylight.

## Decision

Fork the **foundations**, not the brand:

- **Keep**: `surface` #fefffc, `ink` #2c2c2c, `ink-muted` #646464, `line` #dee2de; the
  radius ladder (8 / 16 / 24, pill for badges only); the glass recipe (translucent fill
  + 1px translucent border + backdrop blur + soft shadow — all four together); the
  2px `ink` focus ring; Inter for Latin text; primary button = solid `ink`.
- **Add**: three status tokens `clear` (muted sage), `ask` (amber), `flag` (red); an app
  spacing scale 4 / 8 / 12 / 16 / 24 / 32; `Noto Nastaliq Urdu` for every patient-facing
  string, RTL, line-height ~1.9.
- **Drop**: GIC logo, pixel-art imagery, the Cofounder blue, display-xl/lg,
  `space-25` and above. No dark mode.
- **Rule**: nothing is colored except a status. No colored buttons, borders, gradients
  or accents. On the counter screen, a flag is the first non-neutral pixel the operator
  sees.

`DESIGN.md` and `app/globals.css` in this repo are the executable truth.

## Consequences

- (+) A paper-quiet UI where color means danger — the design story writes itself.
- (+) Light-first survives glare on a shop tablet.
- (−) Nastaliq needs care: tall line-height, RTL alignment, no Latin fallback leaks.

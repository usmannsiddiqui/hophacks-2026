# 0002 — No chart, no memory: every case starts from zero

**Status**: Accepted
**Date**: 2026-09-19

## Context

The first handoff was built around reconciliation: a Synthea chart as clinical truth,
Backboard as conversational memory, and a "Disclosed / Undisclosed / Ask" three-flag
model. The setting changed to a Pakistani corner pharmacy. There is no chart there.
Inventing one is dishonest to the setting and costs hours.

## Decision

For the MVP a case has no prior state. The med list is built entirely from this
conversation (voice, and photo if time allows). There is no patient history, no
returning-patient beat, no Backboard, no Synthea.

The med item **role** (`requested` | `takes` | `remedy`) replaces the three-flag
provenance model as the map's labeling scheme.

## Consequences

- (+) Removes one sponsor integration (Backboard), one seed dataset and the
  reconciliation engine. Roughly 8 hours saved across streams.
- (+) The story is cleaner: the app captures what a paper-less counter never captured.
- (−) Backboard branded submission is forfeited (7 → 6 submissions).
- (−) No "still taking the karela?" moment. If time allows post-MVP, a
  `patients` table keyed on a phone number can hold approved med lists; Backboard would
  then hold conversation memory only, preserving one clinical source of truth.

## Alternatives considered

- **Last visit as the chart.** Better story, needs a patient identity and a second table.
  Deferred, not rejected.
- **Keep Synthea.** Fake data for a setting that has none. Rejected.

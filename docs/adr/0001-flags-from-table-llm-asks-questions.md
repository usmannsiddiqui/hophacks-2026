# 0001 — Flags come from a table; the LLM only asks questions

**Status**: Accepted
**Date**: 2026-09-19

## Context

The product's core output is "these two things interact." That is a clinical claim
about a named person, shown to Hopkins clinicians on stage. An LLM can generate such
a claim fluently and wrongly. The free NLM RxNav interaction API was retired in
January 2024, so there is no drop-in API to lean on either.

## Decision

- A **flag** is produced only by matching two med items against
  `data/interactions.json`, a hand-curated table (~40 rows) where every row carries a
  severity, a one-line reason and a citable source.
- Gemini's only jobs are (1) map the patient's words to a term in
  `data/vocabulary.json` or `unrecognised`, via structured output, and (2) optionally
  suggest a **question** for the pharmacist when it notices a gap the table does not
  cover.
- Questions render interrogative (must end in `?`), in the `ask` color, with a `?`
  glyph. They are never shown as statements, never colored `flag`, never called flags.

## Consequences

- (+) "Every red edge on this map has a source" is true and demonstrable.
- (+) Deterministic: the same case always produces the same flags; testable.
- (+) The `unrecognised` path drives the agent's follow-up questions — the agentic
  depth ElevenLabs rewards — instead of being an error.
- (−) Coverage is limited to ~40 interactions. Stream A curates the demo's
  interactions first, then fills.
- (−) Two data files to maintain by hand under time pressure.

## Alternatives considered

- **Gemini generates interactions on the fly.** Zero setup; hallucination risk in front
  of clinicians; no source to cite. Rejected.
- **openFDA label text search at runtime.** Real but unstructured, slow, and not
  demo-safe. Could be a post-hackathon upgrade.

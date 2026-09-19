# 0007 — Monologue first; speakers by mic ownership and language, never by voice

**Status**: Accepted
**Date**: 2026-09-19

## Context

The first design was a back-and-forth conversation from the start. That needs speaker
diarisation (who said what), which STT gets wrong on a noisy counter, and it interrupts
the patient before she has told her story.

## Decision

1. **Recording 1 is a monologue.** The phone goes in front of her and she talks two or
   three minutes, uninterrupted. The app opened the mic for her alone, so the recording
   is single-speaker by construction. It is transcribed in Urdu, then translated.
2. **Everything after is live translate**, a two-language interpreter screen. A turn's
   speaker is derived from the language heard — Urdu is hers, English is yours. No model
   is ever asked who was speaking.
3. **Follow-ups are one question at a time** ("Ask her this"), each raised by the
   findings step, spoken in Urdu on tap, and answered inside live translate. The answer
   attaches to the question it closes.

## Consequences

- (+) No diarisation step to get wrong. Getting attribution wrong requires the wrong
  language, not the wrong voice.
- (+) Three uninterrupted minutes catch more than Q&A. The pitch line writes itself.
- (+) Live translate is one screen at two widths — phone and web app — not two products.
- (−) Latency: Recording 1 is processed after it ends, not streamed. Acceptable; the
  file "builds" on the web screen while she is still at the counter.
- (−) Code-switching (Urdu sentence with English drug names) is attributed by dominant
  language; drug names in English inside Urdu speech are expected and fine.

# 0003 — Transcribe in the patient's language; never dub

**Status**: Accepted
**Date**: 2026-09-19

## Context

ElevenLabs offers speech-to-speech dubbing. Translating the patient straight to English
looks like a shortcut: everything downstream becomes English-only. But it destroys the
original utterance, so a med item can no longer show the patient's actual words, and the
record becomes a translation of a translation.

## Decision

- Scribe transcribes in the patient's language (Urdu; Hindi is the tested fallback if
  Urdu TTS quality is poor — the demo vocabulary is shared).
- Every utterance stores `original` and `english` side by side.
- Gemini normalizes from the original text. The English rendering is for the counter
  operator and pharmacist to read, not for the pipeline to reason over.
- Patient-facing output (prompts, readback) is TTS in her language, set in Noto
  Nastaliq Urdu on screen.

## Consequences

- (+) The provenance pair (term + her words) is always formable.
- (+) On stage, real Urdu script and audio are visible evidence the product is for her.
- (−) Two text fields per utterance; a little more UI.
- (−) Urdu TTS quality is a risk carried by stream B; the fallback is decided at hour 0,
  not hour 30.

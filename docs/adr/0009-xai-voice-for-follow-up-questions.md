# 0009 — xAI voice for follow-up questions; Scribe keeps the first recording

**Status**: Accepted from user direction, 19–20 September 2026.
**Supersedes**: the "No Grok fallback in the agreed MVP" line of 0008 and the
"ElevenLabs … TTS for prompts and readback" line of 0005, for follow-up questions only.
Other decisions in 0005, 0007 and 0008 remain in force.

## Context

0007 already places follow-ups after the findings step: one question at a time, spoken
in Urdu on tap, answered and attached to the question it closes. The first xAI slice on
`Ahmad-Branch-GrokSTT` instead put Grok STT beside the Scribe transcript as a second
transcription of the same input. That duplicated the input, gave a volunteer nothing to
do with it, and surfaced Grok STT's habit of writing Urdu speech as Hindi Devanagari.

## Decision

1. **Scribe transcribes the first recording.** The VisitDraft transcript and its raw
   copy come from ElevenLabs Scribe only, as in 0008. No xAI pass on the input.
2. **xAI serves the questions.** Each draft question in the English report can be
   spoken in Urdu with xAI text-to-speech, and the patient's answer is recorded and
   transcribed with Grok STT, then rewritten by Grok chat into Arabic-script Urdu.
   A rewrite that still contains Devanagari is rejected rather than shown.
3. **Answers are dialogue, not corrections.** An answer is held on the draft until the
   volunteer adds it; adding appends `سوال:`/`جواب:` lines to the reviewed account and
   re-runs the Gemini report. Only `جواب:` lines are the patient's words. The old
   report is cleared, never shown as current for a longer account.
4. **Gemini stays the only analytical provider.** Quota exhaustion or high demand on
   one Gemini model moves the request to another Gemini model; it never moves to xAI.

## Consequences

- (+) The volunteer can ask a question without speaking Urdu, and the answer changes
  the report, which is the point of asking.
- (+) Flags and medicines from answers keep the same evidence rule: excerpts must be
  in the reviewed account, which now contains the dialogue.
- (−) Two xAI calls per answer (STT, rewrite) and a Gemini re-run per update. The
  volunteer can edit the answer before adding it.
- (−) Urdu is not in xAI's TTS language table; `auto` is used and quality varies.

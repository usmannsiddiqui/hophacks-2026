# User journey: one account, a reviewed plan

Current journey, aligned with ADRs 0001–0007. The earlier Backboard, chart, reminders,
and source-colored-map framing is superseded. Source: the sixteen wireframe boards.

| Step | Person and action | Screen / state |
|---|---|---|
| 1 | Counter operator opens a file with name, age and sex | New case; recording |
| 2 | Patient speaks in Urdu, uninterrupted | Recording 1; single speaker by mic ownership |
| 3 | Scribe transcribes Urdu; Gemini translates and structures | Preserve original and English; never infer a flag |
| 4 | Operator reads request, history, medicines and source words | Patient file |
| 5 | Optional brought-in document adds evidence without overwriting voice | Import; deferred until live must-list is green |
| 6 | Sourced table raises interactions; model proposes questions | Findings; hold the sale for review |
| 7 | Operator asks one open question in Urdu | Ask her this |
| 8 | Original-language answer and translation attach to that question | Live translate; Urdu = patient, English = operator |
| 9 | Pro bono pharmacist reviews the full file and all item decisions | Sent → signed; reviewed advice in English and Urdu |
| 10 | Patient hears approved Urdu advice and takes a report to a doctor | Advice + report, including unresolved questions and limitations |

## Current demo build

Start at `/file/new`, choose Sample walkthrough, and use the prepared account. Review the
file and findings, answer a question using the sample or bilingual typed fallback, then
send to the pharmacist. Fill the sample review, review every item and confirm before
signing. Open the Urdu advice and report. Sample state survives reload in this browser.

This demonstrates the workflow with fictional data. Live transcription, model structuring,
translation and Urdu audio still need provider integration. No screen should imply those
calls succeeded when they have not. Neon is required for real cross-device persistence.

## Three-minute judge sequence

Open on the patient intake. Show Urdu and her original words, a cited interaction, and one
follow-up answer. Switch to the pharmacist, sign, and return to the same file's advice and
report. Explain both giving mechanisms: volunteer time at the counter and pharmacist
expertise remotely. Say “free” and “advice, not emergencies.”

Once the providers are connected, replace the sample-account step with actual Urdu speech
on the phone. Pharmacist review remains asynchronous; do not promise an immediate response.

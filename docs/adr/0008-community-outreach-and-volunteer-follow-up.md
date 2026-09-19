# 0008 — Community visits and volunteer follow-up

**Status:** Accepted from user discussion, 19 September 2026.
**Supersedes:** Pharmacy-only assumptions in 0004; language-only speaker attribution in 0007 for local-volunteer conversations. Other decisions remain in force.

## Decision
- A volunteer can visit someone at home or in the community. A store and a sale are not prerequisites.
- A patient does not need an account or keyboard and does not need to wait for review.
- Local volunteers capture Urdu patient accounts. English-speaking volunteers use optional spoken interpretation. The remote pharmacist works in English.
- Initial capture is a patient-only recording. Both speakers can speak Urdu, so language cannot universally identify the speaker. Explicit turn ownership is required when local-volunteer turns are recorded.
- Pharmacists can request clarification or approve English advice. Urdu is a translated rendering of approved advice, not a claim that an English-only reviewer checked Urdu.
- The volunteer returns or contacts the person to deliver advice and check understanding. Review submitted and advice delivered are separate events.
- Gemini remains the analytical provider. ElevenLabs provides transcription and speech. No Grok fallback is in the agreed MVP.
- Keep the user-facing UI brief; behavior, evidence and error states belong in implementation documentation or expandable detail.

## Implementation boundary
The first slice adds local VisitDraft capture and raw/corrected Urdu transcript review. It does not yet migrate the old PatientFile schema, global sample walkthrough, signed-case lifecycle, or speakerFor helper. Those remain explicitly legacy until the outreach review slice replaces them.

# User journey: a community visit, a reviewed plan

Current product direction: ADR 0008, approved outreach wireframes. Gemini is the analytical provider; ElevenLabs handles speech.

1. Volunteer starts a visit at home, in the community, or at a counter.
2. Patient speaks Urdu without needing an account or keyboard. A local volunteer records patient turns; an English-speaking volunteer will use interpretation.
3. Volunteer checks the transcript and preserves both original transcription and corrections.
4. Gemini translates and structures the reviewed account. The sourced table supplies supported interaction flags.
5. Volunteer confirms the summary and sends it for remote review.
6. English-speaking pharmacist reviews evidence, requests clarification if needed, and approves English advice.
7. Advice is translated into Urdu. The volunteer returns or contacts the patient, plays/relays advice and checks understanding.
8. Advice delivered is recorded separately from review submitted. The patient never needs to wait at the original visit.

## What works now

- /visit/new: real browser audio capture with pause/resume, upload fallback, server-side Scribe integration through the merged voice service, original/corrected Urdu transcript and tab-local saved drafts. Requires ELEVENLABS_API_KEY for live transcription.
- Recordings stop after a three-minute session; upload duration is checked in the browser. Server enforces a 4 MiB audio / bounded multipart request limit, not an independently verified media-duration limit.
- Transcription retries reuse the audio while this page stays open. Raw audio is not persisted across reloads.
- Transcripts and English draft reports survive refresh in the same tab. They are not sent to a pharmacist or shared across devices.
- After Save transcript, Prepare English report calls Gemini through lib/llm.ts. The printable draft includes the English patient account, medicine names paired with the patient's Urdu words, clarification questions and existing sourced table flags. Original and reviewed Urdu stay separate; corrections invalidate the report. Requires GOOGLE_GENERATIVE_AI_API_KEY.
- Existing /file/new sample journey still demonstrates findings, questions, review, bilingual advice and report with fictional data. It retains older counter terminology and the old PatientFile lifecycle.

## Result visualization

A ready English report is a dedicated result screen. Details holds the full draft;
Map holds the interactive medicine/flag visualization. Switch using the icon-labelled
sliding selector. Choose a medicine or cited connection to inspect existing evidence.
Edit transcript returns to review; changing Urdu invalidates its old report as before.

## Next implementation slice

Connect the saved English VisitReport to shared storage and the remote pharmacist queue. Migrate volunteer/pharmacist views to the outreach lifecycle, including concurrency, clarification, approved English advice, Urdu translation/TTS and delivery status. The first Details/Map visualization slice is implemented; shared review and delivery remain the next functional integration.

## Judge sequence after integration

Capture a real Urdu account during a home visit, show the English summary and a supported concern, switch to the pharmacist for review, and return to the volunteer for Urdu advice playback and delivery confirmation.

# Pressure test: 19 September implementation pass

Read the external handoff, all sixteen supplied wireframe boards, repo ADRs and contracts,
and the GIC Claude design artifact. Handoff suggestions were treated as historical context,
not permission to reopen decisions or act outside the user's request.

## Fixed in this pass

| Finding | Consequence | Change |
|---|---|---|
| globals.css had starter colors, Arial, dark mode and undefined product tokens | Actual UI did not implement DESIGN.md despite the handoff saying it did | Restored light paper/ink tokens, Inter/Nastaliq, density, focus and responsive rules |
| All screens were placeholders | No judge could walk the product end to end | Built the explicitly labeled sample journey and Stream C review/report screens |
| saveFile returned success without a database | Newly created files disappeared | Return 503 for unconfigured persistence; browser-local sample mode is explicit |
| JSON casts were the entire API validation layer | Invalid provenance, forged flags, arbitrary identity changes and empty sign-offs | Runtime Zod validation and regression tests; recompute flags on POST and PATCH |
| “Forward-only” test only checked enum membership | It did not test backwards writes | Added API transition tests and post-signature immutability |
| Citation labels were vague institutions | Judge could not inspect evidence | Link the two supported rows to MSK and FDA; qualify bitter-melon wording |
| Old user journey contradicted ADRs | Team might build cut Backboard/chart/reminder features | Replaced it with current flow and explicit integration status |
| Review draft disappeared on refresh; recording answers were omitted from review/report | Pharmacist could lose work or miss an answer | Tab-local unsigned draft recovery and unified recording/turn answer display |
| Live queue failure hid browser-local samples | Rehearsal depended on database availability | Load sample cases independently and bound API request time |
| Shared context had no ownership or sync workflow | Duplicate vault/repo notes could drift | Allowlisted sync, two-sided conflict checks and explicit import/export |

## Must finish for the live hackathon demo

1. **Live voice/model work:** Scribe capture, Gemini normalization and translation, Urdu TTS.
   The current sample flow does not call those services. Typed fallback and playback error
   handling are implemented. An ElevenLabs prize submission must show the actual integration.
2. **Neon + HTTPS:** create database, configure environment, push schema, then exercise the
   same case on two devices. Browser-local sample persistence is only for one-browser rehearsal.
3. **Concurrent file updates:** PATCH currently reads and writes whole JSON. Two devices can
   overwrite each other's updates. Add optimistic concurrency or transactional field updates
   before relying on simultaneous counter/pharmacist editing.
4. **Clinical curation:** 143 terms / 105 rows, only 2 sourced rows. No-match is not clearance.
   Source existence does not validate an exact priority or establish a patient's diagnosis.
   Prioritize reviewed demo interactions over bulk-added citations.
5. **Urdu review:** have an Urdu-speaking teammate test actual audio and review the final
   clinical translation. Both language versions are required for signature; neither is
   currently generated automatically in the review form.

## Before any real-patient pilot

Public file routes and typed reviewer identity are not authentication or verified credentials.
The prototype is for fictional demonstrations. Add access controls, identity verification,
consent, retention rules and clinical governance before entering real patient information.
These were cut from the hackathon scope and are not represented as implemented.

## Deliberately deferred

Document upload/extraction, photo identification, manual correction audit trail, true audio
level meter, live interpreter turn-taking, real Urdu playback, and nonessential glass overlays.
The import screen explains its unavailable state. The fixture's prescription is illustrative,
not a downloadable file; no broken PDF link is exposed.

## Verification

- API and invariant suite: 21 passing tests.
- Context-sync suite: 3 passing tests, including both-side edits and private-note exclusion.
- TypeScript and ESLint passed.
- Production build passed using `pnpm build --webpack`. Turbopack's worker-port bind failed
  in this execution environment; no compiler switch was imposed on teammates.
- Browser walkthrough: intake → sample account → file → findings → q2 answer → pharmacist
  review → signed advice. Reload preserved the signed file and recovered unsigned pharmacist advice/verdicts.
  Phone view checked at 390×844, with no horizontal report overflow.
- Not verified against paid providers, a configured Neon database, a real microphone,
  production HTTPS or a physical printer.

## Reference sources

- Taste: https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md
  Current skill scopes itself to marketing surfaces; the product follows the supplied
  wireframes, using applicable spacing, hierarchy, states and accessibility guidance.
- GIC reference: https://claude.ai/artifact/JqHZX2RGakx9sDDq9BZoU3
- Bitter melon: https://www.mskcc.org/cancer-care/integrative-medicine/herbs/bitter-melon
- FDA fluoroquinolone warning: https://www.fda.gov/media/114192/download

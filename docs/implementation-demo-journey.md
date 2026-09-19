# Judge demo journey implementation plan

Goal: turn the supplied wireframes into a usable Stream C slice and make critical API failures explicit.

Spec: `docs/specs/contracts.md`, `DESIGN.md`, the sixteen boards in `docs/specs/wireframes.html` and `/Users/usmansiddiqui/dev/Design.html`.

Architecture: existing Next routes and PatientFile contract. Reusable components render the same file at phone and desktop widths. Explicit sample rehearsal uses browser-local storage; actual files use the existing Neon API. Sample state must never masquerade as a live clinical integration. No new patient fields or clinical claims.

Design: GIC-inspired neutral surfaces, Inter and Nastaliq, 8/16/24 radii, monochrome controls. Taste skill read from Leonxlnx/taste-skill, design-taste-frontend. Variance 3, motion 2, density 5. Its marketing-only constraints do not replace the product wireframes.

- [x] API integrity: regression tests for invalid JSON/files, identity changes, forged flags, signing without complete review, backward transitions, signed-file edits, and missing storage. Implement runtime schemas and explicit errors in `lib/validation.ts` and file routes. Preserve contract.
- [x] Foundations: restore missing CSS tokens; implement shell, patient header, medicine provenance, sourced flags, questions, and derived interaction map in `components/`.
- [x] Journey: implement counter file/findings, pharmacist queue/review, signed advice/report and a clearly labeled sample intake/rehearsal. Keep live provider integration status truthful.
- [x] Verification: run `pnpm test`, `pnpm lint`, `pnpm build`; exercise the sample journey in-browser at desktop and 390px; verify signed report and persistence after refresh.
- [x] Handoff: update build order and pressure-test findings with exact remaining blockers. Commit only this task's files, push the branch and open a draft PR.

Scope boundaries: live Scribe/Gemini/TTS integrations and document extraction remain Stream A/B work. Never fake a successful microphone request, translation or remote sign-off. Without DATABASE_URL, real writes must fail clearly. Browser-local sample files are fictional rehearsal only, not durable cross-device storage.

Review: draft PR https://github.com/usmannsiddiqui/hophacks-2026/pull/4 on `judge-demo-journey`.

# Task 2 report: approved voice journey extension

## Implemented

- Added an explicit **Prepare English report** action after transcript save, with loading, cancel, clear error, deliberate retry, and regeneration states.
- Added request ownership that aborts previous work and ignores late responses after editing, review navigation, restore, new visit, cancellation, or unmount. A 35-second browser deadline also stops a hung network request after the server's 25-second deadline.
- Added a validated `/api/structure` client boundary. It sends only `{ draftId, rawUrdu, reviewedUrdu }`, validates the returned `VisitReport`, and uses `attachReport` before persistence.
- Kept an existing report visible when regeneration fails. Editing reviewed Urdu updates both React state and session storage and invalidates the old report.
- Added a printable English draft showing the English patient account, medicine names and roles, draft questions, sourced table flags and citations, and expandable reviewed/original Urdu.
- Retained the visible and printed label: **AI draft · not sent · not pharmacist-reviewed**.
- Preserved existing capture, transcript review, saved-history, and recording cleanup behavior.

## Red / green evidence

Red command:

```text
rtk pnpm test -- lib/__tests__/report-request.test.ts
```

Expected failure observed: Vitest could not resolve the intentionally absent `@/lib/report-request` module.

Green command after the minimal helper implementation:

```text
rtk pnpm test -- lib/__tests__/report-request.test.ts
```

Result: 1 test file passed, 6 tests passed. Coverage includes prior-request cancellation, cleanup cancellation, exact request body, invalid successful-body schema rejection, preservation of the existing transcript/report after an HTTP failure, and the client deadline for a hung request. The deadline test also failed first by timing out before the 35-second cancellation was implemented, then passed after the implementation.

## Final verification

```text
rtk pnpm test
rtk lint
rtk tsc --noEmit
rtk git diff --check
```

- Vitest: 17 files passed; 98 tests passed, 3 live tests skipped.
- ESLint: no issues found.
- TypeScript: no errors found.
- Diff whitespace check: clean.

Per task scope, no production build or live provider call was run here; the parent integration task owns those checks.

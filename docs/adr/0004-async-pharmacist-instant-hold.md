# 0004 — The pharmacist is asynchronous; the hold is instant

**Status**: Accepted
**Date**: 2026-09-19

## Context

The pharmacist is a remote pro bono volunteer who may answer in minutes or hours. The
patient is at the counter now. The tool is for everyday advice, not emergencies.

## Decision

Two outputs at two speeds:

1. **The hold** — instant, no human. When a flag fires, the counter screen shows a hold
   banner and the app tells the patient in her language that a pharmacist will check
   before she takes both. Rule-based (ADR 0001), never waits on a person.
2. **The plan** — asynchronous. The case enters the pharmacist queue. Advice comes back
   as text plus Urdu audio to the counter screen whenever the pharmacist gets to it.

The pitch says "advice, not emergencies" out loud. In the demo, both happen live with a
teammate on the pharmacist console.

## Consequences

- (+) No claim that the tool handles urgent care — removes the medico-legal question.
- (+) The safety warning never depends on a human being awake.
- (−) No SLA, no notifications, no follow-up scheduling in the MVP. Cut deliberately.

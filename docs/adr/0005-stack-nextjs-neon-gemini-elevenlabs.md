# 0005 — Stack: Next.js + Neon + Gemini + ElevenLabs

**Status**: Accepted
**Date**: 2026-09-19

## Context

Three people, ~32 hours. The team has deep muscle memory in Next.js / React /
Tailwind / Vercel AI SDK / Neon + Drizzle from Pearl. Two sponsors (Gemini, ElevenLabs)
are prize-bearing and central to the product. The case must be shared between two
devices.

## Decision

- **Next.js 16 App Router, React 19, TypeScript, Tailwind 4, pnpm.** Route handlers
  for the API; no separate backend.
- **Vercel AI SDK with `@ai-sdk/google`** for Gemini structured output. One provider.
- **ElevenLabs**: Scribe for STT, TTS (v3 for Urdu) for prompts and readback, Agents
  Platform if stream B has time for real turn-taking.
- **Neon Postgres + Drizzle**, one `cases` table holding the `Case` JSON. Pharmacist
  console polls every 3 s. `drizzle-kit push`, no migration ceremony.
- **Deploy to DigitalOcean App Platform** as one Node service (branded prize + the
  two-device demo works over the venue Wi-Fi). Domain via GoDaddy.
- **Vitest** for the reconciliation invariants only (`docs/specs/contracts.md`). No UI
  tests.

## Consequences

- (+) Zero learning tax. Scaffold in under an hour.
- (+) Case state survives deploys and works across devices.
- (−) In-memory would have been faster to start; rejected because DO may run more than
  one instance and a restart at 3 AM would drop the demo case.
- (−) SpacetimeDB would give real-time sync for free, but it is a *track* sponsor and
  the track is spent on Bloomberg. No prize, new tool. Rejected.

## Not copied from Pearl

pgvector, retrieval, mock SSO, middleware, the second LLM provider, UI tests.

# 0011 — Outreach uses listed healthcare access and community branding

Status: Accepted for the Pasni pilot
Date: 2026-09-20
Supersedes: ADR 0006 for /outreach only

## Context
The owner approved a separate geographic map for volunteers deciding where to visit, and requested cream #F3E8BC, teal #035352, Marker Felt and a Nastaliq Urdu wordmark. Pharmacist review status does not belong on this map.

## Decision
Use Google Maps JavaScript with Places Aggregate operational listing counts around six GeoNames populated-place coordinates. Compare the same 5 km straight-line radius. Medical-care listings use hospital or doctor types; pharmacies are a separate toggle. A zero means no matching listings. Unknown and failed queries remain unknown. This is not a facility census, population-adjusted need score, staffing or qualification assessment, administrative boundary map or travel-time model.

The outreach screen uses the approved colors, Marker Felt headings and Nastaliq wordmark. Listing-count colors have a labeled legend, separate from clinical flags. Existing clinical screens retain their own styles and contracts.

Queries are user-triggered and allowlisted, with a per-process request budget. API keys stay in .env.local. Google content is held in page memory, not persisted. Source attribution stays visible. Visit intentions persist only settlement IDs in this browser; no assignment, patient association or shared scheduling is implied.

## Consequences
The prototype helps prioritize field verification using real listings, while exposing dataset limitations. Population, qualifications, transport and opening hours need separate validated sources. Before public deployment add distributed request limiting/authentication and provider quotas; the process-local budget is not a global spend cap. The pilot subset is deliberately small and is not representative of all Pakistan.

# 0015 — Demo integration and report views

Status: Accepted from owner direction, 20 September 2026.
Supersedes: ADR 0014 presentation of Area details and map methodology disclosures only. Its population denominators, geometry, thresholds, and provider rules remain unchanged.

## Decision

Keep the owner-requested simplified map without Area details or How to read this map. Region names omit administrative suffixes. Counts and listings per 10,000 people appear together; ranking, region dots, polygon shading and the legend use the same population-adjusted rate. Keep census population visible beside the selected region and retain boundary attribution/download links.

Integrate the remaining Details/Map report work with the current shared evidence graph and report styling. Details retains follow-up questions and pharmacist submission; Map preserves source excerpts. Printing always includes Details even when Map is selected. Development fixtures stay unavailable in production.

Run the phone and desktop journeys from the same main checkout and database-backed app. Existing DATABASE_URL is the runtime connection; DATABASE_URL_UNPOOLED is an optional direct connection and does not select a separate app database. Credentials stay local. Phone microphone access requires a trusted HTTPS origin; a plain LAN URL is only a viewing/upload fallback.

## Integration boundaries

Previously closed PRs and superseded prototype branches are preserved, not silently reintroduced. Historical uncommitted outreach assets are committed on their original branch for recovery. No nationwide data expansion or new clinical decision workflow is implied by this consolidation.

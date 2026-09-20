# 0013 — Locked product design and real regional outreach boundaries

Status: Accepted from owner direction, 20 September 2026
Supersedes: ADR 0006 visual foundations for product pages; ADR 0011 outreach-only design scope; ADR 0012 sampling geometry. Clinical evidence and provider rules remain unchanged.

## Decision

Apply the locked outreach design to the product: cream #F3E8BC, teal #035352, Bricolage Grotesque 800 headings, Figtree controls/body, Nastaliq Urdu and restrained liquid-glass panels. Preserve the supplied village artwork and landing copy. Clinical status colors retain their meanings.

The owner chose real geographic regions in place of generated hexagons. Shade the published Pasni, Ormara, Gwadar and Jiwani tehsil polygons. The source is geoBoundaries gbOpen PAK ADM3, revision 9469f09, simplified geometry representing 2017, derived from Pathways Data/Pakistan census sources under ODbL 1.0. The downloadable subset and attribution travel with the app. These are source administrative boundaries, not field-verified current village boundaries.

The exact same counterclockwise closed ring drives Google Maps geodesic polygons and Places Aggregate customArea queries. Recompute counts; never reuse former circle or hexagon counts. Keep medical and pharmacy categories separate, user-triggered requests, unknown/error states, provider attribution, server-only key and existing budget. Unequal region sizes make raw counts unsuitable as a per-person or per-area access measure; disclose this beside the methodology.

The root route becomes the locked outreach page; /outreach remains available. /pharmacist opens the sent-visit queue. Legacy PatientFile queue navigation uses /pharmacist/files and its existing individual review routes remain available. The two record contracts remain separate.

An optional allowlisted outreachAreaId accompanies VisitDraft and the sent VisitRecord. It is visit context, not a completed outreach assignment. Existing local settlement plans remain readable and individually removable. New visits preserve saved draft history; continuing a draft is distinct from starting a new one.

Your visits (/visits) finds sent report IDs saved by this browser. /visit/[id] reads the immutable sent report and its pharmacist response. A changed report must not inherit an earlier response. Printable AI reports explicitly exclude pharmacist authorisation; the separate response remains the review source.

## Boundaries

No new clinical decisions, authentication, patient-history service, shared outreach scheduling or automatic delivery event is introduced. Sent visits retain the existing Neon-or-process-memory store. Drafts remain tab-local and sent links browser-local. Urdu response translation/playback and a distinct delivery event remain an open next step with the owner; this decision does not claim that final step is implemented.

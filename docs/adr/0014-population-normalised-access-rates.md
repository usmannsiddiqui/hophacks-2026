# 0014 — Census population turns listing counts into rates

Status: Accepted from owner direction, 20 September 2026
Supersedes: ADR 0013 raw-count disclosure ("regions differ in size; counts are not adjusted for area or population"); ADR 0011 statement that the map is not population-adjusted; ADR 0012 placement of methodology under a closing "How to read this map" section. Boundary geometry, provider, budget, key handling and clinical rules are unchanged.

## Context

The four shaded tehsils (Pasni, Ormara, Gwadar, Jiwani) are the Census 2023 reporting units: the Jiwani polygon measures 456 km² against the census 454 km². Pakistan Bureau of Statistics publishes, for exactly these units, area and population (Census 2023 Balochistan Table 1) and, for the first time, disability and functional-limitation counts from the Washington Group short set (Table 16). Raw Google listing counts were unsuitable as an access signal because the tehsils differ five-fold in population. No public source gives pharmacy licences or disease cases per tehsil; disease surveillance (IDSR, DHIS, MICS, PSLM) exists only for the whole district. The Google server key is IP-restricted, so on machines outside the allowlist neither category returns counts.

## Decision

Census figures travel with the boundary file (`public/data/makran-tehsils.json`, `properties.census` per feature, plus district totals, source tables and an `unmapped` list) so the download carries the numbers the map shows. Suntsar sub-tehsil (20,523 people, 1,975 km²) has no polygon in geoBoundaries PAK ADM3 and is disclosed beside the region list rather than drawn.

Colour encodes Google listings per 10,000 census residents inside the same boundary: red for none listed, orange below 2 per 10,000, teal at or above, gray for unknown or failed. The threshold is the WHO Service Availability and Readiness Assessment facility benchmark of 2 per 10,000; it applies to the medical-care layer and is labelled a reference only for pharmacies, which have no WHO target. Region lists sort by rate, thinnest coverage first. One request fills both categories, visible tab first, within the existing per-process budget.

The detail card shows census population, area and density beside the name, and under Area details: the listing count with its rate and residents-per-listing, the benchmark shortfall, the retrieval status, the census counts of people reporting a lot of difficulty and any difficulty with district comparison, and the sources. Census figures render even when Google is unavailable. Boundary attribution (geoBoundaries, ODbL 1.0, download) sits in the legend; the former closing section is removed.

## Boundaries

Listings are Google Maps listings, not verified facilities or licensed pharmacies. Census difficulty counts describe functional limitation, not sickness, and are never presented as patient need. District-level disease figures are not split across tehsils. Ormara's Table 16 base (25,503) differs from its Table 1 population (27,832); shares use the Table 16 base and say so. Polygon areas for Gwadar and Pasni are 13–17% under census areas because of simplified 2017 geometry, so density uses census area. Populating counts on a new machine requires adding its IP to the server key's restriction or replacing IP restriction with API restriction.

## Glossary terms for the vault

- **Listings per 10,000**: Google operational listings of a category inside a tehsil boundary, divided by that tehsil's 2023 census population, times 10,000.
- **WHO facility benchmark**: SARA service-availability target of 2 health facilities per 10,000 population; reference only for pharmacies.
- **Functional limitation (census)**: any reported difficulty in one of six Washington Group domains. **Disability (census)**: a lot of difficulty or inability in at least one domain.
- **Unmapped unit**: a census unit inside the district with no polygon in the boundary source (currently Suntsar).

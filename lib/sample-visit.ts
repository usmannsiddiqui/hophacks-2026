// The canned second case, for rehearsing the pharmacist console without running a live
// intake first. Nasreen Bibi's risk is her blood sugar going too low; Ghulam Fatima's is
// bleeding — a different set of flags, so the map and the decision screen get exercised
// on something other than one shape of case.
//
// It is parsed through the real schema on the way in, so if the interaction table or the
// report contract changes underneath it, this fails loudly instead of seeding a case that
// claims an interaction the table no longer supports.

import fixture from "@/data/visits/mv-2051.json";
import { visitRecordSchema, type VisitRecord } from "@/lib/review";

export function sampleVisit(): VisitRecord {
  return visitRecordSchema.parse(structuredClone(fixture));
}

/** What the queue sends to POST /api/visits. */
export function sampleSubmission() {
  const visit = sampleVisit();
  return { patient: visit.patient, report: visit.report };
}

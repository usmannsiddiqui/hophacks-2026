// Adapts a counter `PatientFile` onto the shape the bubble map reads.
//
// Two data models reach the same map: the voice flow's `VisitReport`, which satisfies
// `BubbleMapSource` directly, and the counter's `PatientFile`, which does not — it has
// no vocabulary `name` on an item, and its provenance is a timestamp in the recording
// rather than a quoted excerpt. Rather than keep a second map component in step with
// the first, the file is translated here.

import type { BubbleMapSource } from "@/components/report-bubble-map";
import { medicineName } from "./display";
import type { PatientFile } from "./types";

export function fileToBubbleSource(file: PatientFile): BubbleMapSource {
  return {
    medList: file.medList.map((item) => ({
      id: item.id,
      term: item.term,
      name: medicineName(item.term),
      // A document item genuinely has none; the map says so rather than leaving a gap.
      herWords: item.herWords,
      // A counter file quotes no excerpt — it points at a second of the recording — so
      // the evidence panel simply has no excerpt to open for these.
    })),
    flags: file.flags.map((flag) => ({
      id: flag.id,
      a: flag.a,
      b: flag.b,
      severity: flag.severity,
      reason: flag.reason,
      citation: flag.citation,
    })),
  };
}

# Frozen contract — `PatientFile`

Source of truth: the "Data contract" board in `docs/specs/wireframes.html`. `lib/types.ts`
is the executable copy. Change one only with all three people in the room.

## Shape

```ts
type Lang = "ur" | "en";

type PatientFile = {
  id: string;                         // "MW-1042"
  createdAt: string;                  // ISO-8601 with offset
  patient: { name: string; age: number; sex: "F" | "M" | "Other"; language: "ur" };
  place: { shop: string; area: string; city: string };
  takenBy: string;                    // "Imran Ali, counter volunteer"
  reviewedBy?: { name: string; qualification: string; registration: string; at: string };
  request: string[];                  // what she asked for at the counter
  recordings: Recording[];            // monologues — one voice each
  turns: Turn[];                      // live translate — split by language
  history: { urdu: string; english: string };   // her account, as one block
  medList: MedItem[];
  flags: Flag[];
  questions: Question[];
  impression?: string;                // written by the pharmacist
  advice?: Advice;
  attachments: Attachment[];
  status: "new" | "recording" | "structured" | "asking" | "sent" | "signed";
};

type Recording = {
  n: number;
  speaker: "patient";                 // set by the app before the mic opens — never inferred
  seconds: number;
  urdu: string;
  english: string;
  answers: string[];                  // Question ids; empty for Recording 1
};

type Turn = {                         // one exchange inside live translate
  id: string;
  by: "patient" | "volunteer";        // derived from `heard`, never from the voice
  heard: Lang;                        // Urdu is hers, English is yours
  spoken: string;                     // in the language it was said in
  translated: string;                 // read aloud in the other language
  at: string;
  answers?: string;                   // Question id this turn closes
};

type MedItem = {
  id: string;
  term: string;                       // from data/substances.json, or "unidentified"
  herWords: string | null;            // null ONLY when source is "document"
  source: "voice" | "photo" | "document";
  role: "requested" | "takes" | "remedy" | "prescribed";
  since?: string;
  at: { recording: number; t: number } | { attachment: string };
};

type Flag = { id: string; severity: "high" | "moderate"; a: string; b: string; reason: string; citation: string };

type Question = {
  id: string;
  text: { urdu: string; english: string };
  why: string;
  from: Array<{ recording: number; t: number } | { attachment: string }>;
  asked?: string;                     // ISO time
  answeredIn?: string;                // Turn id or Recording n
};

type Advice = {
  urdu: string;
  english: string;
  verdicts: Record<string, "keep" | "stop" | "swap">;   // keyed by MedItem.id
  by: string;
  at: string;
  audioUrl?: string;
};

type Attachment = {
  id: string;
  kind: "prescription" | "report" | "photo";
  label: string;
  date?: string;
  url: string;
  extracted: MedItem[];
};
```

## Four rules the shape enforces (tests in `lib/__tests__/invariants.test.ts`)

1. **No field stores a guess about who spoke.** A Recording is single-speaker because the
   app opened the mic for her alone. A Turn's `by` is derived from `heard`.
2. **A voice or photo item must carry `herWords`.** A document item may not, and the row
   says so in words.
3. **Nothing the model infers becomes a Flag.** Flags come from `data/substances.json`
   `interactions[]` and carry a `citation`. Everything else is a Question, and a
   Question's `english` ends with `?`.
4. **A document never overwrites her voice.** Where they disagree both stay and a
   Question is raised.

Plus: `status` only moves forward.

## Screen → reads / writes

| Screen | Reads | Writes |
|---|---|---|
| P1 New case | place, takenBy | patient, status → recording |
| P2 Let her talk | patient.name | recordings[0], history |
| P3 / W0 Live translate | turns[], open question | turns[], questions[].answeredIn, medList[] |
| P4 Ask her this | questions[] | questions[].asked; speaks text.urdu; opens P3 |
| P5 Advice | advice, reviewedBy | nothing; plays advice.urdu |
| W1 File | whole file | hand corrections |
| W2 Findings | flags, questions, medList | questions[].asked, status → sent |
| W3 Import | attachment.extracted vs medList | attachments[], medList[], questions[] |
| W4 Report | every field | nothing |
| 2A Queue | PatientFile[] summary | nothing |
| 2B File open | whole file (map derived) | advice draft, impression |
| 2C Signed | advice, status | advice, reviewedBy, status → signed |

The bubble map is never stored: nodes = medList, size = worst severity touching the
item, edge = one flag, dashed = unidentified.

## Canned file

`data/files/mw-1042.json` — Nasreen Bibi, 64 F, in `sent` state: 2 requested (Panadol,
Ciproxin), metformin (voice + photo), amlodipine (prescribed, not said), bitter gourd
juice (remedy), unidentified powder (remedy). 2 flags, 4 questions (1 answered). Every
screen after P2 can be built against it from hour 0.

# Frozen contracts

Two shapes. Every stream builds against these from hour 0. Change one only with all
three people in the room, and update `lib/types.ts` in the same commit.

## MedItem

```ts
type MedItem = {
  id: string;                       // nanoid
  term: string | "unrecognised";    // from data/vocabulary.json
  herWords: string;                 // original-language phrase, verbatim
  herWordsEn: string;               // English rendering of herWords
  source: "voice" | "photo";
  role: "requested" | "takes" | "remedy";
  utteranceId?: string;             // which transcript line produced it
};
```

## Case

```ts
type Utterance = {
  id: string;
  speaker: "patient" | "counter" | "app";
  original: string;                 // Urdu (or fallback language) text
  english: string;
  lang: "ur" | "hi" | "en";
  at: string;                       // ISO-8601
};

type Flag = {
  id: string;
  termA: string;
  termB: string;
  severity: "high" | "moderate";
  reason: string;                   // one line, from the table
  source: string;                   // citation, from the table
};

type Question = {
  id: string;
  text: string;                     // must end with "?"
  about: string[];                  // term(s) it concerns
};

type Verdict = { medItemId: string; verdict: "keep" | "stop" | "swap"; note?: string };

type Case = {
  id: string;
  shop: string;                     // display name, e.g. "Saddar Medical Store"
  lang: "ur" | "hi";
  status: "listening" | "sent" | "approved";
  transcript: Utterance[];
  medList: MedItem[];
  flags: Flag[];                    // derived from medList × interactions; recomputed on every medList change
  questions: Question[];            // LLM-suggested, interrogative only
  photos: string[];                 // URLs or data URIs
  advice?: { text: string; textUr: string; verdicts: Verdict[]; audioUrl?: string; at: string };
  createdAt: string;
  sentAt?: string;
  approvedAt?: string;
};
```

## Invariants (tests exist for these)

1. `flags` contains only rows that exist in `data/interactions.json`.
2. Every `Question.text` ends with `?`.
3. Every `MedItem` has non-empty `herWords`.
4. `status` moves forward only: listening → sent → approved.

## Canned case

`data/cases/nani.json` is a complete `Case` in `sent` state — Nani, fever, two requested
meds, metformin as `takes`, karela as `remedy`, one high flag. Stream C builds the
pharmacist console against it from hour 2. Stream B's job is to produce this shape live.

# Urdu test fixtures

Two real Urdu speech clips with human reference transcripts, used by `../gemini.live.test.ts`.

| File | Seconds | FLEURS id |
|---|---|---|
| `urdu-hospital.wav` | 10.4 | 1938 (test split, row 4) |
| `urdu-short.wav` | 6.2 | 1930 (test split, row 1) |

References are in `urdu.json` (`raw_transcription` from the dataset).

Source: **FLEURS** (Google), config `ur_pk`, via Hugging Face `google/fleurs`.
License: **CC BY 4.0**. Conneau et al., "FLEURS: Few-shot Learning Evaluation of Universal
Representations of Speech", 2022.

These are clean read speech. They prove the pipeline produces correct Urdu; they do not
predict accuracy on a noisy counter (that is what the bake-off clips are for).

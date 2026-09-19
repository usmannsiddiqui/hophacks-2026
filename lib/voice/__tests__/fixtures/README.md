# Urdu test fixtures

Two real Urdu speech clips with human reference transcripts, used by `../scribe.live.test.ts`.

| File | Seconds | FLEURS id |
|---|---|---|
| `urdu-hospital.wav` | 10.4 | 1938 (test split, row 4) |
| `urdu-short.wav` | 6.2 | 1930 (test split, row 1) |

References are in `urdu.json` (`raw_transcription` from the dataset).

Source: [FLEURS on Hugging Face](https://huggingface.co/datasets/google/fleurs), Google
config `ur_pk`. License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
[Conneau et al., "FLEURS: Few-shot Learning Evaluation of Universal Representations of
Speech", 2022](https://arxiv.org/abs/2205.12446).

These are clean read speech. They support evaluating whether the pipeline produces correct Urdu; they do not
predict accuracy on a noisy counter (that is what the bake-off clips are for).

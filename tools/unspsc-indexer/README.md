# unspsc-indexer

Builds the binary index (`unspsc.bin`) and PCA projection (`unspsc-pca.json`)
consumed by the `unspsc-search` skill in
`Android/src/app/src/main/assets/skills/unspsc-search/`.

Copied (and lightly adapted for output paths) from the original `gratitude/`
repo. The two adapted bits:

- `scripts/build-unspsc-index.ts` — `--out-dir` flag, defaulted to the skill's
  asset directory so a rebuild lands in the bundled APK without manual
  copying.
- `scripts/download-embedding-model.ts` — same `--out-dir` flag, defaulted to
  the skill's `assets/models/...` so the on-device WebView finds it via
  `env.localModelPath`.

## Pipeline

```
CSVs (src/constants/*.csv)
  ↓  ingest-unspsc-taxonomy.ts  (~5 min)
data/unspsc-taxonomy.json
  ↓  build-unspsc-index.ts  (~25–30 min, dominated by ~150k embedding calls)
Android/.../skills/unspsc-search/assets/{unspsc.bin, unspsc-pca.json}
```

## Setup

```bash
cd gallery/tools/unspsc-indexer
npm install
```

Fetch the EmbeddingGemma weights. The 196 MB `model_q4.onnx_data` file is
**gitignored** (above GitHub's 100 MB limit), so a fresh clone will not have
it on disk and the `unspsc-search` skill will fail to load in the APK until
this runs:

```bash
npm run download:model
```

Pulls the EmbeddingGemma-300m ONNX files (`model_q4.onnx` + `.onnx_data`,
tokenizer, configs) into
`Android/src/app/src/main/assets/skills/unspsc-search/assets/models/onnx-community/embeddinggemma-300m-ONNX/`.
~200 MB total, runs once.

## Building the index

### Option A — full taxonomy (~25–30 min)

Re-ingest the full UNSPSC taxonomy from CSVs and rebuild:

```bash
npm run ingest:unspsc                                 # writes data/unspsc-taxonomy.json
npm run build:index -- --source data/unspsc-taxonomy.json
```

### Option B — trimmed taxonomy from compactionPlan.mjs

Use the compacted taxonomy produced by
`tests/unspsc-search/compactionPlan.mjs` to rebuild a much smaller index. With
the default rules the taxonomy shrinks ~94%, so the embed pass is correspondingly
faster:

```bash
# 1. Generate the trimmed taxonomy (instant)
cd ../../tests/unspsc-search
node compactionPlan.mjs

# 2. Rebuild the index from the trimmed taxonomy
cd ../../tools/unspsc-indexer
npm run build:index:from-trimmed
```

### Option C — curated 103-code build (~1 min)

For a fast iteration that uses only the curated mutual-aid codes baked into
`src/constants/unspscCodes.ts`:

```bash
npm run build:index
```

## After a rebuild

The skill's `loadOnce()` memoizes the index in WebView memory, so a fresh APK
build (or app restart) is needed to pick up the new `unspsc.bin`. Run the
test harness against the new index to compare retrieval quality:

```bash
cd ../../tests/unspsc-search
npm run eval
```

## Notes / known issues

- PCA is fit on the canonical embeddings (covariance method via `ml-pca`)
  with a capped sample size of 8,000 vectors — enough to estimate top-32
  directions in 384-d space without holding the full embedding set in
  memory twice. The fit reports variance-explained on stdout; expect ~50–70%
  for top-32 of the MiniLM space. Adjust `PCA_FIT_SAMPLE` in
  `build-unspsc-index.ts` if you want a larger fit.
- Output paths are relative to `tools/unspsc-indexer/scripts/`. If you move
  this directory, update the `--out-dir` defaults in `build-unspsc-index.ts`
  and `download-embedding-model.ts`.
- The CSVs under `src/constants/` are the same UNSPSC release that produced
  the existing `unspsc-taxonomy.json`. Don't replace them with a newer
  release without also re-checking the curated codes in `unspscCodes.ts` /
  `unspscCodesMeta.ts`.

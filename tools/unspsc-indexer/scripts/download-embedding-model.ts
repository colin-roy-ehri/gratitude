import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL =
  'https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX/resolve/main';
// Default to the unspsc-search skill's bundled assets/models directory so
// env.localModelPath in scripts/index.html resolves the on-device model
// without a network round-trip. Override with --out-dir <path>.
const args = process.argv.slice(2);
const outDirIdx = args.indexOf('--out-dir');
const OUT_DIR =
  outDirIdx >= 0
    ? args[outDirIdx + 1]
    : resolve(
        __dirname,
        '../../../Android/src/app/src/main/assets/skills/unspsc-search/assets/models/onnx-community/embeddinggemma-300m-ONNX'
      );

// File list for EmbeddingGemma-300m-ONNX. The model uses an external-data ONNX
// format (`.onnx` + `.onnx_data`) for the q4 quantization — both must be
// downloaded side-by-side. `q4` is ~197 MB total; switch the two q4 entries
// to `model_quantized.onnx` / `model_quantized.onnx_data` for the larger
// (~309 MB) q8 variant if retrieval quality demands it. fp16 is unsupported
// by EmbeddingGemma activations.
const FILES = [
  'config.json',
  'generation_config.json',
  'tokenizer.json',
  'tokenizer.model',
  'tokenizer_config.json',
  'special_tokens_map.json',
  'added_tokens.json',
  'onnx/model_q4.onnx',
  'onnx/model_q4.onnx_data',
];

async function download() {
  console.log(`Downloading EmbeddingGemma-300m-ONNX model files to ${OUT_DIR}...\n`);

  for (const file of FILES) {
    const url = `${BASE_URL}/${file}`;
    const outPath = join(OUT_DIR, file);
    const outDir = dirname(outPath);

    mkdirSync(outDir, { recursive: true });

    console.log(`Downloading ${file}...`);
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
    }

    const buf = await res.arrayBuffer();
    writeFileSync(outPath, Buffer.from(buf));
    console.log(`  ✓ ${outPath} (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB)\n`);
  }

  console.log('Done! Model files are ready for bundling.');
}

download().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

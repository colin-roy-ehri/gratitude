// Loads the unspsc-search skill's JS unmodified (modulo the CDN import) inside
// Node and exposes a `search(query, opts)` function. The skill itself is a
// `<script type="module">` block in scripts/index.html; we extract it, swap the
// CDN @xenova/transformers import for the locally-installed package, install a
// fetch shim that resolves the skill's /assets/... URLs to disk, and override
// env.localModelPath to the on-disk model directory.
//
// Usage:
//   import { search, ready } from "./runHarness.mjs";
//   await ready();
//   const r = await search("Office supplies — blue ballpoint pen");
//
// CLI smoke test:
//   node runHarness.mjs --query "Office supplies — blue ballpoint pen"

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SKILL_DIR = path.join(
  REPO_ROOT,
  "Android",
  "src",
  "app",
  "src",
  "main",
  "assets",
  "skills",
  "unspsc-search"
);
const ASSET_DIR = path.join(SKILL_DIR, "assets");
const SCRIPT_PATH = path.join(SKILL_DIR, "scripts", "index.html");
const URL_PREFIX = "/assets/skills/unspsc-search/assets/";

function installFetchShim() {
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (!u.startsWith(URL_PREFIX)) {
      throw new Error(`fetch shim: unhandled URL ${u}`);
    }
    const filePath = path.join(ASSET_DIR, u.slice(URL_PREFIX.length));
    const buf = await readFile(filePath);
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      json: async () => JSON.parse(buf.toString("utf8")),
      text: async () => buf.toString("utf8"),
    };
  };
}

async function transformAndImportSkill() {
  const html = await readFile(SCRIPT_PATH, "utf8");
  const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("skill script block not found in index.html");
  let js = m[1];

  // Swap the CDN import for the locally-installed package. Match the
  // @huggingface/transformers v3+ shape (the v2 @xenova/transformers form
  // had different bindings). Be tolerant of which named imports are listed
  // so the harness keeps working if the skill's imports change.
  js = js.replace(
    /import\s*\{[^}]+\}\s*from\s*["']https:\/\/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@[^"']+["'];?/,
    (match) =>
      match.replace(
        /https:\/\/cdn\.jsdelivr\.net\/npm\/@huggingface\/transformers@[^"']+/,
        '@huggingface/transformers'
      )
  );
  if (!/from\s+["']@huggingface\/transformers["']/.test(js)) {
    throw new Error("failed to rewrite @huggingface/transformers import");
  }

  // After the skill sets env.* values, override localModelPath to the absolute
  // disk path so transformers.js's Node loader (uses fs, not fetch) finds the
  // model files.
  const modelsAbs = path.join(ASSET_DIR, "models") + path.sep;
  js = js.replace(
    /env\.backends\.onnx\.wasm\.wasmPaths\s*=[\s\S]*?;/,
    (match) =>
      `${match}\n      env.localModelPath = ${JSON.stringify(modelsAbs)};`
  );

  // Expose the result handler on globalThis (the skill assigns to window.*).
  // We provide a window alias so the assignment lands somewhere we can read.
  globalThis.window = globalThis;

  // Must live inside the harness dir so Node ESM bare-specifier resolution
  // (e.g. "@xenova/transformers") finds our local node_modules.
  const cacheDir = path.join(__dirname, ".skill-cache");
  await mkdir(cacheDir, { recursive: true });
  const tmpFile = path.join(cacheDir, "skill.mjs");
  await writeFile(tmpFile, js, "utf8");
  await import(pathToFileURL(tmpFile).href);

  if (typeof globalThis.ai_edge_gallery_get_result !== "function") {
    throw new Error(
      "skill did not register window.ai_edge_gallery_get_result"
    );
  }
}

let readyPromise = null;
export function ready() {
  if (!readyPromise) {
    installFetchShim();
    readyPromise = transformAndImportSkill();
  }
  return readyPromise;
}

export async function search(query, opts = {}) {
  await ready();
  const payload = JSON.stringify({ query, ...opts });
  const raw = await globalThis.ai_edge_gallery_get_result(payload);
  return JSON.parse(raw);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  const idx = process.argv.indexOf("--query");
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error('Usage: node runHarness.mjs --query "<text>" [--segment N] [--limit N]');
    process.exit(2);
  }
  const query = process.argv[idx + 1];
  const segIdx = process.argv.indexOf("--segment");
  const limIdx = process.argv.indexOf("--limit");
  const opts = {};
  if (segIdx !== -1) opts.segment = Number(process.argv[segIdx + 1]);
  if (limIdx !== -1) opts.limit = Number(process.argv[limIdx + 1]);
  const t0 = Date.now();
  const r = await search(query, opts);
  const dt = Date.now() - t0;
  console.log(JSON.stringify(r, null, 2));
  console.error(`(${dt} ms)`);
}

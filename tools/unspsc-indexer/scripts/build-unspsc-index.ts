/**
 * Build script: Generate binary UNSPSC index with vector embeddings.
 *
 * Usage:
 *   npm run build:index                              # Use curated 103 codes
 *   npm run build:index -- --source data/unspsc-taxonomy.json  # Use full taxonomy
 *
 * Output:
 *   <out-dir>/unspsc.bin        - Segment-partitioned binary vector index
 *   <out-dir>/unspsc-pca.json   - PCA projection matrix (768 -> 32 dims)
 *
 * Embedder: EmbeddingGemma-300m (768-dim, multilingual, task-prompt sensitive).
 * Documents are prefixed with "title: none | text: " before embedding so the
 * indexed vectors live in the same space the runtime query embeds into.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AutoModel, AutoTokenizer } from '@huggingface/transformers';
import { PCA } from 'ml-pca';

const MODEL_ID = 'onnx-community/embeddinggemma-300m-ONNX';
const EMBED_DIM = 768; // EmbeddingGemma native output dim
const PROJECTED_DIM = 64; // PCA target dim. Must match VEC_DIM in
                          // Android/.../skills/unspsc-search/scripts/index.html.
                          // Larger dim → more discrimination retained, bigger
                          // index file, slower per-record scoring. 32 → 64
                          // doubles index size; 56% → ~70%+ variance retained.
const RECORD_SIZE = 4 + 1 + 2 + PROJECTED_DIM * 3 + 4 * 3; // header + 3 quantized vecs + 3 scales
const DOC_PREFIX = 'title: none | text: ';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CodeInfo {
  code: number;
  name: string;
  segment: number;
  family: number;
  class: number;
  synonyms: string[];
  context: string;
}

/**
 * Curated semantic overrides for UNSPSC class codes that the unspsc-search
 * skill remaps at display time via CURATED_CLASSES (scripts/index.html).
 *
 * Without this table, codes 931515–931531 are embedded with their raw UNSPSC
 * names ("Administrative reform services", "Privatization programs", etc.)
 * which have nothing to do with the peer-support semantics the skill
 * actually surfaces. Users searching for "emotional support" or "ride to
 * appointment" never hit the right vector.
 *
 * Apply this to every entry whose `class` matches a key here BEFORE
 * embedding. The class-root entry and all commodities under it inherit the
 * same canonical/synonyms/context, which collapses retrieval onto the
 * curated meaning. The skill's runtime describeCode() already maps the
 * specific code back to the curated label, so display stays consistent.
 *
 * Keep this table in sync with:
 *   - CURATED_CLASSES in Android/.../skills/unspsc-search/scripts/index.html
 *   - CURATED_CLASS_NAMES in tests/unspsc-search/generateFixtures.mjs
 *   - DRILLDOWN_CLASSES (community block) in tests/unspsc-search/compactionPlan.mjs
 */
// The `name` here is what gets embedded as the canonical (weight 0.5). It
// must lead with the *distinguishing* concept, not the shared marker word
// "Peer" — otherwise sibling classes collide (Peer Emotional vs Peer Care
// vs Peer Care & Daily Living all share top-weighted tokens). The skill's
// runtime display name (from CURATED_CLASSES in scripts/index.html) is
// independent — users see "Peer Emotional & Social Support" regardless of
// what we embed here.
const CURATED_OVERRIDES: Record<
  number,
  { name: string; synonyms: string[]; context: string }
> = {
  931515: {
    name: 'Emotional listening and companionship peer support',
    synonyms: [
      'emotional support',
      'peer listening',
      'mental health peer support',
      'companionship',
      'friendly check-in',
      'someone to talk to',
      'peer counseling',
      'isolation support',
    ],
    context: 'Community peer mutual support services',
  },
  931516: {
    name: 'Daily living help with errands cooking cleaning household tasks',
    synonyms: [
      'daily living help',
      'errands',
      'cooking help',
      'cleaning help',
      'household tasks',
      'caregiver support',
      'home help',
      'companion care',
      'help with bathing dressing eating',
    ],
    context: 'Community peer mutual support services',
  },
  931517: {
    name: 'Childcare babysitting youth mentoring tutoring',
    synonyms: [
      'babysitting',
      'childcare',
      'kids',
      'children',
      'youth mentoring',
      'after school care',
      'tutoring',
      'parenting support',
      'play group',
    ],
    context: 'Community peer mutual support services',
  },
  931518: {
    name: 'Rides transportation and accompaniment to appointments',
    synonyms: [
      'rides',
      'driving',
      'accompaniment',
      'escort to appointments',
      'drive to appointment',
      'transport',
      'help getting around',
      'lift',
    ],
    context: 'Community peer mutual support services',
  },
  931519: {
    name: 'Legal forms paperwork bureaucratic and government navigation help',
    synonyms: [
      'legal help',
      'paperwork',
      'forms',
      'lawyer',
      'court support',
      'immigration help',
      'benefits applications',
      'government forms',
      'know your rights',
    ],
    context: 'Community peer mutual support services',
  },
  931520: {
    name: 'Healthcare navigation medical appointment and prescription help',
    synonyms: [
      'medical appointment help',
      'doctor visit support',
      'healthcare navigation',
      'medication management',
      'prescription help',
      'insurance navigation',
      'hospital accompaniment',
    ],
    context: 'Community peer mutual support services',
  },
  931521: {
    name: 'Home repair handyman plumbing electrical maintenance',
    synonyms: [
      'home repair',
      'plumbing',
      'electrical work',
      'painting',
      'carpentry',
      'handyman',
      'household maintenance',
      'appliance repair',
      'fix something',
    ],
    context: 'Community peer mutual support services',
  },
  931522: {
    name: 'Meal food groceries kitchen pantry and hot meal delivery',
    synonyms: [
      'meal support',
      'food',
      'groceries',
      'cooking for someone',
      'meal delivery',
      'food bank',
      'hot meal',
      'kitchen help',
      'fresh food',
      'pantry',
    ],
    context: 'Community peer mutual support services',
  },
  931523: {
    name: 'Teaching lessons workshops skill and knowledge sharing',
    synonyms: [
      'teaching',
      'lessons',
      'classes',
      'workshop',
      'knowledge sharing',
      'mentorship',
      'skill sharing',
      'tutoring',
    ],
    context: 'Community peer mutual support services',
  },
  931524: {
    name: 'Safety protection domestic violence support and safe escort',
    synonyms: [
      'safety',
      'protection',
      'walk home',
      'safe space',
      'domestic violence support',
      'abuse prevention',
      'community safety',
    ],
    context: 'Community peer mutual support services',
  },
  931525: {
    name: 'Harm reduction naloxone needle exchange overdose prevention',
    synonyms: [
      'harm reduction',
      'naloxone',
      'narcan',
      'needle exchange',
      'safer use',
      'drug support',
      'fentanyl test strips',
      'overdose prevention',
    ],
    context: 'Community peer mutual support services',
  },
  931526: {
    name: 'Street medicine homeless mobile clinic and outreach',
    synonyms: [
      'street medicine',
      'outreach',
      'homeless support',
      'unhoused support',
      'mobile clinic',
      'basic medical care',
      'wound care outreach',
    ],
    context: 'Community peer mutual support services',
  },
  931527: {
    name: 'Reentry support after incarceration formerly incarcerated returning citizens',
    synonyms: [
      'reentry support',
      'formerly incarcerated',
      'post-prison support',
      'parole',
      'criminal record support',
      'returning citizen',
    ],
    context: 'Community peer mutual support services',
  },
  931528: {
    name: 'Reproductive health pregnancy abortion and family planning support',
    synonyms: [
      'reproductive health',
      'abortion access',
      'pregnancy support',
      'family planning',
      'contraception',
      'prenatal care',
      'maternal support',
    ],
    context: 'Community peer mutual support services',
  },
  931529: {
    name: 'Disability accessibility mobility aid wheelchair sign language accommodation',
    synonyms: [
      'disability support',
      'accessibility',
      'mobility aid',
      'ASL',
      'sign language',
      'wheelchair access',
      'accommodation',
      'access needs',
    ],
    context: 'Community peer mutual support services',
  },
  931530: {
    name: 'Community gathering events potluck meetup and social spaces',
    synonyms: [
      'gathering',
      'community space',
      'event',
      'meetup',
      'potluck',
      'social gathering',
      'community hosting',
    ],
    context: 'Community peer mutual support services',
  },
  931531: {
    name: 'Friendship visits anti-isolation neighbor connection reduce loneliness',
    synonyms: [
      'connection',
      'friendship',
      'anti-isolation',
      'social connection',
      'friends',
      'neighbor visit',
      'reduce loneliness',
    ],
    context: 'Community peer mutual support services',
  },
};

function applyCuratedOverrides(codes: CodeInfo[]): { count: number } {
  let count = 0;
  for (const c of codes) {
    const ov = CURATED_OVERRIDES[c.class];
    if (!ov) continue;
    c.name = ov.name;
    c.synonyms = ov.synonyms.slice();
    c.context = ov.context;
    count++;
  }
  return { count };
}

/**
 * Load codes from JSON file (ingested taxonomy)
 */
async function loadFromJSON(filePath: string): Promise<CodeInfo[]> {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const codes = JSON.parse(data) as CodeInfo[];
    console.log(`[Build] Loaded ${codes.length} codes from ${filePath}`);
    return codes;
  } catch (e) {
    throw new Error(`Failed to load JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Extract all curated codes from unspscCodes.ts exports
 */
async function loadCuratedCodes(): Promise<CodeInfo[]> {
  const codesModule = await import('../src/constants/unspscCodes.js');
  const metaModule = await import('../src/constants/unspscCodesMeta.js');

  const codes: CodeInfo[] = [];

  // Extract peer mutual aid codes
  const peerServices = codesModule.PEER_MUTUAL_AID_CODES;
  for (const [, serviceClass] of Object.entries(peerServices)) {
    const classNum = (serviceClass as any).CLASS as number;
    for (const [, code] of Object.entries(serviceClass)) {
      if (typeof code === 'number' && code !== classNum) {
        const segment = Math.floor(code / 1000000);
        const family = Math.floor(code / 10000);
        const classVal = Math.floor(code / 100);
        const name = codesModule.getCodeDescription(code);
        const meta = metaModule.CODE_META[code];

        codes.push({
          code,
          name,
          segment,
          family,
          class: classVal,
          synonyms: meta?.synonyms ?? [],
          context: meta?.context ?? name,
        });
      }
    }
  }

  // Extract material goods codes (sample from meta)
  for (const [codeStr, meta] of Object.entries(metaModule.CODE_META)) {
    const code = parseInt(codeStr, 10);
    // Skip if already added (peer codes)
    if (codes.find(c => c.code === code)) continue;

    const segment = Math.floor(code / 1000000);
    const family = Math.floor(code / 10000);
    const classVal = Math.floor(code / 100);
    const name = codesModule.getCodeDescription(code);

    codes.push({
      code,
      name,
      segment,
      family,
      class: classVal,
      synonyms: meta.synonyms ?? [],
      context: meta.context ?? name,
    });
  }

  return codes;
}

/**
 * Build a lookup of code → name for parent levels.
 *
 * UNSPSC parent codes appear in the taxonomy as entries with trailing zeros:
 *   - segment: SS000000 (e.g. 42000000 "Medical Equipment...")
 *   - family:  SSFF0000 (e.g. 42180000 "Patient care and treatment products...")
 *   - class:   SSFFCC00 (e.g. 42182000 "Patient beds and accessories...")
 *
 * The ingest script writes these parent rows into the same taxonomy.json that
 * loadFromJSON() consumes, so we can resolve names purely from in-memory data.
 */
function buildParentNameMap(codes: CodeInfo[]): Map<number, string> {
  const byCode = new Map<number, string>();
  for (const c of codes) {
    if (c.name) byCode.set(c.code, c.name);
  }
  return byCode;
}

/**
 * Build a "Segment > Family > Class" breadcrumb for a commodity-level code.
 * Falls back to whatever pieces are available if a parent is missing.
 *
 * Example for 42182002 (Patient mattresses):
 *   "Medical Equipment Accessories Supplies > Patient care and treatment products > Patient beds and accessories"
 */
function buildBreadcrumb(code: CodeInfo, byCode: Map<number, string>): string {
  const parts: string[] = [];
  const segCode = code.segment * 1000000;
  const famCode = code.family * 10000;
  const clsCode = code.class * 100;

  if (segCode > 0 && byCode.has(segCode)) parts.push(byCode.get(segCode)!);
  if (famCode > 0 && famCode !== segCode && byCode.has(famCode))
    parts.push(byCode.get(famCode)!);
  if (clsCode > 0 && clsCode !== famCode && byCode.has(clsCode))
    parts.push(byCode.get(clsCode)!);

  // If we couldn't resolve any parent (e.g. for parent rows themselves), fall
  // back to the original generic context to avoid an empty embedding input.
  if (parts.length === 0) return code.context || code.name;
  return parts.join(' > ');
}

/**
 * Combine code name, synonyms, and hierarchical breadcrumb into three
 * expressions. The breadcrumb in `context` replaces the previous segment/family
 * digit-text — it lets the embedding scorer reject codes whose parents don't
 * match the query (e.g. "Patient care" vs "Domestic merchandise" for "I need a
 * bed").
 */
function getCodeExpressions(
  code: CodeInfo,
  byCode: Map<number, string>,
): {
  canonical: string;
  synonym: string;
  context: string;
} {
  // For curated classes the breadcrumb's family/segment prefix is bureaucratic
  // ("Politics and Civic Affairs Services > Public administration ...") and
  // actively misleads retrieval. Use the override's `context` directly.
  const isCurated = CURATED_OVERRIDES[code.class] !== undefined;
  return {
    canonical: code.name,
    synonym: code.synonyms.slice(0, 8).join(', '),
    context: isCurated ? code.context : buildBreadcrumb(code, byCode),
  };
}

/**
 * Fit a real PCA (covariance method) and serialize as { matrix, mean }
 * compatible with the unspsc-search skill's projectQuery():
 *   matrix is [outputDim][inputDim] — each row is a principal component.
 *   mean is [inputDim] — feature-wise mean used for centering.
 *
 * For large code counts we subsample uniformly for the fit; projection at
 * runtime still applies the same matrix to every embedding so this is a
 * speed/memory tradeoff, not a quality one (a few-thousand-row sample is
 * already enough to estimate top-32 directions in 384-d space).
 */
function fitPCA(
  embeddings: Float32Array[],
  inputDim: number,
  outputDim: number,
  fitSampleSize: number
): { matrix: number[][]; mean: number[] } {
  let fitVectors = embeddings;
  if (fitSampleSize > 0 && fitSampleSize < embeddings.length) {
    // Deterministic uniform stride sample.
    const stride = embeddings.length / fitSampleSize;
    fitVectors = [];
    for (let i = 0; i < fitSampleSize; i++) {
      fitVectors.push(embeddings[Math.floor(i * stride)]);
    }
  }

  const data: number[][] = new Array(fitVectors.length);
  for (let r = 0; r < fitVectors.length; r++) {
    const row = new Array(inputDim);
    const v = fitVectors[r];
    for (let c = 0; c < inputDim; c++) row[c] = v[c];
    data[r] = row;
  }

  const t0 = Date.now();
  console.log(
    `  fitting PCA on ${data.length} × ${inputDim} (covariance method)...`
  );
  const pca = new PCA(data, { method: 'covarianceMatrix', center: true });
  console.log(`  ✓ fit in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // ml-pca stores eigenvectors as columns of U (a [D, D] Matrix), sorted by
  // descending eigenvalue. We want the top `outputDim` components as rows of
  // a plain JS array so the skill's projectQuery() can dot them against a
  // centered query without needing ml-matrix at runtime.
  const eigvecs = pca.getEigenvectors();
  const matrix: number[][] = new Array(outputDim);
  for (let i = 0; i < outputDim; i++) {
    const row = new Array(inputDim);
    for (let j = 0; j < inputDim; j++) {
      row[j] = eigvecs.get(j, i);
    }
    matrix[i] = row;
  }

  const eigvals = pca.getEigenvalues();
  const totalVar = eigvals.reduce((s, v) => s + v, 0);
  const keptVar = eigvals.slice(0, outputDim).reduce((s, v) => s + v, 0);
  console.log(
    `  variance explained by top ${outputDim} of ${inputDim}: ${(
      (keptVar / totalVar) *
      100
    ).toFixed(1)}%`
  );

  // pca.means is a plain number[] of length inputDim.
  const meanArr = (pca as any).means as number[];
  return { matrix, mean: Array.from(meanArr) };
}

/**
 * Project a vector using PCA matrix.
 */
function projectPCA(vec: Float32Array, mean: number[], matrix: number[][]): Float32Array {
  const centered = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    centered[i] = vec[i] - mean[i];
  }

  const projected = new Float32Array(matrix.length);
  for (let i = 0; i < matrix.length; i++) {
    let sum = 0;
    for (let j = 0; j < Math.min(matrix[i].length, centered.length); j++) {
      sum += centered[j] * matrix[i][j];
    }
    projected[i] = sum;
  }

  return projected;
}

/**
 * Quantize a float32 to int8.
 */
function quantizeVector(vec: Float32Array): { quantized: Int8Array; scale: number } {
  const absMax = Math.max(...vec.map(Math.abs));
  const scale = absMax > 0 ? 127 / absMax : 1;
  const quantized = new Int8Array(vec.map(v => Math.round(v * scale)));
  return { quantized, scale };
}

/**
 * Write binary index file.
 */
function writeBinaryIndex(
  filename: string,
  codes: CodeInfo[],
  vectors: {
    canonical: Float32Array;
    synonym: Float32Array;
    context: Float32Array;
  }[],
  scales: {
    canonical: number;
    synonym: number;
    context: number;
  }[]
): void {
  // VEC_DIM and RECORD_SIZE come from module scope and must match the skill's
  // scripts/index.html reader.

  // Group codes by segment
  const bySegment = new Map<number, { code: CodeInfo; vecIdx: number }[]>();
  codes.forEach((code, idx) => {
    if (!bySegment.has(code.segment)) {
      bySegment.set(code.segment, []);
    }
    bySegment.get(code.segment)!.push({ code, vecIdx: idx });
  });

  const segments = Array.from(bySegment.keys()).sort((a, b) => a - b);
  const numSegments = segments.length;

  // Header: 8 bytes
  const headerSize = 8;
  const dirSize = numSegments * 8;
  const recordsStart = headerSize + dirSize;

  const buffer = Buffer.allocUnsafe(recordsStart + codes.length * RECORD_SIZE);

  // Write header
  let offset = 0;
  buffer.writeUInt32LE(0x554e5343, offset); // magic "UNSC"
  offset += 4;
  buffer.writeUInt8(1, offset++); // version
  buffer.writeUInt8(numSegments, offset++); // num_segments
  buffer.writeUInt8(1, offset++); // model_id (all-MiniLM-L6-v2)
  buffer.writeUInt8(0, offset++); // reserved

  // Write segment directory
  let recordOffset = recordsStart;
  for (const segmentId of segments) {
    const segmentCodes = bySegment.get(segmentId)!;
    buffer.writeUInt8(segmentId, offset++);
    // Write 24-bit code count
    const count = segmentCodes.length;
    buffer.writeUInt8(count & 0xff, offset++);
    buffer.writeUInt8((count >> 8) & 0xff, offset++);
    buffer.writeUInt8((count >> 16) & 0xff, offset++);
    buffer.writeUInt32LE(recordOffset, offset);
    offset += 4;
    recordOffset += segmentCodes.length * RECORD_SIZE;
  }

  // Write records (grouped by segment)
  for (const segmentId of segments) {
    const segmentCodes = bySegment.get(segmentId)!;
    for (const { code, vecIdx } of segmentCodes) {
      const { quantized: canonical, scale: scale_c } = quantizeVector(vectors[vecIdx].canonical);
      const { quantized: synonym, scale: scale_s } = quantizeVector(vectors[vecIdx].synonym);
      const { quantized: context, scale: scale_x } = quantizeVector(vectors[vecIdx].context);

      // code (4)
      buffer.writeUInt32LE(code.code, offset);
      offset += 4;
      // segment (1)
      buffer.writeUInt8(code.segment, offset++);
      // family (2)
      buffer.writeUInt16LE(code.family, offset);
      offset += 2;
      // canonical_q (PROJECTED_DIM bytes, INT8)
      buffer.set(canonical, offset);
      offset += PROJECTED_DIM;
      // synonym_q (PROJECTED_DIM bytes)
      buffer.set(synonym, offset);
      offset += PROJECTED_DIM;
      // context_q (PROJECTED_DIM bytes)
      buffer.set(context, offset);
      offset += PROJECTED_DIM;
      // scales (3 * 4 = 12)
      buffer.writeFloatLE(scale_c, offset);
      offset += 4;
      buffer.writeFloatLE(scale_s, offset);
      offset += 4;
      buffer.writeFloatLE(scale_x, offset);
      offset += 4;
    }
  }

  fs.writeFileSync(filename, buffer);
  console.log(`✓ Written binary index: ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

/**
 * Main build function.
 */
async function main() {
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf('--source');
  const sourceFile = sourceIdx >= 0 ? args[sourceIdx + 1] : null;
  const outDirIdx = args.indexOf('--out-dir');
  // Default output: write directly into the unspsc-search skill's asset dir
  // so a rebuild is picked up without manual copying. Override with
  // --out-dir <path>.
  const outDir =
    outDirIdx >= 0
      ? args[outDirIdx + 1]
      : path.resolve(
          __dirname,
          '../../../Android/src/app/src/main/assets/skills/unspsc-search/assets'
        );

  try {
    console.log('Building UNSPSC vector search index...\n');

    // Load codes and metadata
    let codes: CodeInfo[];
    if (sourceFile) {
      console.log(`Loading codes from ${sourceFile}...`);
      codes = await loadFromJSON(sourceFile);
    } else {
      console.log('Loading curated codes...');
      codes = await loadCuratedCodes();
    }
    console.log(`✓ Loaded ${codes.length} codes\n`);

    // Apply curated semantic overrides BEFORE the parent-name map and embed
    // pass — so commodities under e.g. 931515 inherit the peer-support
    // canonical/synonym/context, and the breadcrumb assembled below uses the
    // curated label as the class-level segment of the breadcrumb.
    console.log('Applying curated semantic overrides...');
    const { count: overrideCount } = applyCuratedOverrides(codes);
    console.log(`✓ Overrode ${overrideCount} entries from CURATED_OVERRIDES\n`);

    // Build parent name map for hierarchical breadcrumb context
    console.log('Building parent name map...');
    const byCode = buildParentNameMap(codes);
    console.log(`✓ Mapped ${byCode.size} code → name entries (segments, families, classes, commodities)\n`);

    // Initialize embedding model
    console.log(`Initializing embedding model (${MODEL_ID})...`);
    const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
    const model = await AutoModel.from_pretrained(MODEL_ID, {
      dtype: 'q4', // EmbeddingGemma does not support fp16; q4|q8|fp32 only.
    });
    console.log('✓ Model ready\n');

    // Embed a batch of strings and return their sentence_embeddings as
    // Float32Array[] of length batch. Applies the document task prefix.
    async function embedBatch(texts: string[]): Promise<Float32Array[]> {
      const prefixed = texts.map((t) => DOC_PREFIX + (t || 'generic'));
      const inputs = await tokenizer(prefixed, { padding: true });
      const { sentence_embedding } = await model(inputs);
      // sentence_embedding is a Tensor of shape [batch, 768] with .data as
      // a flat Float32Array. Slice it into per-row vectors.
      const flat = sentence_embedding.data as Float32Array;
      const out: Float32Array[] = [];
      for (let i = 0; i < texts.length; i++) {
        out.push(flat.slice(i * EMBED_DIM, (i + 1) * EMBED_DIM));
      }
      return out;
    }

    // Spot-check breadcrumb assembly on a couple known codes (helps catch
    // missing parent rows in the taxonomy before a 25-min embed run).
    for (const probe of [42182002, 52121602, 50201709, 93151501]) {
      const c = codes.find((x) => x.code === probe);
      if (c) {
        const expr = getCodeExpressions(c, byCode);
        console.log(`  [probe] ${probe}: ${expr.canonical}`);
        console.log(`          context = "${expr.context}"`);
      }
    }
    console.log();

    // Generate expressions and embed. EmbeddingGemma is heavy enough that
    // batching matters a lot for throughput on CPU. Batch size tuned to
    // keep tokenizer padding length reasonable; bump up if you have RAM.
    console.log('Embedding code expressions...');
    const vectors: {
      canonical: Float32Array;
      synonym: Float32Array;
      context: Float32Array;
    }[] = [];
    const scales: { canonical: number; synonym: number; context: number }[] = [];
    let totalEmbeddings = 0;

    const BATCH = 16;
    const exprs = codes.map((c) => getCodeExpressions(c, byCode));
    const t0 = Date.now();
    for (let i = 0; i < codes.length; i += BATCH) {
      const slice = exprs.slice(i, i + BATCH);
      const [canon, syn, ctx] = await Promise.all([
        embedBatch(slice.map((e) => e.canonical)),
        embedBatch(slice.map((e) => e.synonym || 'generic')),
        embedBatch(slice.map((e) => e.context)),
      ]);
      for (let j = 0; j < slice.length; j++) {
        vectors.push({ canonical: canon[j], synonym: syn[j], context: ctx[j] });
        totalEmbeddings += 3;
      }
      if (i % (BATCH * 10) === 0 || i + BATCH >= codes.length) {
        const done = Math.min(i + BATCH, codes.length);
        const rate = (done / ((Date.now() - t0) / 1000)).toFixed(1);
        console.log(`  ${done}/${codes.length} (${rate} codes/s)`);
      }
    }
    console.log(`✓ Generated ${codes.length} vector triplets (${totalEmbeddings} total embeddings)\n`);

    // Fit a real PCA on the canonical embeddings. Canonical carries the most
    // signal of the three (the skill weights it 0.5 vs synonym 0.3 / context
    // 0.2), so fitting on it produces the best projection for retrieval.
    console.log(`Fitting PCA projection (${EMBED_DIM} -> ${PROJECTED_DIM}) on canonical embeddings...`);
    const PCA_FIT_SAMPLE = 8000; // capped fit sample; see fitPCA() comment
    const canonicalVecs = vectors.map((v) => v.canonical);
    const { matrix: pcaMatrix, mean: pcaMean } = fitPCA(
      canonicalVecs,
      EMBED_DIM,
      PROJECTED_DIM,
      PCA_FIT_SAMPLE
    );
    console.log('✓ PCA projection ready\n');

    // Project and quantize
    console.log('Projecting and quantizing vectors...');
    const projectedVectors = vectors.map(v => ({
      canonical: projectPCA(v.canonical, pcaMean, pcaMatrix),
      synonym: projectPCA(v.synonym, pcaMean, pcaMatrix),
      context: projectPCA(v.context, pcaMean, pcaMatrix),
    }));

    for (const pv of projectedVectors) {
      const scale_c = Math.max(...pv.canonical.map(Math.abs)) || 1;
      const scale_s = Math.max(...pv.synonym.map(Math.abs)) || 1;
      const scale_x = Math.max(...pv.context.map(Math.abs)) || 1;
      scales.push({ canonical: scale_c, synonym: scale_s, context: scale_x });
    }
    console.log('✓ Vectors projected and quantized\n');

    // Ensure the output directory exists.
    fs.mkdirSync(outDir, { recursive: true });

    // Write binary index
    const indexPath = path.join(outDir, 'unspsc.bin');
    writeBinaryIndex(indexPath, codes, projectedVectors, scales);

    // Write PCA matrix
    const pcaPath = path.join(outDir, 'unspsc-pca.json');
    fs.writeFileSync(
      pcaPath,
      JSON.stringify({ matrix: pcaMatrix, mean: pcaMean }, null, 2)
    );
    console.log(`✓ Written PCA matrix: ${pcaPath}\n`);

    console.log('✅ Build complete!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

main();

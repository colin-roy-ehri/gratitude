// Walks the UNSPSC taxonomy and produces a candidate trimmed taxonomy + a diff
// report, based on per-segment / per-family / per-class rules about how deep
// to keep entries.
//
// Rationale: in a peer-help app, no neighbor describes their offer at the
// "Bonded plate assemblies" or "Dried cut waxflowers" level. Most of UNSPSC's
// 70k entries are dead weight for retrieval. We keep:
//   - drilldown classes at COMMODITY level (Cats vs Dogs, formula vs cereal)
//   - community classes at COMMODITY level
//   - "consumer-y" segments at CLASS level
//   - industrial segments at FAMILY level
//   - everything else at CLASS by default
//
// When `--fold-synonyms` is on (default), each kept root absorbs the synonyms
// and name tokens of the descendants that get dropped. This preserves
// retrieval recall for queries that name a now-dropped commodity ("daffodils"
// still hits the kept "Fresh cut single species or varieties of flowers"
// class root because "daffodils" got folded into its synonyms).
//
// Outputs (under compaction/):
//   trimmed-taxonomy.json   — the candidate trimmed taxonomy
//   dropped-codes.json      — list of dropped entries with their fold target
//   report.md               — human-readable summary
//
// Usage:
//   node compactionPlan.mjs                       # default rules + fold synonyms
//   node compactionPlan.mjs --no-fold-synonyms    # don't fold
//   node compactionPlan.mjs --out=./alt-dir       # custom output dir

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TAXONOMY_PATH = path.join(
  REPO_ROOT,
  "Android/src/app/src/main/assets/skills/unspsc-search/assets/unspsc-taxonomy.json"
);

// ----- Configuration -----

const LEVEL_NUM = { segment: 0, family: 1, class: 2, commodity: 3 };

function level(entry) {
  if (entry.family === 0 && entry.class === 0) return "segment";
  if (entry.class === 0) return "family";
  if (entry.code % 100 === 0) return "class";
  return "commodity";
}

// Keep these classes at commodity level. Mirrors generateFixtures.mjs's
// DRILLDOWN_CLASSES — keep these two lists in sync.
const DRILLDOWN_CLASSES = new Set([
  // Pets & their care
  101015, 101016, 101017, 101113, 101218,
  // Home growing
  101515, 101519, 101616,
  // Food staples
  501316, 501317, 501318, 501715, 501718, 501819, 501921, 501929, 501930,
  502017,
  // Clothing
  531015, 531016, 531017, 531018, 531023, 531026, 531030, 531115, 531116,
  531119, 531216,
  // Personal care
  531316,
  // Health, disability, recovery
  421429, 421440, 422318, 422420, 422516, 423115,
  // Household / cleaning
  471218, 471315, 471316, 471318,
  // Kitchen
  481015, 481018, 481019,
  // Recreation
  491215, 491815,
  // Education, kids, creative
  601023, 601215, 601316, 601410, 601411,
]);

// Mirrors the skill's CURATED_CLASSES (scripts/index.html).
const COMMUNITY_CLASSES = new Set([
  931515, 931516, 931517, 931518, 931519, 931520, 931521, 931522, 931523,
  931524, 931525, 931526, 931527, 931528, 931529, 931530, 931531,
]);

// Per-segment defaults. Anything not listed gets DEFAULT_SEGMENT_LEVEL.
// Tune these based on what your downstream skills actually need to retrieve.
const SEGMENT_LEVELS = {
  // Segment 10 (live plants/animals): mostly flowers — collapse to family for
  // the floral families, keep classes for animals (overridden below).
  10: "family",

  // Industrial / engineering segments — collapse hard.
  11: "family", 12: "family", 13: "family", 14: "family", 15: "family",
  20: "family", 21: "family", 22: "family", 23: "family", 24: "family",
  25: "family", 26: "family", 27: "family",
  30: "family", 31: "family", 32: "family", 33: "family", 34: "family",
  35: "family", 36: "family", 37: "family", 38: "family", 39: "family",
  40: "family", 41: "family",

  // IT, office, comms — class is plenty.
  43: "class", 44: "class", 45: "class",

  // Consumer-y / human-relevant — class default.
  42: "class", 46: "class", 47: "class", 48: "class", 49: "class",
  50: "class", 51: "class", 52: "class", 53: "class", 54: "class",
  55: "class", 56: "class", 60: "class",

  // Services — most can be family (people request services in broad terms).
  70: "family", 71: "family", 72: "family", 73: "family", 76: "family",
  77: "family", 78: "family", 80: "family", 81: "family", 82: "family",
  83: "family", 84: "family", 85: "class", 86: "family",
  90: "class", 91: "class",

  // Defense / public-order: keep the broad strokes only.
  92: "family", 94: "family", 95: "family",

  // Politics & civic — family by default; community classes override below.
  93: "family",
};

// Family-level overrides — for picking out exceptions inside a segment.
const FAMILY_LEVELS = {
  // Inside seg 10 (defaulted to "family"), animals families should keep class.
  1010: "class", // Live animals
  1011: "class", // Animal feed and pet supplies
  1012: "class", // Pet treatments and accessories
  1015: "class", // Seeds and seedlings
  1016: "class", // Plants and flowers
  1017: "class", // Plant fertilizers
};

const DEFAULT_LEVEL = "class";

// Form-modifier family remap. UNSPSC enumerates parallel families for every
// preparation/treatment variant of fruits, vegetables, and cut flowers
// (organic / dried / frozen / canned / non-GMO / puree / fresh-cut etc.).
// For a peer-help app, "Tomatoes" is the same concept whether fresh, frozen,
// canned, or dried — the duplication just confuses retrieval and bloats the
// index. Collapse modifier families onto their canonical equivalent.
// The collapse merges synonyms/name tokens from the modifier entry into the
// canonical-family entry of the matching commodity (matched by the trailing
// 4 digits — i.e. class slot + commodity slot).
const FAMILY_REMAP = {
  // ---- Segment 50 fruits → canonical Fresh fruits (5030) ----
  5031: 5030, // Organic fresh fruits
  5032: 5030, // Dried fruit
  5033: 5030, // Dried organic fruit
  5034: 5030, // Frozen fruit
  5035: 5030, // Frozen organic fruit
  5036: 5030, // Canned or jarred fruit
  5037: 5030, // Canned or jarred organic fruit
  5038: 5030, // Fresh fruit purees
  5039: 5030, // Organic fresh fruit purees
  5052: 5030, // Non GMO fresh fruits
  5053: 5030, // Dried non GMO fruits
  5054: 5030, // Frozen non GMO fruits
  5055: 5030, // Canned or jarred non GMO fruits
  5056: 5030, // Non GMO fresh fruit purees

  // ---- Segment 50 vegetables → canonical Fresh vegetables (5040) ----
  5041: 5040, // Organic fresh vegetables
  5042: 5040, // Dried vegetables
  5043: 5040, // Dried organic vegetables
  5044: 5040, // Frozen vegetables
  5045: 5040, // Frozen organic vegetables
  5046: 5040, // Canned or jarred vegetables
  5047: 5040, // Canned or jarred organic vegetables
  5048: 5040, // Fresh vegetable purees
  5049: 5040, // Organic fresh vegetable purees
  5058: 5040, // Non GMO fresh vegetables
  5059: 5040, // Dried Non GMO vegetables
  5060: 5040, // Frozen Non GMO vegetables
  5061: 5040, // Canned or jarred Non GMO vegetables
  5062: 5040, // Non GMO fresh vegetable purees
  5063: 5040, // Fresh vegetables processed

  // ---- Segment 10 cut flowers → canonical Live plant families ----
  1030: 1020, // Fresh cut rose → Live rose bushes
  1040: 1020, // Dried cut roses → Live rose bushes
  1031: 1021, // Fresh cut high-count → Live high-count
  1041: 1021, // Dried cut high-count
  1032: 1022, // Fresh cut low-count → Live low-count
  1042: 1022, // Dried cut low-count
  1033: 1023, // Fresh cut chrysanthemums → Live chrysanthemums
  1043: 1023, // Dried cut chrysanthemums
  1035: 1024, // Fresh cut carnations → Live carnations
  1044: 1024, // Dried cut carnations
  1036: 1025, // Fresh cut orchids → Live orchids
  1045: 1025, // Dried cut orchids
  // 1034 (Fresh cut floral bouquets), 1050 (Fresh cut greenery) — no live
  // equivalent, keep them as standalone families.
};

function collapseFormModifiers(taxonomy) {
  const byCode = new Map();
  for (const e of taxonomy) byCode.set(e.code, e);
  const kept = [];
  let mergedCount = 0;
  let droppedCount = 0;

  for (const entry of taxonomy) {
    const canonFam = FAMILY_REMAP[entry.family];
    if (canonFam === undefined) {
      kept.push(entry);
      continue;
    }
    // Build the canonical equivalent code: replace the FFFF portion of the
    // 8-digit code with the canonical family's FFFF. UNSPSC codes pack as
    // SSFFCCcc; entry.family is SSFF as a 4-digit number, and the trailing
    // 4 digits (CCcc) are preserved.
    const trailing = entry.code % 10000;
    const canonicalCode = canonFam * 10000 + trailing;
    const target = byCode.get(canonicalCode);
    if (!target) {
      // No canonical equivalent exists in the taxonomy (uncommon — the
      // modifier family has a commodity the fresh family doesn't). Keep
      // the entry as-is rather than orphan it.
      kept.push(entry);
      continue;
    }
    // Merge synonyms and useful name tokens from entry into target.
    target._foldedSyns = target._foldedSyns || new Set(target.synonyms || []);
    for (const w of entry.synonyms || []) target._foldedSyns.add(w.toLowerCase());
    for (const w of tokenizeName(entry.name)) target._foldedSyns.add(w);
    if (entry.code === entry.class * 100) {
      mergedCount++; // class root merged into canonical class root
    } else if (entry.class === 0) {
      mergedCount++; // family root absorbed
    } else {
      droppedCount++; // commodity merged into canonical class root
    }
  }

  // Materialize folded synonyms onto kept entries that received merges.
  for (const e of kept) {
    if (e._foldedSyns) {
      e.synonyms = [...e._foldedSyns].slice(0, 100);
      delete e._foldedSyns;
    }
  }

  return { kept, mergedCount, droppedCount };
}

function resolveMaxLevel(entry) {
  if (DRILLDOWN_CLASSES.has(entry.class)) return "commodity";
  if (COMMUNITY_CLASSES.has(entry.class)) return "commodity";
  if (FAMILY_LEVELS[entry.family]) return FAMILY_LEVELS[entry.family];
  if (SEGMENT_LEVELS[entry.segment]) return SEGMENT_LEVELS[entry.segment];
  return DEFAULT_LEVEL;
}

// ----- Compaction -----

function ancestorCodes(code) {
  return [
    Math.floor(code / 100) * 100,        // class root
    Math.floor(code / 10000) * 10000,    // family root
    Math.floor(code / 1000000) * 1000000, // segment root
  ];
}

function tokenizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

const STOPWORDS = new Set([
  "and", "the", "for", "with", "without", "other", "non", "any", "all",
  "products", "supplies", "equipment", "accessories", "related", "kit",
  "kits", "set", "sets", "system", "systems", "device", "devices", "service",
  "services",
]);

function compact(taxonomy, { foldSynonyms }) {
  const kept = [];
  const dropped = [];

  for (const entry of taxonomy) {
    const lvl = level(entry);
    const max = resolveMaxLevel(entry);
    if (LEVEL_NUM[lvl] <= LEVEL_NUM[max]) {
      // Clone so synonym folding doesn't mutate the source.
      kept.push({ ...entry, synonyms: [...(entry.synonyms || [])] });
    } else {
      dropped.push({ entry, maxKept: max });
    }
  }

  if (foldSynonyms) {
    const keptByCode = new Map(kept.map((e) => [e.code, e]));
    const folded = new Map(); // code -> Set<word>

    for (const { entry } of dropped) {
      // Pick the deepest kept ancestor.
      const target = ancestorCodes(entry.code).find((c) => keptByCode.has(c));
      if (!target) continue;
      let bag = folded.get(target);
      if (!bag) {
        bag = new Set(keptByCode.get(target).synonyms);
        folded.set(target, bag);
      }
      for (const w of entry.synonyms || []) bag.add(w.toLowerCase());
      for (const w of tokenizeName(entry.name)) bag.add(w);
    }

    for (const [code, bag] of folded) {
      const target = keptByCode.get(code);
      // Keep the original synonyms first, then folded ones; cap to avoid
      // bloating each record's vector input. The skill's index quantizes
      // synonym embeddings independently of count, but very long synonym
      // strings hurt the embedding quality.
      const SYN_CAP = 80;
      target.synonyms = [...bag].slice(0, SYN_CAP);
    }
  }

  return { kept, dropped };
}

// ----- Reporting -----

function bytesPretty(n) {
  if (n > 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + " MB";
  if (n > 1024) return (n / 1024).toFixed(1) + " KB";
  return n + " B";
}

function summarize(taxonomy, kept, dropped) {
  const bySegBefore = {};
  const bySegAfter = {};
  const byLevelBefore = { segment: 0, family: 0, class: 0, commodity: 0 };
  const byLevelAfter = { segment: 0, family: 0, class: 0, commodity: 0 };
  for (const e of taxonomy) {
    bySegBefore[e.segment] = (bySegBefore[e.segment] || 0) + 1;
    byLevelBefore[level(e)]++;
  }
  for (const e of kept) {
    bySegAfter[e.segment] = (bySegAfter[e.segment] || 0) + 1;
    byLevelAfter[level(e)]++;
  }
  return { bySegBefore, bySegAfter, byLevelBefore, byLevelAfter };
}

function renderReport(stats, kept, dropped, sizeBefore, sizeAfter, opts) {
  const reduction = (
    ((kept.length - dropped.length === kept.length ? 0 : dropped.length) /
      (kept.length + dropped.length)) *
    100
  ).toFixed(1);
  const lines = [];
  lines.push("# UNSPSC compaction plan");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Fold synonyms: ${opts.foldSynonyms}`);
  lines.push("");
  lines.push("## Totals");
  lines.push(
    `- entries: ${kept.length + dropped.length} → ${kept.length} (-${reduction}%)`
  );
  lines.push(
    `- taxonomy size: ${bytesPretty(sizeBefore)} → ${bytesPretty(sizeAfter)}`
  );
  lines.push("");
  lines.push("## By level");
  lines.push("| level | before | after |");
  lines.push("|---|---|---|");
  for (const k of ["segment", "family", "class", "commodity"]) {
    lines.push(
      `| ${k} | ${stats.byLevelBefore[k]} | ${stats.byLevelAfter[k]} |`
    );
  }
  lines.push("");
  lines.push("## By segment");
  lines.push("| seg | before | after | kept-% |");
  lines.push("|---|---|---|---|");
  const segs = Object.keys(stats.bySegBefore)
    .map(Number)
    .sort((a, b) => a - b);
  for (const s of segs) {
    const b = stats.bySegBefore[s] || 0;
    const a = stats.bySegAfter[s] || 0;
    const pct = b ? ((a / b) * 100).toFixed(1) : "—";
    lines.push(`| ${s} | ${b} | ${a} | ${pct}% |`);
  }
  lines.push("");
  lines.push("## Top 10 segments by absolute reduction");
  const reductions = segs.map((s) => ({
    s,
    delta: (stats.bySegBefore[s] || 0) - (stats.bySegAfter[s] || 0),
  }));
  reductions.sort((a, b) => b.delta - a.delta);
  for (const r of reductions.slice(0, 10)) {
    lines.push(`- seg ${r.s}: -${r.delta} entries`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push(
    "- Drill-down classes (pets, formula, clothing types, etc.) are kept at commodity level."
  );
  lines.push(
    "- Community classes (931515–931531) are kept at commodity level."
  );
  lines.push(
    "- Run `npm run eval` against an index built from the trimmed taxonomy to compare retrieval quality."
  );
  return lines.join("\n") + "\n";
}

// ----- CLI -----

function parseArgs(argv) {
  const opts = { foldSynonyms: true, outDir: "compaction" };
  for (const a of argv) {
    if (a === "--no-fold-synonyms") opts.foldSynonyms = false;
    else if (a === "--fold-synonyms") opts.foldSynonyms = true;
    else if (a.startsWith("--out=")) opts.outDir = a.slice("--out=".length);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const outDir = path.resolve(__dirname, opts.outDir);
await mkdir(outDir, { recursive: true });

console.error(`reading taxonomy: ${TAXONOMY_PATH}`);
const taxonomyRaw = await readFile(TAXONOMY_PATH, "utf8");
const rawTaxonomy = JSON.parse(taxonomyRaw);
const sizeBefore = Buffer.byteLength(taxonomyRaw, "utf8");

// Step 1: collapse form-modifier parallel families (organic/dried/frozen/
// canned/cut-flower variants) onto their canonical equivalents. Runs before
// level-based compaction so the level pass sees a clean taxonomy.
const formCollapse = collapseFormModifiers(rawTaxonomy);
console.error(
  `form-modifier collapse: ${rawTaxonomy.length} → ${formCollapse.kept.length} entries ` +
  `(merged ${formCollapse.mergedCount} parent entries, ${formCollapse.droppedCount} commodities folded)`
);
const taxonomy = formCollapse.kept;

console.error(`compacting ${taxonomy.length} entries (foldSynonyms=${opts.foldSynonyms})...`);
const { kept, dropped } = compact(taxonomy, opts);

const trimmedJson = JSON.stringify(kept, null, 2);
const sizeAfter = Buffer.byteLength(trimmedJson, "utf8");

const keptCodeSet = new Set(kept.map((e) => e.code));
const droppedDigest = dropped.map(({ entry, maxKept }) => ({
  code: entry.code,
  name: entry.name,
  segment: entry.segment,
  family: entry.family,
  class: entry.class,
  level: level(entry),
  maxKept,
  foldedInto:
    ancestorCodes(entry.code).find((c) => keptCodeSet.has(c)) || null,
}));

const stats = summarize(rawTaxonomy, kept, dropped);
const report = renderReport(stats, kept, dropped, sizeBefore, sizeAfter, opts);

await writeFile(path.join(outDir, "trimmed-taxonomy.json"), trimmedJson, "utf8");
await writeFile(
  path.join(outDir, "dropped-codes.json"),
  JSON.stringify(droppedDigest, null, 2),
  "utf8"
);
await writeFile(path.join(outDir, "report.md"), report, "utf8");

console.error("");
console.error(report);
console.error(`wrote ${outDir}/{trimmed-taxonomy.json,dropped-codes.json,report.md}`);

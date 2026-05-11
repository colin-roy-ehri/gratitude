// One-off fixture generator. Samples 150 stratified + 50 community-focused
// UNSPSC codes from the taxonomy and asks Claude to write a realistic
// "<category> — <precise description>" query for each. Output is committed
// JSON that runEval.mjs reads.
//
// Requires ANTHROPIC_API_KEY in env.
//
// Usage:
//   node generateFixtures.mjs                 # writes fixtures/queries.json
//   node generateFixtures.mjs --resample      # also rewrites sampled-codes.json

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
// Source the fixtures from the *trimmed* taxonomy that the index is actually
// built from, so the eval only tests codes the skill can possibly return.
// Earlier versions sampled from the full UNSPSC taxonomy and produced fixtures
// for codes that compaction had folded away — those were unavoidable misses
// that artificially deflated the broad-bucket score.
//
// Override with --source <path> to sample from a different taxonomy (e.g.
// the original full file at Android/.../assets/unspsc-taxonomy.json).
const DEFAULT_TAXONOMY_PATH = path.join(
  __dirname,
  "compaction",
  "trimmed-taxonomy.json"
);
const SAMPLED_PATH = path.join(__dirname, "fixtures", "sampled-codes.json");
const QUERIES_PATH = path.join(__dirname, "fixtures", "queries.json");

function resolveTaxonomyPath(args) {
  const i = args.indexOf("--source");
  return i >= 0 && args[i + 1]
    ? path.resolve(process.cwd(), args[i + 1])
    : DEFAULT_TAXONOMY_PATH;
}

const SEED = 0x5ee5_d00d;
const BROAD_N = 150;
const COMMUNITY_N = 50;

// Composition of the 150 broad picks. Most of UNSPSC is too granular for a
// peer-help app — people offer "tools" or "kitchen stuff", not specific
// commodity codes. Default to class/family/segment roots, with a curated
// drill-down for areas where the leaf distinction *does* matter (Cats vs
// Dogs, formula vs cereal, etc.).
const BROAD_DRILLDOWN_N = 50;   // commodity-level picks from DRILLDOWN_CLASSES
const BROAD_CLASS_N = 75;       // class roots (XXXXXX00)
const BROAD_FAMILY_N = 20;      // family roots (XXXX0000)
const BROAD_SEGMENT_N = 5;      // segment roots (XX000000)

// 50 UNSPSC class codes (6-digit) where commodity-level granularity is
// meaningful for neighbor-to-neighbor mutual aid. Curated for the case where a
// neighbor is offering or requesting a specific tangible thing or service in
// a time of need — the within-class distinction matters (a household in need
// of formula isn't helped by a stranger offering "infant nutrition products"
// generically; "Cats" and "Dogs" are different offers).
//
// Extend this list as the app's real-world usage surfaces other classes where
// users genuinely think at the commodity level.
const DRILLDOWN_CLASSES = [
  // Pets & their care — species-level distinctions matter
  101015, // Livestock (Cats, Dogs, Horses, Sheep, Goats…)
  101016, // Birds and fowl
  101017, // Live fish
  101113, // Domestic pet treatments and accessories
  101218, // Dog and cat food

  // Home growing & garden — what someone has seeds/cuttings of matters
  101515, // Vegetable seeds and seedlings
  101519, // Flower seeds and bulbs and seedlings and cuttings
  101616, // Floral plants

  // Food staples — diet, allergy, age (formula!) distinctions matter
  501316, // Eggs and egg substitutes
  501317, // Milk and butter products
  501318, // Cheese
  501715, // Herbs and spices and extracts
  501718, // Sauces and spreads and condiments
  501819, // Bread and biscuits and cookies
  501921, // Snack foods
  501929, // Plain pasta and noodles
  501930, // Infant foods and beverages
  502017, // Coffee and tea

  // Clothing — type, size, season distinctions matter
  531015, // Slacks and trousers and shorts
  531016, // Shirts and blouses
  531017, // Sweaters
  531018, // Coats and jackets
  531023, // Undergarments
  531026, // Nightwear
  531030, // Tshirts
  531115, // Boots
  531116, // Shoes
  531119, // Athletic footwear
  531216, // Purses and handbags and bags

  // Personal care
  531316, // Bath and body

  // Health, disability, recovery — specific device/aid matters a lot
  421429, // Vision correction or cosmetic eyewear (glasses/contacts)
  421440, // External hearing device parts and accessories
  422318, // Formulas and products for nutritional support
  422420, // Prosthetic devices or accessories and supplies
  422516, // Rehabilitation exercise devices and equipment
  423115, // Bandages and dressings and related products

  // Household / cleaning — specific implement matters
  471218, // Cleaning equipment
  471315, // Cleaning rags and cloths and wipes
  471316, // Brooms and mops and brushes and accessories
  471318, // Cleaning and disinfecting solutions

  // Kitchen
  481015, // Cooking and warming equipment
  481018, // Cookware and kitchen tools
  481019, // Tabletop and serving equipment

  // Recreation, sports, outdoor
  491215, // Camping and outdoor equipment
  491815, // Table games and equipment

  // Education, kids, creative
  601023, // Reading books and resources
  601215, // Drawing tools and supplies and accessories
  601316, // Musical instrument sets
  601410, // Toys
  601411, // Games
];

// Mirrors the skill's CURATED_CLASSES (scripts/index.html). Used to override
// the raw UNSPSC taxonomy names for community codes so Claude paraphrases the
// curated peer-support meaning, not the bureaucratic UNSPSC name that lives
// at the same number.
const CURATED_CLASS_NAMES = {
  931515: "Peer Emotional & Social Support",
  931516: "Peer Care & Daily Living Support",
  931517: "Childcare & Youth Support",
  931518: "Transportation & Accompaniment",
  931519: "Legal & Bureaucratic Navigation",
  931520: "Health Navigation & Support",
  931521: "Home & Repair Support",
  931522: "Food & Meal Support",
  931523: "Skills & Knowledge Sharing",
  931524: "Safety & Protection",
  931525: "Harm Reduction Services",
  931526: "Street Medicine & Outreach",
  931527: "Criminalized Communities Support",
  931528: "Reproductive Justice",
  931529: "Disability Justice",
  931530: "Community Gathering & Social Spaces",
  931531: "Connection & Anti-Isolation",
};
const COMMUNITY_CLASSES = Object.keys(CURATED_CLASS_NAMES).map(Number);

// mulberry32 — small deterministic PRNG.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// UNSPSC level helpers. Codes pack as SSFFCCCC.
function level(entry) {
  if (entry.family === 0 && entry.class === 0) return "segment";
  if (entry.class === 0) return "family";
  if (entry.code % 100 === 0) return "class";
  return "commodity";
}

function pickWithoutReplacement(pool, n, rng) {
  const local = pool.slice();
  const out = [];
  while (out.length < n && local.length) {
    const idx = Math.floor(rng() * local.length);
    out.push(local.splice(idx, 1)[0]);
  }
  return out;
}

// Stratified by segment with sqrt-weighted allocation. Pure proportional
// allocation lets giant segments (e.g. segment 10's per-flower-variety class
// roots) dominate; sqrt damps that without flattening to uniform.
function sampleStratifiedBySegment(entries, n, rng) {
  const bySeg = new Map();
  for (const e of entries) {
    if (!bySeg.has(e.segment)) bySeg.set(e.segment, []);
    bySeg.get(e.segment).push(e);
  }
  const segs = [...bySeg.entries()].sort((a, b) => a[0] - b[0]);
  const weights = segs.map(([, list]) => Math.sqrt(list.length));
  const totalW = weights.reduce((s, w) => s + w, 0);
  const picks = [];
  segs.forEach(([, list], i) => {
    const k = Math.floor((weights[i] / totalW) * n);
    picks.push(...pickWithoutReplacement(list, k, rng));
  });
  const leftovers = segs.flatMap(([, list]) =>
    list.filter((e) => !picks.includes(e))
  );
  picks.push(...pickWithoutReplacement(leftovers, n - picks.length, rng));
  return picks.slice(0, n);
}

// Drill-down: spread evenly across the curated DRILLDOWN_CLASSES, drawing
// commodities (XXXXXXxx where xx != 00) from each.
function sampleDrilldown(taxonomy, n, rng) {
  const targetSet = new Set(DRILLDOWN_CLASSES);
  const byClass = new Map();
  for (const e of taxonomy) {
    if (!targetSet.has(e.class)) continue;
    if (e.code % 100 === 0) continue; // skip the class root itself
    if (!byClass.has(e.class)) byClass.set(e.class, []);
    byClass.get(e.class).push(e);
  }
  const classList = [...byClass.keys()];
  if (classList.length === 0) return [];
  const perClass = Math.max(1, Math.floor(n / classList.length));
  const picks = [];
  for (const cls of classList) {
    picks.push(...pickWithoutReplacement(byClass.get(cls), perClass, rng));
  }
  // Top up to exactly n by sampling from the full remaining commodity pool
  // across all drill-down classes.
  const remaining = [...byClass.values()]
    .flat()
    .filter((e) => !picks.includes(e));
  picks.push(...pickWithoutReplacement(remaining, n - picks.length, rng));
  return picks.slice(0, n);
}

function sampleCommunity(taxonomy, n, rng) {
  const targetSet = new Set(COMMUNITY_CLASSES);
  // Curated peer-support classes are the ones the production skills surface
  // (community-offer / community-need restrict their UNSPSC space to these).
  // Spread `n` evenly across the curated classes — we don't want the entire
  // sample landing in one class. Earlier versions also drew from non-curated
  // segment-93 classes as a fallback, but those code paths aren't reachable
  // in production and just produce noise in the eval.
  const byClass = new Map();
  for (const e of taxonomy) {
    if (!targetSet.has(e.class)) continue;
    if (e.code % 100 === 0) continue; // skip class root itself
    if (!byClass.has(e.class)) byClass.set(e.class, []);
    byClass.get(e.class).push(e);
  }
  const classList = [...byClass.keys()];
  if (classList.length === 0) return [];
  const perClass = Math.max(1, Math.floor(n / classList.length));
  const picks = [];
  for (const cls of classList) {
    picks.push(
      ...pickWithoutReplacement(byClass.get(cls), perClass, rng)
    );
  }
  // Top up evenly from the remaining commodities across all curated classes.
  const remaining = [...byClass.values()]
    .flat()
    .filter((e) => !picks.includes(e));
  picks.push(...pickWithoutReplacement(remaining, n - picks.length, rng));
  return picks.slice(0, n);
}

async function loadOrSampleCodes(args) {
  if (!args.includes("--resample")) {
    try {
      const raw = await readFile(SAMPLED_PATH, "utf8");
      const parsed = JSON.parse(raw);
      console.error(`reusing ${SAMPLED_PATH} (${parsed.length} codes)`);
      return parsed;
    } catch {
      // fallthrough to resample
    }
  }
  const taxonomyPath = resolveTaxonomyPath(args);
  console.error(`sampling from: ${taxonomyPath}`);
  const taxonomy = JSON.parse(await readFile(taxonomyPath, "utf8"));
  const rng = makeRng(SEED);

  const drilldownTargets = new Set(DRILLDOWN_CLASSES);
  const classRoots = taxonomy.filter(
    (e) => level(e) === "class" && !drilldownTargets.has(e.class)
  );
  const familyRoots = taxonomy.filter((e) => level(e) === "family");
  const segmentRoots = taxonomy.filter((e) => level(e) === "segment");

  const drilldown = sampleDrilldown(taxonomy, BROAD_DRILLDOWN_N, rng).map(
    (e) => ({ ...e, sample: "drilldown" })
  );
  const classes = sampleStratifiedBySegment(classRoots, BROAD_CLASS_N, rng).map(
    (e) => ({ ...e, sample: "class" })
  );
  const families = sampleStratifiedBySegment(
    familyRoots,
    BROAD_FAMILY_N,
    rng
  ).map((e) => ({ ...e, sample: "family" }));
  const segments = sampleStratifiedBySegment(
    segmentRoots,
    BROAD_SEGMENT_N,
    rng
  ).map((e) => ({ ...e, sample: "segment" }));

  const broad = [...drilldown, ...classes, ...families, ...segments].map((e) => ({
    ...e,
    bucket: "broad",
  }));

  const broadCodes = new Set(broad.map((e) => e.code));
  const communityPool = taxonomy.filter((e) => !broadCodes.has(e.code));
  const community = sampleCommunity(communityPool, COMMUNITY_N, rng).map(
    (e) => {
      const curated = CURATED_CLASS_NAMES[e.class];
      return {
        ...e,
        // Override the raw UNSPSC name with the skill's curated peer-support
        // label so Claude paraphrases the meaning the skill actually returns.
        // Keep the raw name as `unspscName` for diagnostics.
        unspscName: e.name,
        name: curated ? `${curated} — specific service` : e.name,
        curatedClass: curated || null,
        sample: "commodity",
        bucket: "community",
      };
    }
  );

  const all = [...broad, ...community];
  await writeFile(SAMPLED_PATH, JSON.stringify(all, null, 2), "utf8");
  const counts = all.reduce((acc, e) => {
    const k = `${e.bucket}/${e.sample}`;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  console.error(
    `wrote ${all.length} sampled codes -> ${SAMPLED_PATH}\n  ${JSON.stringify(counts)}`
  );
  return all;
}

const SYSTEM_PROMPT = `You write realistic search queries that a neighbor might type into a community mutual-aid app when offering or requesting a tangible thing or service. The user does not know UNSPSC codes — they describe things in plain language.

You will be given one UNSPSC taxonomy entry plus its level. Produce ONE query string in the form:

  "<short category> — <precise description matching the level's specificity>"

Match the description's specificity to the entry's level:
- commodity (8-digit, e.g. "Cats", "Strawberries"): one concrete instance with 1–2 attributes that describe *what the thing is* (breed, color, condition, age, size, material, dietary detail).
- class (6-digit, e.g. "Sweaters", "Cookware and kitchen tools"): one concrete representative item from the class, still neighborly. Don't drill below the class — for "Sweaters" don't pick "Aran cable knit Irish wool sweater"; pick "wool sweater, women's medium".
- family (4-digit, e.g. "Bread and bakery products"): the description should be a general bucket, not a specific item. Phrasing like "assorted bakery items", "various bread and pastries".
- segment (2-digit, e.g. "Live Plant and Animal Material..."): very general — "live plants and animal supplies", broad and inclusive.

Other rules:
- The category is short and natural ("Office supplies", "Kitchen", "Childcare", "Tools", "Medical", "Pets", "Transportation", "Food", "Legal help", "Healthcare", "Home repair"). It should NOT echo the bureaucratic segment name.
- For peer-mutual-aid entries (curated community classes whose names you receive as "Peer ... — specific service"): pick the most topic-specific natural English category that captures the *concrete* concept, not the meta-label "Peer support". Example: if the entry is "Peer Care & Daily Living Support", use category "Daily living help" or "Caregiver support" — NOT "Peer support". If "Childcare & Youth Support", use "Childcare". If "Food & Meal Support", use "Food" or "Meals". If "Transportation & Accompaniment", use "Transportation" or "Rides". This mirrors how a calling LLM actually categorizes natural user language in production.
- Do NOT include time-based or logistical detail. UNSPSC encodes *what* something is, not *when, how often, or how it's delivered*. Drop frequency ("twice a week", "daily"), scheduling ("evenings", "weekends"), urgency ("urgent"), and delivery logistics ("dropped off", "pickup", "delivery").
- Do NOT mention UNSPSC or codes.
- Do NOT echo the canonical name verbatim — paraphrase.
- Keep it under ~120 characters.
- Output ONLY the query string. No quotes, no labels, no commentary.`;

async function paraphraseAll(codes) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required to generate fixtures");
  }
  const client = new Anthropic({ apiKey });
  const results = [];
  const concurrency = 8;
  let i = 0;
  let done = 0;

  async function worker() {
    while (i < codes.length) {
      const myIdx = i++;
      const entry = codes[myIdx];
      const lvl = level(entry);
      const userMsg =
        `level: ${lvl}\n` +
        `canonical name: ${entry.name}\n` +
        `segment: ${entry.segment} (${entry.context || ""})\n` +
        `family: ${entry.family}\n` +
        `class: ${entry.class}\n` +
        `code: ${entry.code}`;
      try {
        const resp = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 200,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userMsg }],
        });
        const text = resp.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim()
          .replace(/^["']|["']$/g, "");
        results[myIdx] = {
          code: entry.code,
          expectedName: entry.name,
          segment: entry.segment,
          family: entry.family,
          class: entry.class,
          bucket: entry.bucket,
          sample: entry.sample,
          query: text,
        };
      } catch (err) {
        console.error(`  ! ${entry.code} ${entry.name}: ${err.message}`);
        results[myIdx] = {
          code: entry.code,
          expectedName: entry.name,
          segment: entry.segment,
          family: entry.family,
          class: entry.class,
          bucket: entry.bucket,
          sample: entry.sample,
          query: null,
          error: err.message,
        };
      }
      done++;
      if (done % 10 === 0) {
        console.error(`  ${done}/${codes.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

const args = process.argv.slice(2);
const codes = await loadOrSampleCodes(args);
console.error(`generating queries for ${codes.length} codes...`);
const queries = await paraphraseAll(codes);
await writeFile(QUERIES_PATH, JSON.stringify(queries, null, 2), "utf8");
const failed = queries.filter((q) => !q.query).length;
console.error(`wrote ${queries.length} queries (${failed} failed) -> ${QUERIES_PATH}`);

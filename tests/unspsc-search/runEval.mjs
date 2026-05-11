// Runs the fixture queries through the unspsc-search skill and scores results
// with a tiered weighted rubric:
//   100 — top-1 shares 6-digit class with expected (covers exact match,
//          sibling commodity in the same class, and the class root itself)
//    75 — top-1 shares 4-digit family with expected (right general bucket,
//          wrong specific class — usually indistinguishable to the user
//          because the wrappers surface the family-level category name)
//    50 — expected code appears anywhere in top-5 but top-1 isn't even in
//          the right family
//     0 — otherwise
// (Tiers are not additive; each row gets the highest applicable score.)
// Tier labels in the report still split top1_exact / top1_class / top1_family
// so you can see how often the skill nails the leaf vs. lands a sibling.
//
// Outputs:
//   reports/<timestamp>.json  full per-row results
//   reports/<timestamp>.md    short aggregate summary
//   reports/latest.json       symlink-ish copy of the latest run

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { search, ready } from "./runHarness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUERIES_PATH = path.join(__dirname, "fixtures", "queries.json");
const REPORTS_DIR = path.join(__dirname, "reports");

function score(expectedCode, results) {
  if (!Array.isArray(results) || results.length === 0) {
    return { tier: "miss", points: 0 };
  }
  if (results[0].unspscCode === expectedCode) {
    return { tier: "top1_exact", points: 100 };
  }
  const expectedClass = Math.floor(expectedCode / 100);
  const top1Class = Math.floor(results[0].unspscCode / 100);
  if (top1Class === expectedClass) {
    return { tier: "top1_class", points: 100 };
  }
  const expectedFamily = Math.floor(expectedCode / 10000);
  const top1Family = Math.floor(results[0].unspscCode / 10000);
  if (top1Family === expectedFamily) {
    return { tier: "top1_family", points: 75 };
  }
  if (results.slice(0, 5).some((r) => r.unspscCode === expectedCode)) {
    return { tier: "top5_exact", points: 50 };
  }
  return { tier: "miss", points: 0 };
}

function aggregate(rows) {
  const tally = (subset) => {
    if (subset.length === 0) return { n: 0, mean: 0, tiers: {} };
    const tiers = {};
    let sum = 0;
    for (const r of subset) {
      tiers[r.tier] = (tiers[r.tier] || 0) + 1;
      sum += r.points;
    }
    return { n: subset.length, mean: +(sum / subset.length).toFixed(2), tiers };
  };
  const bySegment = {};
  for (const r of rows) {
    bySegment[r.segment] = bySegment[r.segment] || [];
    bySegment[r.segment].push(r);
  }
  return {
    overall: tally(rows),
    broad: tally(rows.filter((r) => r.bucket === "broad")),
    community: tally(rows.filter((r) => r.bucket === "community")),
    bySegment: Object.fromEntries(
      Object.entries(bySegment).map(([seg, list]) => [seg, tally(list)])
    ),
  };
}

function renderMarkdown(agg, rows, timestamp) {
  const misses = rows.filter((r) => r.tier === "miss").slice(0, 30);
  const lines = [];
  lines.push(`# UNSPSC eval — ${timestamp}`);
  lines.push("");
  lines.push(`**Overall:** mean ${agg.overall.mean} (n=${agg.overall.n}) — ${JSON.stringify(agg.overall.tiers)}`);
  lines.push(`**Broad:** mean ${agg.broad.mean} (n=${agg.broad.n}) — ${JSON.stringify(agg.broad.tiers)}`);
  lines.push(`**Community:** mean ${agg.community.mean} (n=${agg.community.n}) — ${JSON.stringify(agg.community.tiers)}`);
  lines.push("");
  lines.push("## By segment");
  for (const [seg, t] of Object.entries(agg.bySegment).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    lines.push(`- seg ${seg}: mean ${t.mean} (n=${t.n}) ${JSON.stringify(t.tiers)}`);
  }
  lines.push("");
  lines.push(`## Misses (top ${misses.length})`);
  for (const r of misses) {
    const top5 = r.top5.map((x) => `${x.unspscCode}(${x.score})`).join(", ");
    lines.push(`- **${r.code}** "${r.expectedName}"\n  query: ${JSON.stringify(r.query)}\n  top5: ${top5}`);
  }
  return lines.join("\n") + "\n";
}

const queries = JSON.parse(await readFile(QUERIES_PATH, "utf8"));
const runnable = queries.filter((q) => q.query);
console.error(`loaded ${runnable.length}/${queries.length} runnable queries`);
console.error("warming up skill (loads model + index)...");
await ready();

const rows = [];
let i = 0;
for (const q of runnable) {
  i++;
  const result = await search(q.query, { limit: 5 });
  const top5 = (result.results || []).slice(0, 5);
  const sc = score(q.code, top5);
  rows.push({
    code: q.code,
    expectedName: q.expectedName,
    segment: q.segment,
    bucket: q.bucket,
    query: q.query,
    top5,
    tier: sc.tier,
    points: sc.points,
  });
  if (i % 20 === 0 || i === runnable.length) {
    const meanSoFar = (rows.reduce((s, r) => s + r.points, 0) / rows.length).toFixed(2);
    console.error(`  ${i}/${runnable.length}  mean=${meanSoFar}`);
  }
}

const agg = aggregate(rows);
await mkdir(REPORTS_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonPath = path.join(REPORTS_DIR, `${stamp}.json`);
const mdPath = path.join(REPORTS_DIR, `${stamp}.md`);
const latestPath = path.join(REPORTS_DIR, "latest.json");
const payload = { timestamp: stamp, aggregate: agg, rows };
await writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");
await writeFile(mdPath, renderMarkdown(agg, rows, stamp), "utf8");
await writeFile(latestPath, JSON.stringify(payload, null, 2), "utf8");

console.log("");
console.log(`Overall mean: ${agg.overall.mean} (n=${agg.overall.n})`);
console.log(`  broad:     ${agg.broad.mean} (n=${agg.broad.n})  ${JSON.stringify(agg.broad.tiers)}`);
console.log(`  community: ${agg.community.mean} (n=${agg.community.n})  ${JSON.stringify(agg.community.tiers)}`);
console.log(`Reports: ${jsonPath}`);
console.log(`         ${mdPath}`);

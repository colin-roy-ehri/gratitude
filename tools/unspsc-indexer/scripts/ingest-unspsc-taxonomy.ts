/**
 * Ingest UNSPSC taxonomy from CSV files and prepare for vector search indexing.
 *
 * This script reads the complete UNSPSC hierarchy from CSV files and:
 * 1. Builds a combined taxonomy with hierarchical relationships
 * 2. Filters/prioritizes codes based on mutual aid relevance
 * 3. Generates synonym and context metadata
 * 4. Produces a JSON file ready for the build-unspsc-index script
 *
 * Usage:
 *   npm run ingest:unspsc
 *   npm run ingest:unspsc -- --all          # Include all codes (not just mutual aid)
 *   npm run ingest:unspsc -- --output data/unspsc-full.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CodeRecord {
  code: number;
  name: string;
  segment: number;
  family: number;
  class: number;
  commodity?: string;
  type: 'segment' | 'family' | 'class' | 'commodity';
}

interface HierarchyNode {
  code: number;
  name: string;
  level: 'segment' | 'family' | 'class' | 'commodity';
  children: HierarchyNode[];
}

// UNSPSC segments relevant to mutual aid
const MUTUAL_AID_SEGMENTS = new Set([
  10, // Live animals and animal products
  25, // Transportation equipment and supplies
  31, // Tools, dies, molds, and fixtures
  39, // Electrical, lighting and signaling equipment and supplies
  42, // Medical and surgical supplies and devices
  43, // Information technology equipment and supplies
  45, // Music and musical instruments and supplies
  46, // Climate control equipment and supplies
  47, // Art, craft and hobby supplies and equipment
  48, // Toys and games and wheeled goods and dolls and accessories
  49, // Baby products
  50, // Food, beverages, and tobacco
  53, // Clothing, eyewear, footwear, and accessories
  55, // Books and media
  60, // Printing, photographic, audio, visual and broadcasting equipment and supplies
  72, // Household and personal hygiene supplies
  93, // Services (business and professional)
]);

// Mutual aid friendly classes (these get higher priority)
const PEER_MUTUAL_AID_CLASSES = new Set([
  931515, // Peer Emotional & Social Support
  931516, // Peer Care & Daily Living Support
  931517, // Childcare & Youth Support
  931518, // Transportation & Accompaniment
  931519, // Legal & Bureaucratic Navigation
  931520, // Health Navigation & Support
  931521, // Home & Repair Support
  931522, // Food & Meal Support
  931523, // Skills & Knowledge Sharing
  931524, // Safety & Protection
  931525, // Harm Reduction Services
  931526, // Street Medicine & Outreach
  931527, // Criminalized Communities Support
  931528, // Reproductive Justice
  931529, // Disability Justice
  931530, // Community Gathering & Social Spaces
  931531, // Connection & Anti-Isolation
]);

/**
 * Parse a CSV file and return records as array of objects
 */
async function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const records: Record<string, string>[] = [];
    let headers: string[] = [];
    let isFirstLine = true;

    const rl = createInterface({
      input: createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    rl.on('line', line => {
      // Remove BOM if present
      const cleanLine = line.replace(/^﻿/, '');

      if (isFirstLine) {
        headers = cleanLine.split(',').map(h => h.trim());
        isFirstLine = false;
      } else if (cleanLine.trim()) {
        const values = cleanLine.split(',').map(v => v.trim());
        const record: Record<string, string> = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx] || '';
        });
        records.push(record);
      }
    });

    rl.on('close', () => resolve(records));
    rl.on('error', reject);
  });
}

/**
 * Load all UNSPSC CSVs and build a combined code map
 */
async function loadTaxonomy(): Promise<Map<number, CodeRecord>> {
  console.log('Loading UNSPSC taxonomy from CSV files...\n');

  const constDir = path.join(__dirname, '../src/constants');
  const codes = new Map<number, CodeRecord>();

  // Load segments (2 digits)
  console.log('Loading segments...');
  const segments = await parseCSV(path.join(constDir, 'unspsc-segment.csv'));
  for (const row of segments) {
    const code = parseInt(row.SEGMENT, 10);
    if (code) {
      codes.set(code, {
        code,
        name: row.Description || `Segment ${code}`,
        segment: Math.floor(code / 1000000),
        family: 0,
        class: 0,
        type: 'segment',
      });
    }
  }
  console.log(`  ✓ Loaded ${segments.length} segments\n`);

  // Load families (4 digits)
  console.log('Loading families...');
  const families = await parseCSV(path.join(constDir, 'unspsc-family.csv'));
  for (const row of families) {
    const code = parseInt(row.FAMILY, 10);
    if (code) {
      const segment = Math.floor(code / 1000000);
      codes.set(code, {
        code,
        name: row.Description || `Family ${code}`,
        segment,
        family: Math.floor(code / 10000),
        class: 0,
        type: 'family',
      });
    }
  }
  console.log(`  ✓ Loaded ${families.length} families\n`);

  // Load classes (6 digits)
  console.log('Loading classes...');
  const classes = await parseCSV(path.join(constDir, 'unspsc-class.csv'));
  for (const row of classes) {
    const code = parseInt(row.CLASS, 10);
    if (code) {
      const segment = Math.floor(code / 1000000);
      codes.set(code, {
        code,
        name: row.Description || `Class ${code}`,
        segment,
        family: Math.floor(code / 10000),
        class: Math.floor(code / 100),
        type: 'class',
      });
    }
  }
  console.log(`  ✓ Loaded ${classes.length} classes\n`);

  // Load commodities (8 digits)
  console.log('Loading commodities...');
  const commodities = await parseCSV(path.join(constDir, 'unspsc-commodity.csv'));
  for (const row of commodities) {
    const code = parseInt(row.COMMODITY, 10);
    if (code) {
      const segment = Math.floor(code / 1000000);
      codes.set(code, {
        code,
        name: row.Description || `Commodity ${code}`,
        segment,
        family: Math.floor(code / 10000),
        class: Math.floor(code / 100),
        commodity: code.toString().slice(6),
        type: 'commodity',
      });
    }
  }
  console.log(`  ✓ Loaded ${commodities.length} commodities\n`);

  return codes;
}

/**
 * Filter codes for mutual aid relevance (can be disabled with --all flag)
 */
function filterForMutualAid(codes: Map<number, CodeRecord>): Map<number, CodeRecord> {
  const filtered = new Map<number, CodeRecord>();

  for (const [code, record] of codes) {
    const isMutualAidClass = PEER_MUTUAL_AID_CLASSES.has(record.class);
    const isMutualAidSegment = MUTUAL_AID_SEGMENTS.has(record.segment);

    if (isMutualAidClass || isMutualAidSegment) {
      filtered.set(code, record);
    }
  }

  return filtered;
}

/**
 * Generate synonyms and context for a code based on its name
 * This is a simple heuristic; can be enhanced with domain expertise
 */
function generateMetadata(code: CodeRecord): { synonyms: string[]; context: string } {
  const name = code.name.toLowerCase();
  const synonyms: string[] = [];
  const contextTerms: string[] = [];

  // Extract potential synonyms from the name
  const parts = name.split(/[\s,;/-]+/).filter(p => p.length > 2);
  synonyms.push(...parts.slice(0, 5)); // First 5 meaningful parts

  // Add domain context based on segment
  const segment = code.segment;
  if (segment === 50) {
    contextTerms.push('food', 'meal', 'beverage', 'nutrition', 'groceries');
  } else if (segment === 42 || segment === 72) {
    contextTerms.push('medical', 'health', 'supplies', 'care', 'hygiene');
  } else if (segment === 53) {
    contextTerms.push('clothing', 'apparel', 'fashion', 'shoes', 'wear');
  } else if (segment === 49) {
    contextTerms.push('baby', 'infant', 'child', 'newborn', 'diapers');
  } else if (segment === 93) {
    contextTerms.push('service', 'support', 'help', 'assistance', 'care');
  }

  // Always add the segment/family context
  contextTerms.push(`segment ${code.segment}`);
  contextTerms.push(`family ${Math.floor(code.family / 100)}`);

  return {
    synonyms: [...new Set(synonyms)], // Deduplicate
    context: contextTerms.join(' '),
  };
}

/**
 * Convert codes to the format expected by build-unspsc-index.ts
 */
function formatForIndexing(
  codes: Map<number, CodeRecord>
): Array<{
  code: number;
  name: string;
  segment: number;
  family: number;
  class: number;
  synonyms: string[];
  context: string;
}> {
  const formatted: Array<{
    code: number;
    name: string;
    segment: number;
    family: number;
    class: number;
    synonyms: string[];
    context: string;
  }> = [];

  for (const [, record] of codes) {
    const meta = generateMetadata(record);
    formatted.push({
      code: record.code,
      name: record.name,
      segment: record.segment,
      family: record.family,
      class: record.class,
      synonyms: meta.synonyms,
      context: meta.context,
    });
  }

  // Sort by code for consistent ordering
  return formatted.sort((a, b) => a.code - b.code);
}

/**
 * Main ingestion process
 */
async function main() {
  const args = process.argv.slice(2);
  const includeAll = args.includes('--all');
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : 'data/unspsc-taxonomy.json';

  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  UNSPSC Taxonomy Ingestion & Preparation for Indexing  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Load taxonomy
    const allCodes = await loadTaxonomy();
    console.log(`Total codes loaded: ${allCodes.size}\n`);

    // Filter or keep all
    let codes = allCodes;
    if (!includeAll) {
      console.log('Filtering for mutual aid relevance...');
      codes = filterForMutualAid(allCodes);
      console.log(`Filtered to ${codes.size} mutual-aid-relevant codes\n`);
    }

    // Format for indexing
    console.log('Generating metadata (synonyms, context)...');
    const formatted = formatForIndexing(codes);
    console.log(`Formatted ${formatted.length} codes\n`);

    // Write output
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(formatted, null, 2));
    console.log(`✓ Written to: ${outputPath}`);
    console.log(`  File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB\n`);

    // Statistics
    const segments = new Set(formatted.map(c => c.segment));
    const families = new Set(formatted.map(c => c.family));
    const classes = new Set(formatted.map(c => c.class));

    console.log('Taxonomy Statistics:');
    console.log(`  Segments: ${segments.size}`);
    console.log(`  Families: ${families.size}`);
    console.log(`  Classes: ${classes.size}`);
    console.log(`  Commodities: ${formatted.length}`);
    console.log();

    console.log('Next step: Build the vector search index');
    console.log(`  npm run build:index -- --source ${outputPath}`);
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

main();

import * as fs from 'fs';

/**
 * Extract only the UNSPSC codes that are in the binary index
 * This reduces the 16MB taxonomy to a much smaller lookup table
 */

// For now, create a minimal version
// In production, parse the binary index to get actual codes

const taxonomy = JSON.parse(fs.readFileSync('data/unspsc-taxonomy.json', 'utf-8'));

// Sample: keep only top 1000 most relevant codes (agriculture, household, services)
// In real usage, would parse the binary index to get exact codes
const topSegments = [10, 25, 31, 39, 42, 43, 45, 46, 47, 48, 49, 50, 53, 55, 60, 72, 93];
const filtered = taxonomy.filter((e: any) => topSegments.includes(e.segment)).slice(0, 3000);

console.log(`Extracted ${filtered.length} codes from ${taxonomy.length} total`);
fs.writeFileSync('public/data/unspsc-codes-indexed.json', JSON.stringify(filtered, null, 2));
console.log('Saved to public/data/unspsc-codes-indexed.json');

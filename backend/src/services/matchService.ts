import { MatchCandidate, MessageDocument } from '../types.js';

export class MatchService {
  findMatches(myMessages: MessageDocument[], globalMessages: MessageDocument[]): MatchCandidate[] {
    const mine = myMessages.filter((m) => m.messageType === 'anonymized');
    const global = globalMessages.filter((m) => m.messageType === 'anonymized');

    const matches: MatchCandidate[] = [];

    for (const a of mine) {
      for (const b of global) {
        if (a.id === b.id) continue;
        if (a.publicKey === b.publicKey) continue;

        const score = this.computeScore(a, b);
        if (score < 0.4) continue;

        matches.push({
          leftMessageId: a.id,
          rightMessageId: b.id,
          leftUnspscCode: a.searchable.unspscCode,
          rightUnspscCode: b.searchable.unspscCode,
          score,
          reason: this.reason(a, b, score),
        });
      }
    }

    return matches
      .sort((x, y) => y.score - x.score)
      .slice(0, 50);
  }

  private computeScore(a: MessageDocument, b: MessageDocument): number {
    let score = 0;

    const unspscBonus = this.computeUnspscBonus(a, b);
    score += unspscBonus.bonus;

    if (hasDateOverlap(a, b)) {
      score += 0.2;
    }

    const distanceBonus = locationBonusKm(a, b);
    score += distanceBonus;

    return Math.min(1, score);
  }

  private computeUnspscBonus(a: MessageDocument, b: MessageDocument): { bonus: number; reason: string | null } {
    const codeA = a.searchable.unspscCode;
    const codeB = b.searchable.unspscCode;

    if (!codeA || !codeB) {
      return { bonus: 0, reason: null };
    }

    if (codeA === codeB) {
      return { bonus: 0.6, reason: `exact UNSPSC match on ${codeA}` };
    }

    // Determine the "genericity" level of each code by checking trailing zeroes.
    // We treat 8-digit codes as the most specific, 6-digit (ending in 00) as family, 4-digit (ending in 0000) as class.
    const isAGenericFamily = codeA % 100 === 0 && codeA % 10000 !== 0;
    const isBGenericFamily = codeB % 100 === 0 && codeB % 10000 !== 0;
    const isAGenericClass = codeA % 10000 === 0;
    const isBGenericClass = codeB % 10000 === 0;

    const familyA = Math.floor(codeA / 100);
    const familyB = Math.floor(codeB / 100);
    const classA = Math.floor(codeA / 10000);
    const classB = Math.floor(codeB / 10000);

    // Rule 1: A generic code can match a specific code within its hierarchy.
    // Check if A is a generic ancestor of B
    if (isAGenericClass && classA === classB) {
      return { bonus: 0.2, reason: `class-level UNSPSC match on ${classA} (generic-specific)` };
    }
    if (isAGenericFamily && familyA === familyB) {
      return { bonus: 0.4, reason: `family-level UNSPSC match on ${familyA} (generic-specific)` };
    }

    // Check if B is a generic ancestor of A
    if (isBGenericClass && classA === classB) {
      return { bonus: 0.2, reason: `class-level UNSPSC match on ${classB} (specific-generic)` };
    }
    if (isBGenericFamily && familyA === familyB) {
      return { bonus: 0.4, reason: `family-level UNSPSC match on ${familyB} (specific-generic)` };
    }

    // Rule 2: If both are specific and different, or generic at different levels
    // not directly hierarchical, they should not match according to the new rule.
    return { bonus: 0, reason: null };
  }

  private reason(a: MessageDocument, b: MessageDocument, score: number): string {
    const parts: string[] = [];

    const unspscBonus = this.computeUnspscBonus(a, b);
    if (unspscBonus.reason) {
      parts.push(unspscBonus.reason);
    }

    if (hasDateOverlap(a, b)) {
      parts.push('overlapping date range');
    }
    if (locationBonusKm(a, b) > 0) {
      parts.push('close geographic distance');
    }

    return `${parts.join(', ')} (score ${score.toFixed(2)})`;
  }
}

function hasDateOverlap(a: MessageDocument, b: MessageDocument): boolean {
  const aStart = a.searchable.dateRange?.startTimestamp;
  const aEnd = a.searchable.dateRange?.endTimestamp;
  const bStart = b.searchable.dateRange?.startTimestamp;
  const bEnd = b.searchable.dateRange?.endTimestamp;

  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd;
}

function locationBonusKm(a: MessageDocument, b: MessageDocument): number {
  const aLat = a.searchable.location?.latitude;
  const aLng = a.searchable.location?.longitude;
  const bLat = b.searchable.location?.latitude;
  const bLng = b.searchable.location?.longitude;

  if (
    typeof aLat !== 'number' ||
    typeof aLng !== 'number' ||
    typeof bLat !== 'number' ||
    typeof bLng !== 'number'
  ) {
    return 0;
  }

  const km = haversineKm(aLat, aLng, bLat, bLng);
  if (km <= 5) return 0.2;
  if (km <= 20) return 0.1;
  if (km <= 50) return 0.05;
  return 0;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

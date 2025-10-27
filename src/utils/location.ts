/**
 * Location utilities for coordinates and distance calculations
 */

import { PrecisionLevel } from '../types/message';

/**
 * Round coordinates to specified precision level
 * Returns string in format: "lat±precision,lon±precision"
 */
export function roundLocation(
  lat: number,
  lon: number,
  precisionLevel: PrecisionLevel
): string {
  const precisionMap: Record<PrecisionLevel, number> = {
    very_low: 0.1, // ±10km
    low: 0.05, // ±5km
    medium: 0.01, // ±1km
    high: 0.001, // ±100m
  };

  const precision = precisionMap[precisionLevel];
  const roundedLat = Math.round(lat / precision) * precision;
  const roundedLon = Math.round(lon / precision) * precision;

  return `${roundedLat.toFixed(3)}±${precision},${roundedLon.toFixed(3)}±${precision}`;
}

/**
 * Parse coordinate string into lat/lon object
 */
export function parseCoords(coords: string): {
  lat: number;
  lon: number;
  latPrecision?: number;
  lonPrecision?: number;
} | null {
  // Format: "37.423±0.001,-122.084±0.001"
  const match = coords.match(
    /^(-?\d+\.\d+)(?:±(\d+\.\d+))?,(-?\d+\.\d+)(?:±(\d+\.\d+))?$/
  );

  if (!match) {
    return null;
  }

  return {
    lat: parseFloat(match[1]),
    latPrecision: match[2] ? parseFloat(match[2]) : undefined,
    lon: parseFloat(match[3]),
    lonPrecision: match[4] ? parseFloat(match[4]) : undefined,
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance between two coordinate strings
 */
export function calculateDistanceFromCoords(coords1: string, coords2: string): number | null {
  const parsed1 = parseCoords(coords1);
  const parsed2 = parseCoords(coords2);

  if (!parsed1 || !parsed2) {
    return null;
  }

  return calculateDistance(parsed1.lat, parsed1.lon, parsed2.lat, parsed2.lon);
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Determine precision level based on network density
 */
export function getRecommendedPrecision(nearbyDeviceCount: number): PrecisionLevel {
  if (nearbyDeviceCount >= 30) {
    return 'high'; // ±100m
  } else if (nearbyDeviceCount >= 10) {
    return 'medium'; // ±1km
  } else if (nearbyDeviceCount >= 3) {
    return 'low'; // ±5km
  } else {
    return 'very_low'; // ±10km
  }
}

/**
 * Tests for location utility functions
 */

import {
  roundLocation,
  parseCoords,
  calculateDistance,
  calculateDistanceFromCoords,
  getRecommendedPrecision,
} from '../location';

describe('location', () => {
  describe('roundLocation', () => {
    it('should round location with very_low precision', () => {
      const result = roundLocation(37.4234, -122.0843, 'very_low');

      // very_low precision uses ±0.1 (~10km)
      expect(result).toBe('37.400±0.1,-122.100±0.1');
    });

    it('should round location with low precision', () => {
      const result = roundLocation(37.4234, -122.0843, 'low');

      // low precision uses ±0.05 (~5km)
      // 37.4234 rounds to 37.40 (37.4234 / 0.05 = 748.68, rounded to 748 * 0.05 = 37.40)
      expect(result).toBe('37.400±0.05,-122.100±0.05');
    });

    it('should round location with medium precision', () => {
      const result = roundLocation(37.4234, -122.0843, 'medium');

      // medium precision uses ±0.01 (~1km)
      expect(result).toBe('37.420±0.01,-122.080±0.01');
    });

    it('should round location with high precision', () => {
      const result = roundLocation(37.4234, -122.0843, 'high');

      // high precision uses ±0.001 (~100m)
      expect(result).toBe('37.423±0.001,-122.084±0.001');
    });

    it('should handle negative coordinates', () => {
      const result = roundLocation(-33.8688, 151.2093, 'medium');

      expect(result).toBe('-33.870±0.01,151.210±0.01');
    });

    it('should handle zero coordinates', () => {
      const result = roundLocation(0, 0, 'low');

      expect(result).toBe('0.000±0.05,0.000±0.05');
    });
  });

  describe('parseCoords', () => {
    it('should parse valid location string', () => {
      const result = parseCoords('37.423±0.05,-122.084±0.05');

      expect(result).toEqual({
        lat: 37.423,
        latPrecision: 0.05,
        lon: -122.084,
        lonPrecision: 0.05,
      });
    });

    it('should parse location with different precision', () => {
      const result = parseCoords('37.420±0.01,151.210±0.01');

      expect(result).toEqual({
        lat: 37.420,
        latPrecision: 0.01,
        lon: 151.210,
        lonPrecision: 0.01,
      });
    });

    it('should return null for invalid format', () => {
      expect(parseCoords('invalid')).toBeNull();
      expect(parseCoords('37.423±0.05')).toBeNull(); // Missing longitude
      expect(parseCoords('')).toBeNull();
    });

    it('should parse negative coordinates', () => {
      const result = parseCoords('-33.870±0.01,-151.210±0.01');

      expect(result).toEqual({
        lat: -33.870,
        latPrecision: 0.01,
        lon: -151.210,
        lonPrecision: 0.01,
      });
    });

    it('should parse coordinates without precision', () => {
      const result = parseCoords('37.423,-122.084');

      expect(result).toEqual({
        lat: 37.423,
        lon: -122.084,
        latPrecision: undefined,
        lonPrecision: undefined,
      });
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // San Francisco to Los Angeles (approx 559 km)
      const distance = calculateDistance(37.7749, -122.4194, 34.0522, -118.2437);

      // Allow 10km margin for rounding
      expect(distance).toBeGreaterThan(550);
      expect(distance).toBeLessThan(570);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(37.7749, -122.4194, 37.7749, -122.4194);

      expect(distance).toBe(0);
    });

    it('should calculate distance for close points', () => {
      // Two points approximately 1km apart
      const distance = calculateDistance(37.7749, -122.4194, 37.7839, -122.4194);

      // Should be close to 1km (allow margin)
      expect(distance).toBeGreaterThan(0.9);
      expect(distance).toBeLessThan(1.1);
    });

    it('should handle negative coordinates', () => {
      // Sydney to Melbourne (approx 714 km)
      const distance = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);

      expect(distance).toBeGreaterThan(700);
      expect(distance).toBeLessThan(730);
    });

    it('should calculate distance across equator', () => {
      const distance = calculateDistance(10, 0, -10, 0);

      // 20 degrees latitude ~ 2222 km
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2250);
    });

    it('should calculate distance across prime meridian', () => {
      const distance = calculateDistance(0, -10, 0, 10);

      // 20 degrees longitude at equator ~ 2226 km
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2250);
    });
  });

  describe('getRecommendedPrecision', () => {
    it('should recommend very_low for sparse network', () => {
      expect(getRecommendedPrecision(0)).toBe('very_low');
      expect(getRecommendedPrecision(1)).toBe('very_low');
      expect(getRecommendedPrecision(2)).toBe('very_low');
    });

    it('should recommend low for low density network', () => {
      expect(getRecommendedPrecision(3)).toBe('low');
      expect(getRecommendedPrecision(5)).toBe('low');
      expect(getRecommendedPrecision(9)).toBe('low');
    });

    it('should recommend medium for moderate density network', () => {
      expect(getRecommendedPrecision(10)).toBe('medium');
      expect(getRecommendedPrecision(15)).toBe('medium');
      expect(getRecommendedPrecision(29)).toBe('medium');
    });

    it('should recommend high for dense network', () => {
      expect(getRecommendedPrecision(30)).toBe('high');
      expect(getRecommendedPrecision(50)).toBe('high');
      expect(getRecommendedPrecision(100)).toBe('high');
    });
  });

  describe('calculateDistanceFromCoords', () => {
    it('should calculate distance from coordinate strings', () => {
      const coords1 = '37.774±0.05,-122.419±0.05';
      const coords2 = '34.052±0.05,-118.243±0.05';

      const distance = calculateDistanceFromCoords(coords1, coords2);

      expect(distance).not.toBeNull();
      if (distance !== null) {
        expect(distance).toBeGreaterThan(550);
        expect(distance).toBeLessThan(570);
      }
    });

    it('should return null for invalid coordinate strings', () => {
      expect(calculateDistanceFromCoords('invalid', '37.774±0.05,-122.419±0.05')).toBeNull();
      expect(calculateDistanceFromCoords('37.774±0.05,-122.419±0.05', 'invalid')).toBeNull();
      expect(calculateDistanceFromCoords('invalid', 'invalid')).toBeNull();
    });

    it('should handle coordinates without precision', () => {
      const coords1 = '37.774,-122.419';
      const coords2 = '34.052,-118.243';

      const distance = calculateDistanceFromCoords(coords1, coords2);

      expect(distance).not.toBeNull();
      if (distance !== null) {
        expect(distance).toBeGreaterThan(550);
        expect(distance).toBeLessThan(570);
      }
    });

    it('should return 0 for same coordinates', () => {
      const coords = '37.774±0.05,-122.419±0.05';

      const distance = calculateDistanceFromCoords(coords, coords);

      expect(distance).toBe(0);
    });
  });
});

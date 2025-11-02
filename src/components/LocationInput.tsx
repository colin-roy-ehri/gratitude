import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import type { Location, PrecisionLevel } from '../types/message';

export interface LocationInputProps {
  location?: Partial<Location>;
  onLocationChange: (location: Partial<Location>) => void;
}

const PRECISION_LABELS: Record<PrecisionLevel, string> = {
  very_low: 'Region (±100km)',
  low: 'City (±10km)',
  medium: 'Neighborhood (±1km)',
  high: 'Block (±100m)',
};

const PRECISION_VALUES: PrecisionLevel[] = [
  'very_low',
  'low',
  'medium',
  'high',
];

/**
 * Location input with privacy slider
 */
export function LocationInput({
  location,
  onLocationChange,
}: LocationInputProps) {
  // Extract coords for display (simplified - just show raw coords)
  const [address, setAddress] = useState(location?.coords || '');
  const [precisionIndex, setPrecisionIndex] = useState(
    location?.precision_level
      ? PRECISION_VALUES.indexOf(location.precision_level)
      : 2 // Default to medium
  );

  const handleAddressChange = (text: string) => {
    setAddress(text);
    // For now, store as coords - in real implementation, would geocode
    onLocationChange({
      ...location,
      coords: text,
    });
  };

  const handlePrecisionChange = (value: number) => {
    const index = Math.round(value);
    setPrecisionIndex(index);
    const precision = PRECISION_VALUES[index];
    onLocationChange({
      ...location,
      precision_level: precision,
    });
  };

  const currentPrecision = PRECISION_VALUES[precisionIndex];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter address or location"
        value={address}
        onChangeText={handleAddressChange}
        placeholderTextColor="#8E8E93"
      />

      <View style={styles.privacySection}>
        <Text style={styles.privacyLabel}>Privacy Level</Text>
        <Text style={styles.privacyValue}>
          {PRECISION_LABELS[currentPrecision]}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={3}
          step={1}
          value={precisionIndex}
          onValueChange={handlePrecisionChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#E5E5EA"
        />
        <View style={styles.privacyHint}>
          <Text style={styles.hintText}>More Private</Text>
          <Text style={styles.hintText}>More Precise</Text>
        </View>
      </View>

      <Text style={styles.infoText}>
        Location will be rounded to protect your privacy. Only you will see the exact location.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
  },
  privacySection: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  privacyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  privacyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  privacyHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hintText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  infoText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
});

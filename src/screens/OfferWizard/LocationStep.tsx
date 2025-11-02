import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useDraftStore } from '../../stores/draftStore';
import { LocationInput, Button } from '../../components';
import type { Location } from '../../types/message';

interface LocationStepProps {
  draftId: string;
  location?: Location;
  onNext: () => void;
}

/**
 * Step 3: Select location for offer
 */
export default function LocationStep({
  draftId,
  location,
  onNext,
}: LocationStepProps) {
  const updateDraft = useDraftStore((state) => state.updateDraft);

  const handleLocationChange = (updatedLocation: Partial<Location>) => {
    updateDraft(draftId, {
      location: {
        ...location,
        ...updatedLocation,
        precision_level: updatedLocation.precision_level || 'medium',
      } as Location,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Where can you help?</Text>
        <Text style={styles.subtitle}>
          Add a location where you can provide assistance
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LocationInput
          location={location}
          onLocationChange={handleLocationChange}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={onNext}
          style={styles.button}
        />
        <Text style={styles.skipText}>
          Location is optional. You can skip this step.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    width: '100%',
    marginBottom: 8,
  },
  skipText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

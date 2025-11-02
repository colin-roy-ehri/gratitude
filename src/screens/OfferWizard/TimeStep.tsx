import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDraftStore } from '../../stores/draftStore';
import { TimePatternSelector, Button } from '../../components';
import type { Time, TimePattern } from '../../types/message';

interface TimeStepProps {
  draftId: string;
  time?: Time;
  onNext: () => void;
}

/**
 * Step 2: Select time pattern for offer
 */
export default function TimeStep({ draftId, time, onNext }: TimeStepProps) {
  const updateDraft = useDraftStore((state) => state.updateDraft);

  const handleSelectPattern = (pattern: TimePattern) => {
    updateDraft(draftId, {
      time: {
        pattern: pattern,
      },
    });
  };

  const canProceed = !!time?.pattern;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>When can you help?</Text>
        <Text style={styles.subtitle}>
          Select when you're available to provide assistance
        </Text>
      </View>

      <TimePatternSelector
        selectedPattern={time?.pattern}
        onSelectPattern={handleSelectPattern}
      />

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={onNext}
          disabled={!canProceed}
          style={styles.button}
        />
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
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    width: '100%',
  },
});

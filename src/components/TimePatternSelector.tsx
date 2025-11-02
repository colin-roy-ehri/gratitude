import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { TimePattern } from '../types/message';

export interface TimePatternSelectorProps {
  selectedPattern?: TimePattern;
  onSelectPattern: (pattern: TimePattern) => void;
}

const TIME_PATTERNS: Array<{
  key: TimePattern;
  label: string;
  description: string;
}> = [
  {
    key: 'Immediate',
    label: 'Immediate',
    description: 'Right now',
  },
  {
    key: 'Today',
    label: 'Today',
    description: 'Sometime today',
  },
  {
    key: 'Tomorrow',
    label: 'Tomorrow',
    description: 'Anytime tomorrow',
  },
  {
    key: 'This_week',
    label: 'This Week',
    description: 'Within 7 days',
  },
  {
    key: 'Next_week',
    label: 'Next Week',
    description: '7-14 days',
  },
  {
    key: 'Specific_days',
    label: 'Specific Days',
    description: 'Choose specific days',
  },
  {
    key: 'Recurring',
    label: 'Recurring',
    description: 'Repeating pattern',
  },
  {
    key: 'Flexible',
    label: 'Flexible',
    description: 'No specific time',
  },
];

/**
 * Selector for general time patterns
 */
export function TimePatternSelector({
  selectedPattern,
  onSelectPattern,
}: TimePatternSelectorProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {TIME_PATTERNS.map((pattern) => {
        const isSelected = selectedPattern === pattern.key;

        return (
          <TouchableOpacity
            key={pattern.key}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelectPattern(pattern.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {pattern.label}
            </Text>
            <Text style={[styles.description, isSelected && styles.descriptionSelected]}>
              {pattern.description}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    padding: 16,
    marginBottom: 12,
  },
  cardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E5F1FF',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  labelSelected: {
    color: '#007AFF',
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
  },
  descriptionSelected: {
    color: '#007AFF',
  },
});

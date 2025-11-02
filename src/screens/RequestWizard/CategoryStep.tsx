import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDraftStore } from '../../stores/draftStore';
import { CategorySelector, Button } from '../../components';
import type { PrimaryCategory } from '../../types/message';

interface CategoryStepProps {
  draftId: string;
  selectedCategory?: PrimaryCategory;
  onNext: () => void;
}

/**
 * Step 1: Select category for request
 */
export default function CategoryStep({
  draftId,
  selectedCategory,
  onNext,
}: CategoryStepProps) {
  const updateDraft = useDraftStore((state) => state.updateDraft);

  const handleSelectCategory = (category: PrimaryCategory) => {
    updateDraft(draftId, {
      category: {
        primary: category,
      },
    });
  };

  const canProceed = !!selectedCategory;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>What do you need?</Text>
        <Text style={styles.subtitle}>
          Select the category that best describes your request
        </Text>
      </View>

      <CategorySelector
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
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

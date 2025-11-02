import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { CATEGORIES } from '../constants/categories';
import type { PrimaryCategory } from '../types/message';

export interface CategorySelectorProps {
  selectedCategory?: PrimaryCategory;
  onSelectCategory: (category: PrimaryCategory) => void;
}

/**
 * Grid selector for choosing a category
 */
export function CategorySelector({
  selectedCategory,
  onSelectCategory,
}: CategorySelectorProps) {
  const categories = Object.values(CATEGORIES);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grid}>
        {categories.map((category) => {
          const isSelected = selectedCategory === category.key;

          return (
            <TouchableOpacity
              key={category.key}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => onSelectCategory(category.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.icon}>{category.icon}</Text>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  cardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E5F1FF',
  },
  icon: {
    fontSize: 32,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  labelSelected: {
    color: '#007AFF',
  },
});

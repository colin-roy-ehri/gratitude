import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { CATEGORIES } from '../../constants/categories';
import { Card, Button } from '../../components';
import type { WizardDraft } from '../../stores/draftStore';

interface ReviewStepProps {
  draft: WizardDraft;
  onSubmit: () => void;
  isSubmitting: boolean;
}

/**
 * Step 4: Review and submit offer
 */
export default function ReviewStep({
  draft,
  onSubmit,
  isSubmitting,
}: ReviewStepProps) {
  const categoryInfo = draft.category?.primary
    ? CATEGORIES[draft.category.primary]
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Review your offer</Text>
        <Text style={styles.subtitle}>
          Make sure everything looks correct before submitting
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryRow}>
            {categoryInfo && (
              <>
                <Text style={styles.categoryIcon}>{categoryInfo.icon}</Text>
                <Text style={styles.categoryText}>{categoryInfo.label}</Text>
              </>
            )}
          </View>
        </Card>

        {draft.time && (
          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>Time</Text>
            <Text style={styles.valueText}>
              {draft.time.pattern?.replace('_', ' ')}
            </Text>
          </Card>
        )}

        {draft.location && (
          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>Location</Text>
            <Text style={styles.valueText}>
              {draft.location.coords || 'Location set'}
            </Text>
            <Text style={styles.privacyText}>
              Privacy: {draft.location.precision_level || 'medium'}
            </Text>
          </Card>
        )}

        <Card style={styles.infoCard}>
          <Text style={styles.infoIcon}>🤝</Text>
          <Text style={styles.infoTitle}>Ready to Help</Text>
          <Text style={styles.infoText}>
            Your offer will be shared with nearby community members via
            encrypted mesh network. Others can respond to coordinate with you.
          </Text>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Submit Offer"
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  valueText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  privacyText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    marginTop: 8,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1C1C1E',
    textAlign: 'center',
    lineHeight: 20,
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

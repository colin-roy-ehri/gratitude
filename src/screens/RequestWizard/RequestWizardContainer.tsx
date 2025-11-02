import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDraftStore } from '../../stores/draftStore';
import { useMessageStore } from '../../stores/messageStore';
import { ProgressBar, Button } from '../../components';
import type { RootStackScreenProps } from '../../navigation/types';

// Step components
import CategoryStep from './CategoryStep';
import TimeStep from './TimeStep';
import LocationStep from './LocationStep';
import ReviewStep from './ReviewStep';

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Category', 'Time', 'Location', 'Review'];
const TOTAL_STEPS = 4;

/**
 * Request wizard container managing navigation between steps
 */
export default function RequestWizardContainer({
  route,
  navigation,
}: RootStackScreenProps<'RequestWizard'>) {
  const { draftId } = route.params || {};

  const createDraft = useDraftStore((state) => state.createDraft);
  const updateDraft = useDraftStore((state) => state.updateDraft);
  const getDraft = useDraftStore((state) => state.getDraft);
  const deleteDraft = useDraftStore((state) => state.deleteDraft);
  const createNeed = useMessageStore((state) => state.createNeed);

  const [currentDraftId, setCurrentDraftId] = useState<string>(draftId || '');
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or load draft
  useEffect(() => {
    if (!currentDraftId) {
      const newDraftId = createDraft('request');
      setCurrentDraftId(newDraftId);
    } else {
      const draft = getDraft(currentDraftId);
      if (draft) {
        setCurrentStep(draft.currentStep as Step);
      }
    }
  }, [currentDraftId, createDraft, getDraft]);

  const draft = currentDraftId ? getDraft(currentDraftId) : undefined;

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      const nextStep = (currentStep + 1) as Step;
      setCurrentStep(nextStep);
      if (currentDraftId) {
        updateDraft(currentDraftId, { currentStep: nextStep });
      }
    }
  }, [currentStep, currentDraftId, updateDraft]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as Step;
      setCurrentStep(prevStep);
      if (currentDraftId) {
        updateDraft(currentDraftId, { currentStep: prevStep });
      }
    } else {
      navigation.goBack();
    }
  }, [currentStep, currentDraftId, navigation, updateDraft]);

  const handleSubmit = useCallback(async () => {
    if (!draft || !draft.category?.primary) return;

    setIsSubmitting(true);
    try {
      // Default location if not provided - use 0,0 as placeholder
      const location = draft.location?.coords
        ? { lat: 0, lon: 0 } // TODO: Parse coords string to lat/lon
        : { lat: 0, lon: 0 };

      await createNeed({
        category: draft.category.primary,
        secondary: draft.category.secondary,
        attributes: draft.category.attributes,
        time: draft.time,
        location,
        quantity: draft.quantity,
        recurrence_pattern: draft.recurrencePattern,
        note: draft.note,
      });

      // Clean up draft
      if (currentDraftId) {
        deleteDraft(currentDraftId);
      }

      // Navigate back to main screen
      navigation.navigate('MainTabs');
    } catch (error) {
      console.error('Failed to create request:', error);
      setIsSubmitting(false);
    }
  }, [draft, currentDraftId, createNeed, deleteDraft, navigation]);

  const renderStep = () => {
    if (!currentDraftId || !draft) return null;

    switch (currentStep) {
      case 1:
        return (
          <CategoryStep
            draftId={currentDraftId}
            selectedCategory={draft.category?.primary}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <TimeStep
            draftId={currentDraftId}
            time={draft.time}
            onNext={handleNext}
          />
        );
      case 3:
        return (
          <LocationStep
            draftId={currentDraftId}
            location={draft.location}
            onNext={handleNext}
          />
        );
      case 4:
        return (
          <ReviewStep
            draft={draft}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ProgressBar
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          stepLabels={STEP_LABELS}
          style={styles.progress}
        />

        <View style={styles.stepContainer}>{renderStep()}</View>

        {currentStep > 1 && currentStep < TOTAL_STEPS && (
          <View style={styles.navigation}>
            <Button
              title="Back"
              onPress={handleBack}
              variant="outline"
              style={styles.navButton}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
  },
  progress: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  stepContainer: {
    flex: 1,
  },
  navigation: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  navButton: {
    flex: 1,
  },
});

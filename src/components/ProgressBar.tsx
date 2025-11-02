import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  style?: ViewStyle;
}

/**
 * Progress bar indicator for wizard flows
 */
export function ProgressBar({
  currentStep,
  totalSteps,
  stepLabels,
  style,
}: ProgressBarProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isActive = isCompleted || isCurrent;

          return (
            <React.Fragment key={stepNumber}>
              <View
                style={[
                  styles.step,
                  isActive && styles.stepActive,
                  isCompleted && styles.stepCompleted,
                ]}
              >
                <Text
                  style={[
                    styles.stepText,
                    isActive && styles.stepTextActive,
                  ]}
                >
                  {stepNumber}
                </Text>
              </View>
              {stepNumber < totalSteps && (
                <View
                  style={[
                    styles.line,
                    isCompleted && styles.lineCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
      {stepLabels && stepLabels[currentStep - 1] && (
        <Text style={styles.label}>{stepLabels[currentStep - 1]}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: '#007AFF',
  },
  stepCompleted: {
    backgroundColor: '#34C759',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 4,
  },
  lineCompleted: {
    backgroundColor: '#34C759',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 8,
  },
});

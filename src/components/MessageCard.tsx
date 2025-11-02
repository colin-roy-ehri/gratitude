import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CATEGORIES } from '../constants/categories';
import type { MutualAidMessage } from '../types/message';

export interface MessageCardProps {
  message: MutualAidMessage;
  onPress?: () => void;
  showDistance?: boolean;
  distance?: number; // in kilometers
}

/**
 * Message card component that parses and displays request/offer summaries
 * Shows: category icon, category name, time info, location proximity
 */
export function MessageCard({
  message,
  onPress,
  showDistance = true,
  distance,
}: MessageCardProps) {
  const isRequest = message.type === 'NEED';
  const categoryInfo = message.public.category?.primary
    ? CATEGORIES[message.public.category.primary]
    : null;

  const formatTimePattern = (pattern?: string) => {
    if (!pattern) return null;
    return pattern.replace(/_/g, ' ');
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m away`;
    }
    return `${km.toFixed(1)}km away`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isRequest ? styles.requestCard : styles.offerCard,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.typeRow}>
          <Text style={styles.typeIcon}>{isRequest ? '🙏' : '🤝'}</Text>
          <Text style={[styles.typeText, isRequest ? styles.requestType : styles.offerType]}>
            {isRequest ? 'Request' : 'Offer'}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatTimestamp(message.timestamp)}</Text>
      </View>

      <View style={styles.content}>
        {categoryInfo && (
          <View style={styles.categoryRow}>
            <Text style={styles.categoryIcon}>{categoryInfo.icon}</Text>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryLabel}>{categoryInfo.label}</Text>
              {categoryInfo.description && (
                <Text style={styles.categoryDesc} numberOfLines={1}>
                  {categoryInfo.description}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.details}>
          {message.public.time?.pattern && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🕐</Text>
              <Text style={styles.detailText}>
                {formatTimePattern(message.public.time.pattern)}
              </Text>
            </View>
          )}

          {showDistance && distance !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>
                {formatDistance(distance)}
              </Text>
            </View>
          )}

          {message.public.location && !distance && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>
                {message.public.location.coords || 'Location set'}
              </Text>
            </View>
          )}

          {message.public.quantity && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📦</Text>
              <Text style={styles.detailText}>
                {message.public.quantity}
              </Text>
            </View>
          )}
        </View>
      </View>

      {message.in_response_to && (
        <View style={styles.responseTag}>
          <Text style={styles.responseText}>↩️ In response to request</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  requestCard: {
    borderLeftColor: '#007AFF',
  },
  offerCard: {
    borderLeftColor: '#34C759',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeIcon: {
    fontSize: 16,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requestType: {
    color: '#007AFF',
  },
  offerType: {
    color: '#34C759',
  },
  timestamp: {
    fontSize: 11,
    color: '#8E8E93',
  },
  content: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    fontSize: 40,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  categoryDesc: {
    fontSize: 13,
    color: '#8E8E93',
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    fontSize: 14,
  },
  detailText: {
    fontSize: 14,
    color: '#1C1C1E',
  },
  responseTag: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  responseText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useMessageStore } from '../stores/messageStore';
import { CATEGORIES } from '../constants/categories';
import { Button, Card } from '../components';
import type { RootStackScreenProps } from '../navigation/types';

/**
 * Detail screen showing full message information
 */
export default function MessageDetailScreen({
  route,
  navigation,
}: RootStackScreenProps<'MessageDetail'>) {
  const { messageId } = route.params;

  const messages = useMessageStore((state) => state.messages);
  const myMessages = useMessageStore((state) => state.myMessages);
  const deleteMessage = useMessageStore((state) => state.deleteMessage);

  const message = messages.find((m) => m.message_id === messageId);
  const isMine = myMessages.some((msg) => typeof msg === 'string' ? msg === messageId : msg.message_id === messageId);

  const isRequest = message?.type === 'NEED';
  const categoryInfo = message?.public.category?.primary
    ? CATEGORIES[message.public.category.primary]
    : null;

  const handleRespond = useCallback(() => {
    if (!message) return;

    if (isRequest) {
      // Responding to a request with an offer
      navigation.navigate('OfferWizard', { inResponseTo: messageId });
    } else {
      // Could implement coordination flow here
      Alert.alert('Coordination', 'Coordination feature coming soon!');
    }
  }, [message, isRequest, messageId, navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMessage(messageId);
            navigation.goBack();
          },
        },
      ]
    );
  }, [messageId, deleteMessage, navigation]);

  if (!message) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Message not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.typeCard}>
          <View style={styles.typeRow}>
            <Text style={styles.typeIcon}>{isRequest ? '🙏' : '🤝'}</Text>
            <Text style={[styles.typeText, isRequest ? styles.requestType : styles.offerType]}>
              {isRequest ? 'Request' : 'Offer'}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {new Date(message.timestamp).toLocaleString()}
          </Text>
        </Card>

        {categoryInfo && (
          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>{categoryInfo.icon}</Text>
              <View>
                <Text style={styles.categoryName}>{categoryInfo.label}</Text>
                <Text style={styles.categoryDesc}>{categoryInfo.description}</Text>
              </View>
            </View>
          </Card>
        )}

        {message.public.time && (
          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>Time</Text>
            <Text style={styles.valueText}>
              {message.public.time.pattern?.replace(/_/g, ' ')}
            </Text>
          </Card>
        )}

        {message.public.location && (
          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>Location</Text>
            <Text style={styles.valueText}>
              {message.public.location.coords || 'Location set'}
            </Text>
            <Text style={styles.privacyText}>
              Privacy: {message.public.location.precision_level || 'medium'}
            </Text>
          </Card>
        )}

        {message.public.quantity && (
          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>Quantity</Text>
            <Text style={styles.valueText}>{message.public.quantity}</Text>
          </Card>
        )}

        {message.public.note && (
          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>Note</Text>
            <Text style={styles.valueText}>{message.public.note}</Text>
          </Card>
        )}

        <Card style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>
            This information is shared via encrypted mesh network. Additional
            details will be visible once you coordinate.
          </Text>
        </Card>
      </ScrollView>

      <View style={styles.actions}>
        {!isMine && (
          <Button
            title={isRequest ? 'Offer Help' : 'Respond'}
            onPress={handleRespond}
            style={styles.button}
          />
        )}
        {isMine && (
          <Button
            title="Delete"
            onPress={handleDelete}
            variant="outline"
            style={styles.button}
          />
        )}
      </View>
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
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  typeCard: {
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeIcon: {
    fontSize: 24,
  },
  typeText: {
    fontSize: 16,
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
    fontSize: 12,
    color: '#8E8E93',
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
    gap: 16,
  },
  categoryIcon: {
    fontSize: 48,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 14,
    color: '#8E8E93',
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
    backgroundColor: '#E5F1FF',
    alignItems: 'center',
    marginTop: 8,
  },
  infoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1C1C1E',
    textAlign: 'center',
    lineHeight: 18,
  },
  actions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    width: '100%',
  },
});

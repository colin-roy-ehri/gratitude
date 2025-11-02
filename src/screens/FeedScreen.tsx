import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useMessageStore } from '../stores/messageStore';
import type { MainTabScreenProps } from '../navigation/types';
import { MessageCard } from '../components';

/**
 * Feed screen showing all requests and offers
 */
export default function FeedScreen({ navigation }: MainTabScreenProps<'Feed'>) {
  const { messages, loading } = useMessageStore();

  const handleCreateRequest = useCallback(() => {
    navigation.navigate('RequestWizard', {});
  }, [navigation]);

  const handleCreateOffer = useCallback(() => {
    navigation.navigate('OfferWizard', {});
  }, [navigation]);

  const handleMessagePress = useCallback((messageId: string) => {
    navigation.navigate('MessageDetail', { messageId });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community Feed</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCreateRequest}
          >
            <Text style={styles.actionIcon}>🙏</Text>
            <Text style={styles.actionText}>Request</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCreateOffer}
          >
            <Text style={styles.actionIcon}>🤝</Text>
            <Text style={styles.actionText}>Offer</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.message_id}
        renderItem={({ item }) => (
          <View style={styles.messageCardContainer}>
            <MessageCard
              message={item}
              onPress={() => handleMessagePress(item.message_id)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Create a request or offer to get started
            </Text>
          </View>
        }
        contentContainerStyle={messages.length === 0 && styles.emptyContainer}
        refreshing={loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageCardContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
});

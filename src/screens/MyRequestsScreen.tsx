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
 * Screen showing user's own requests
 */
export default function MyRequestsScreen({ navigation }: MainTabScreenProps<'MyRequests'>) {
  const getMyRequests = useMessageStore((state) => state.getMyRequests);
  const myRequests = getMyRequests();

  const handleCreateRequest = useCallback(() => {
    navigation.navigate('RequestWizard', {});
  }, [navigation]);

  const handleMessagePress = useCallback((messageId: string) => {
    navigation.navigate('MessageDetail', { messageId });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Requests</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateRequest}
        >
          <Text style={styles.createButtonText}>+ New Request</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={myRequests}
        keyExtractor={(item) => item.message_id}
        renderItem={({ item }) => (
          <View style={styles.messageCardContainer}>
            <MessageCard
              message={item}
              onPress={() => handleMessagePress(item.message_id)}
              showDistance={false}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No requests yet</Text>
            <Text style={styles.emptySubtext}>
              Tap "New Request" to create your first request
            </Text>
          </View>
        }
        contentContainerStyle={myRequests.length === 0 && styles.emptyContainer}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 14,
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

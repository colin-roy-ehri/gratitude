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
 * Screen showing user's own offers
 */
export default function MyOffersScreen({ navigation }: MainTabScreenProps<'MyOffers'>) {
  const getMyOffers = useMessageStore((state) => state.getMyOffers);
  const myOffers = getMyOffers();

  const handleCreateOffer = useCallback(() => {
    navigation.navigate('OfferWizard', {});
  }, [navigation]);

  const handleMessagePress = useCallback((messageId: string) => {
    navigation.navigate('MessageDetail', { messageId });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Offers</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateOffer}
        >
          <Text style={styles.createButtonText}>+ New Offer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={myOffers}
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
            <Text style={styles.emptyText}>No offers yet</Text>
            <Text style={styles.emptySubtext}>
              Tap "New Offer" to create your first offer
            </Text>
          </View>
        }
        contentContainerStyle={myOffers.length === 0 && styles.emptyContainer}
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

import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

/**
 * Root Stack Navigator - Contains all screens in the app
 */
export type RootStackParamList = {
  MainTabs: undefined | { screen?: string };
  RequestWizard: { draftId?: string };
  OfferWizard: { draftId?: string; inResponseTo?: string };
  MessageDetail: { messageId: string };
  BLETest: undefined;
};

/**
 * Bottom Tab Navigator - Main app tabs
 */
export type MainTabParamList = {
  Feed: undefined;
  MyRequests: undefined;
  MyOffers: undefined;
};

/**
 * Screen props types for type-safe navigation
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

/**
 * Navigation prop type helpers
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

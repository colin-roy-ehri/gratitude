import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, MainTabParamList } from './types';

// Screens
import FeedScreen from '../screens/FeedScreen';
import MyRequestsScreen from '../screens/MyRequestsScreen';
import MyOffersScreen from '../screens/MyOffersScreen';
import { BLETestScreen } from '../screens/BLETestScreen';
import MessageDetailScreen from '../screens/MessageDetailScreen';
import RequestWizardContainer from '../screens/RequestWizard/RequestWizardContainer';
import OfferWizardContainer from '../screens/OfferWizard/OfferWizardContainer';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Bottom tab navigator containing main app screens
 */
function MainTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            // Using text as placeholder, will replace with proper icons
            <Text style={{ color, fontSize: size }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="MyRequests"
        component={MyRequestsScreen}
        options={{
          tabBarLabel: 'My Requests',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Text style={{ color, fontSize: size }}>🙏</Text>
          ),
        }}
      />
      <Tab.Screen
        name="MyOffers"
        component={MyOffersScreen}
        options={{
          tabBarLabel: 'My Offers',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Text style={{ color, fontSize: size }}>🤝</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Root stack navigator containing all app screens
 */
export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabsNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RequestWizard"
          component={RequestWizardContainer}
          options={{ title: 'Create Request', headerBackTitle: 'Cancel' }}
        />
        <Stack.Screen
          name="OfferWizard"
          component={OfferWizardContainer}
          options={{ title: 'Create Offer', headerBackTitle: 'Cancel' }}
        />
        <Stack.Screen
          name="MessageDetail"
          component={MessageDetailScreen}
          options={{ title: 'Message Details' }}
        />
        <Stack.Screen
          name="BLETest"
          component={BLETestScreen}
          options={{ title: 'BLE Test' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

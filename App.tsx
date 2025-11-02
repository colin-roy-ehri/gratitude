import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, View, TouchableOpacity, Text } from 'react-native';
import { BLETestScreen } from './src/screens/BLETestScreen';
import { ShareApkScreen } from './src/screens/ShareApkScreen';

type Screen = 'ble' | 'share';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('ble');

  return (
    <SafeAreaView style={styles.container}>
      {/* Simple Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, currentScreen === 'ble' && styles.tabActive]}
          onPress={() => setCurrentScreen('ble')}
        >
          <Text style={[styles.tabText, currentScreen === 'ble' && styles.tabTextActive]}>
            📡 BLE Test
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentScreen === 'share' && styles.tabActive]}
          onPress={() => setCurrentScreen('share')}
        >
          <Text style={[styles.tabText, currentScreen === 'share' && styles.tabTextActive]}>
            📤 Share App
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Content */}
      {currentScreen === 'ble' && <BLETestScreen />}
      {currentScreen === 'share' && <ShareApkScreen />}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#4CAF50',
    fontWeight: '700',
  },
});

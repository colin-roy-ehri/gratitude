import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView } from 'react-native';
import { BLETestScreen } from './src/screens/BLETestScreen';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <BLETestScreen />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

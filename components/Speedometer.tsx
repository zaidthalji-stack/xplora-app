// components/Speedometer.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SpeedometerProps {
  speed: number | null; // m/s
  theme: any; // Pass theme from parent
}

export function Speedometer({ speed, theme }: SpeedometerProps) {
  if (speed === null || speed === undefined) return null;

  const speedKmh = Math.round(speed * 3.6);
  const speedColor = speedKmh > 80 ? '#FF3B30' : speedKmh > 50 ? '#FF9500' : '#34C759';

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <View style={[styles.speedCircle, { backgroundColor: theme.background, borderColor: speedColor }]}>
        <Text style={styles.speedText}>{speedKmh}</Text>
      </View>
      <Text style={[styles.unitText, { color: theme.text }]}>km/h</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  speedCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  speedText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  unitText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});
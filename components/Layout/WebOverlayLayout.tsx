import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapChatLayout } from './MapChatLayout';
import MapScreen from '@/app/(tabs)/map';
import ChatScreen from '@/app/(tabs)/index';

/**
 * WebOverlayLayout - Mapbox-style integrated layout for web
 * 
 * Combines the map and chat screens into a single view with:
 * - Chat panel on the left (collapsible)
 * - Map view on the right (full map)
 * - Smooth transitions and animations
 */
export function WebOverlayLayout() {
  return (
    <View style={styles.container}>
      <MapChatLayout
        mapContent={<MapScreen />}
        chatContent={<ChatScreen />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

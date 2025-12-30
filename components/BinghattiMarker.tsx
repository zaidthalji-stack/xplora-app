import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { Marker } from 'react-map-gl';
import { getLogoSize } from '@/utils/developerLogos';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

interface BinghattiMarkerProps {
  longitude: number;
  latitude: number;
  zoomLevel: number;
  onLogoClick: () => void;
}

export function BinghattiMarker({ 
  longitude, 
  latitude, 
  zoomLevel, 
  onLogoClick 
}: BinghattiMarkerProps) {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const logoSize = getLogoSize(zoomLevel, 2);
  
  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
      offset={[0, 0]}
    >
      <View style={styles.markerContainer}>
        <TouchableOpacity
          onPress={onLogoClick}
          style={[
            styles.floatingMarker,
            {
              width: logoSize.width,
              height: logoSize.height,
            }
          ]}
          activeOpacity={0.8}
        >
          <View style={styles.markerShadow} />
          <View style={styles.markerContent}>
            <Image
              source={require('@/assets/images/Bgatti.png')}
              style={{
                width: logoSize.width * 0.7,
                height: logoSize.height * 0.7,
              }}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
        
        <View style={[styles.connector, { backgroundColor: theme.primary }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    position: 'relative',
    transform: [{ translateY: -45 }],
  },
  connector: {
    width: 2,
    height: 45,
    borderRadius: 1,
  },
  floatingMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    zIndex: 1000,
  },
  markerShadow: {
    position: 'absolute',
    bottom: -6,
    left: '15%',
    right: '15%',
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 100,
    ...(Platform.OS === 'web' ? {
      filter: 'blur(3px)',
    } : {}),
  },
  markerContent: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
    } : {}),
  },
});
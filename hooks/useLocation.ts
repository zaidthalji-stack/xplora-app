import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

interface LocationCoords {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

interface LocationData {
  coords: LocationCoords;
  timestamp: number;
}

interface OtherUser {
  user_id: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  updated_at: string;
}

export default function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [otherUsers, setOtherUsers] = useState<OtherUser[]>([]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        console.log('🗺️ Requesting location permissions...');
        
        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.error('❌ Location permission denied');
          setErrorMsg('Location permission denied. Please enable location access in your device settings.');
          return;
        }

        console.log('✅ Location permission granted');

        // Get current position first (faster initial load)
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          console.log('📍 Initial location:', {
            lat: currentLocation.coords.latitude,
            lng: currentLocation.coords.longitude,
          });
          
          setLocation(currentLocation);
          setErrorMsg(null);
        } catch (error) {
          console.error('❌ Error getting current position:', error);
        }

        // Start watching position for continuous updates
        console.log('👁️ Starting location watch...');
        
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000, // Update every 1 second
            distanceInterval: 1, // Update every 1 meter
          },
          (newLocation) => {
            console.log('📍 Location update:', {
              lat: newLocation.coords.latitude,
              lng: newLocation.coords.longitude,
              speed: newLocation.coords.speed,
            });
            
            setLocation(newLocation);
            setErrorMsg(null);
          }
        );

        console.log('✅ Location tracking active');

      } catch (error: any) {
        console.error('❌ Location error:', error);
        setErrorMsg(`Location error: ${error.message || 'Unknown error'}`);
      }
    })();

    // Cleanup
    return () => {
      if (subscription) {
        console.log('🛑 Stopping location tracking');
        subscription.remove();
      }
    };
  }, []);

  return {
    location,
    errorMsg,
    otherUsers,
  };
}
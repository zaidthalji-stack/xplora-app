// hooks/useNearMe.ts
import { useState, useCallback } from 'react';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmFpdGFrIiwiYSI6ImNtZ2o5YWN3djBjdTcybXF3MjNlOGFwaHAifQ.fZik8fQ5NvQZngIxCgaB6w';

export interface NearMeAction {
  type: 'proximity_search' | 'isochrone_search' | 'find_nearby_pois';
  use_user_location?: boolean;
  center?: string | [number, number];
  radius_km?: number;
  time_minutes?: number[];
  profile?: 'mapbox/driving-traffic' | 'mapbox/driving' | 'mapbox/walking' | 'mapbox/cycling';
  categories?: string[];
  property_id?: string;
  show_radius_circle?: boolean;
  show_isochrone?: boolean;
  show_on_map?: boolean;
}

export interface POIResult {
  id: string;
  name: string;
  category: string;
  coordinates: [number, number];
  address: string;
  distance: number;
}

/**
 * Hook for "Near Me" functionality using Mapbox APIs
 */
export function useNearMe() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pois, setPois] = useState<POIResult[]>([]);

  /**
   * Calculate distance between two points (Haversine formula)
   */
  const calculateDistance = useCallback((
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  /**
   * Geocode a location string to coordinates
   */
  const geocodeLocation = async (location: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?` +
        `access_token=${MAPBOX_TOKEN}&` +
        `proximity=55.2708,25.2048&` + // Dubai
        `limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features[0].center as [number, number];
      }
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  /**
   * Find nearby POIs using Mapbox Places API
   */
  const findNearbyPOIs = async (
    center: [number, number],
    categories: string[],
    radiusKm: number = 1
  ): Promise<POIResult[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const categoryMapping: Record<string, string> = {
        restaurants: 'restaurant',
        coffee: 'cafe',
        bars: 'bar',
        hotels: 'lodging',
        atm: 'atm',
        hospital: 'hospital',
        pharmacy: 'pharmacy',
        school: 'school',
        supermarket: 'grocery',
        shopping: 'shopping',
        park: 'park',
        gym: 'gym',
        mosque: 'place_of_worship',
        metro_station: 'transit_station',
        bus_stop: 'bus_station',
        fuel: 'fuel',
        parking: 'parking',
      };

      const allPOIs: POIResult[] = [];

      // Search each category
      for (const category of categories) {
        const mapboxCategory = categoryMapping[category] || category;
        
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${mapboxCategory}.json?` +
          `proximity=${center[0]},${center[1]}&` +
          `limit=10&` +
          `access_token=${MAPBOX_TOKEN}`
        );

        const data = await response.json();

        if (data.features) {
          data.features.forEach((feature: any) => {
            const [lon, lat] = feature.center;
            const distance = calculateDistance(center[1], center[0], lat, lon);

            // Filter by radius
            if (distance <= radiusKm) {
              allPOIs.push({
                id: feature.id,
                name: feature.text,
                category: category,
                coordinates: [lon, lat],
                address: feature.place_name,
                distance: distance,
              });
            }
          });
        }
      }

      // Sort by distance
      allPOIs.sort((a, b) => a.distance - b.distance);

      setPois(allPOIs);
      setIsLoading(false);
      return allPOIs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find POIs';
      console.error('POI search error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
      return [];
    }
  };

  /**
   * Filter properties by proximity
   */
  const filterPropertiesByProximity = useCallback((
    properties: any[],
    center: [number, number],
    radiusKm: number
  ) => {
    return properties
      .map(property => ({
        ...property,
        distance: calculateDistance(
          center[1],
          center[0],
          property.Latitude,
          property.Longitude
        ),
      }))
      .filter(property => property.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }, [calculateDistance]);

  /**
   * Filter properties by isochrone polygon
   */
  const filterPropertiesByIsochrone = useCallback((
    properties: any[],
    isochronePolygon: number[][][]
  ) => {
    // Point-in-polygon test
    const isPointInPolygon = (point: [number, number], polygon: number[][]) => {
      const [lon, lat] = point;
      let inside = false;

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];

        const intersect =
          yi > lat !== yj > lat &&
          lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
      }

      return inside;
    };

    return properties.filter(property => {
      const point: [number, number] = [property.Longitude, property.Latitude];
      // Check if point is in any ring of the polygon
      return isochronePolygon.some(ring => isPointInPolygon(point, ring));
    });
  }, []);

  /**
   * Format distance for display
   */
  const formatDistance = useCallback((distanceKm: number, profile?: string): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    
    // Estimate time based on profile
    if (profile) {
      const speed = {
        'mapbox/walking': 5, // 5 km/h
        'mapbox/cycling': 15, // 15 km/h
        'mapbox/driving': 40, // 40 km/h
        'mapbox/driving-traffic': 30, // 30 km/h
      }[profile] || 30;

      const timeMinutes = Math.round((distanceKm / speed) * 60);
      return `${distanceKm.toFixed(1)}km (${timeMinutes} min)`;
    }

    return `${distanceKm.toFixed(1)}km`;
  }, []);

  /**
   * Clear POI results
   */
  const clearPOIs = useCallback(() => {
    setPois([]);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    pois,
    calculateDistance,
    geocodeLocation,
    findNearbyPOIs,
    filterPropertiesByProximity,
    filterPropertiesByIsochrone,
    formatDistance,
    clearPOIs,
  };
}
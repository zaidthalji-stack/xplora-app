import { useState } from 'react';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmFpdGFrIiwiYSI6ImNtZ2o5YWN3djBjdTcybXF3MjNlOGFwaHAifQ.fZik8fQ5NvQZngIxCgaB6w';

/**
 * Isochrone profiles - same as routing profiles
 */
export type IsochroneProfile = 
  | 'mapbox/driving-traffic'
  | 'mapbox/driving'
  | 'mapbox/walking'
  | 'mapbox/cycling';

/**
 * Contour types
 */
export type ContourType = 'isodistance' | 'isochrone';

/**
 * Isochrone response
 */
export interface IsochroneResult {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
    properties: {
      fill: string;
      fillOpacity: number;
      fillColor: string;
      color: string;
      contour: number;
      metric: string;
      opacity: number;
    };
  }>;
}

/**
 * Hook for fetching isochrone/isodistance data
 * 
 * Isochrone: Shows area reachable within X minutes
 * Isodistance: Shows area reachable within X meters
 * 
 * @example
 * const isochrone = useIsochrone();
 * 
 * // Show areas within 5, 10, 15 minutes driving
 * const result = await isochrone.fetchIsochrone({
 *   location: { latitude: 25.2048, longitude: 55.2708 },
 *   profile: 'mapbox/driving-traffic',
 *   contours: [5, 10, 15],
 *   contoursType: 'isochrone'
 * });
 */
export function useIsochrone() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IsochroneResult | null>(null);

  /**
   * Fetch isochrone or isodistance - FIXED naming conflict
   */
const fetchIsochrone = async ({
  location,
  profile = 'mapbox/driving-traffic',
  contours = [5, 10, 15],
  contoursType = 'isochrone',
  polygons = true,
  denoise = 1,
  generalize = 1,
}: {
  location: { latitude: number; longitude: number };
  profile?: IsochroneProfile;
  contours?: number[];
  contoursType?: ContourType;
  polygons?: boolean;
  denoise?: number;
  generalize?: number;
}) => {
  setIsLoading(true);
  setError(null);
  try {
    // ✅ FIX: Use correct Mapbox parameter names
    const contoursParam = contoursType === 'isochrone' 
      ? `contours_minutes=${contours.join(',')}`
      : `contours_meters=${contours.join(',')}`;
    
    // Format: GET /isochrone/v1/{profile}/{coordinates}
    const url = `https://api.mapbox.com/isochrone/v1/${profile}/${location.longitude},${location.latitude}?${contoursParam}&polygons=${polygons}&denoise=${denoise}&generalize=${generalize}&access_token=${MAPBOX_TOKEN}`;
    
    console.log(`🗺️ Fetching ${contoursType} for ${profile}...`);
    console.log(`📍 Contours: ${contours.join(', ')} ${contoursType === 'isochrone' ? 'minutes' : 'meters'}`);
    console.log(`📡 URL: ${url}`); // Debug: see the full URL
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Mapbox API error ${response.status}:`, errorText);
      throw new Error(`Mapbox API error: ${response.status} - ${errorText}`);
    }
    
    const data: IsochroneResult = await response.json();
    
    if (data.type === 'FeatureCollection' && data.features) {
      console.log(`✅ Received ${data.features.length} contours`);
      setResult(data);
      setIsLoading(false);
      return data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch isochrone';
    console.error('❌ Isochrone error:', errorMessage);
    setError(errorMessage);
    setIsLoading(false);
    return null;
  }
};
  /**
   * Clear current result
   */
  const clear = () => {
    setResult(null);
    setError(null);
  };

  return {
    fetchIsochrone, // Changed from 'fetch' to avoid conflict
    clear,
    isLoading,
    error,
    result,
  };
}

/**
 * Helper to get colors for isochrone contours
 * Returns progressively transparent colors for layering
 */
export function getIsochroneColors(count: number, baseColor = '#3B82F6'): string[] {
  const opacities = [0.6, 0.4, 0.2]; // Innermost to outermost
  
  return Array.from({ length: count }, (_, i) => {
    const opacity = opacities[i] || 0.1;
    return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  });
}

/**
 * Helper to check if a point is within an isochrone polygon
 */
export function isPointInIsochrone(
  point: { latitude: number; longitude: number },
  isochrone: IsochroneResult
): boolean {
  // Use largest contour (last feature)
  const largestContour = isochrone.features[isochrone.features.length - 1];
  
  if (!largestContour || !largestContour.geometry) return false;

  const polygon = largestContour.geometry.coordinates[0];
  const [lon, lat] = [point.longitude, point.latitude];

  // Ray casting algorithm
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
}
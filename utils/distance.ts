// ══════════════════════════════════════════════════════════════════════════
// DISTANCE UTILITIES
// Calculate and format distances between coordinates
// ══════════════════════════════════════════════════════════════════════════

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for human-readable display
 * @param distanceKm Distance in kilometers
 * @returns Formatted string (e.g., "500m away" or "2.3km away")
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 0.1) {
    return 'Less than 100m away';
  }
  
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  }
  
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km away`;
  }
  
  return `${Math.round(distanceKm)}km away`;
};

/**
 * Format distance for compact display (no "away")
 * @param distanceKm Distance in kilometers
 * @returns Formatted string (e.g., "500m" or "2.3km")
 */
export const formatDistanceCompact = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  }
  
  return `${Math.round(distanceKm)}km`;
};

/**
 * Calculate distance from user location to property
 * @param userLocation User's current location
 * @param property Property object with Latitude/Longitude
 * @returns Distance in kilometers, or null if locations invalid
 */
export const calculatePropertyDistance = (
  userLocation: { latitude: number; longitude: number } | null | undefined,
  property: { Latitude: number; Longitude: number }
): number | null => {
  if (!userLocation || !property) {
    return null;
  }
  
  if (!property.Latitude || !property.Longitude) {
    return null;
  }
  
  return calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    property.Latitude,
    property.Longitude
  );
};

/**
 * Sort properties by distance from user location (closest first)
 * @param properties Array of properties
 * @param userLocation User's current location
 * @returns Sorted array of properties with distance field added
 */
export const sortPropertiesByDistance = (
  properties: any[],
  userLocation: { latitude: number; longitude: number } | null
): any[] => {
  if (!userLocation || !properties) {
    return properties;
  }
  
  return properties
    .map(property => ({
      ...property,
      distanceKm: calculatePropertyDistance(userLocation, property),
    }))
    .sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
};
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/supabase/client';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmFpdGFrIiwiYSI6ImNtZ2o5YWN3djBjdTcybXF3MjNlOGFwaHAifQ.fZik8fQ5NvQZngIxCgaB6w';

interface PropertyLocation {
  Property_ID: string;
  Location: string;
  Community: string;
  Building_Name: string;
  Property_Type: string;
  Transaction_Type: string;
  Price: number;
  Bedrooms: number;
  Bathrooms: number;
  Latitude: number;
  Longitude: number;
}

interface LocationSuggestion {
  id: string;
  type: 'location' | 'property' | 'place' | 'address' | 'poi';
  title: string;
  subtitle: string;
  location: string;
  coordinates?: [number, number];
  property?: PropertyLocation;
  placeType?: string;
}

type FilterType = 'all' | 'buy' | 'rent';

// Common Dubai POIs that should be prioritized
const DUBAI_POIS = [
  { name: 'Dubai Mall', coords: [55.2796, 25.1972] },
  { name: 'Mall of the Emirates', coords: [55.2008, 25.1180] },
  { name: 'Dubai Hills Mall', coords: [55.2456, 25.1115] },
  { name: 'Dubai Marina Mall', coords: [55.1394, 25.0805] },
  { name: 'Ibn Battuta Mall', coords: [55.1183, 25.0444] },
  { name: 'City Centre Deira', coords: [55.3294, 25.2522] },
  { name: 'Burj Khalifa', coords: [55.2744, 25.1972] },
  { name: 'Atlantis The Palm', coords: [55.1167, 25.1308] },
];

export function useLocationSearch() {
  const [properties, setProperties] = useState<PropertyLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingMapbox, setIsSearchingMapbox] = useState(false);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const { data, error } = await supabase
          .from('properties_data')
          .select(`
            Property_ID,
            Location,
            Community,
            Building_Name,
            Property_Type,
            Transaction_Type,
            Price,
            Bedrooms,
            Bathrooms,
            Latitude,
            Longitude
          `)
          .not('Latitude', 'is', null)
          .not('Longitude', 'is', null)
          .not('Location', 'is', null);

        if (error) throw error;

        const mappedData = data?.map(property => ({
          Property_ID: property.Property_ID,
          Location: property.Location,
          Community: property.Community,
          Building_Name: property.Building_Name,
          Property_Type: property.Property_Type,
          Transaction_Type: property.Transaction_Type,
          Price: property.Price,
          Bedrooms: property.Bedrooms,
          Bathrooms: property.Bathrooms,
          Latitude: property.Latitude,
          Longitude: property.Longitude,
        })) || [];

        setProperties(mappedData);
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProperties();
  }, []);

  /**
   * 🎯 Check hardcoded POI list first
   */
  const searchHardcodedPOIs = (query: string): LocationSuggestion[] => {
    const searchTerm = query.toLowerCase().trim();
    return DUBAI_POIS
      .filter(poi => poi.name.toLowerCase().includes(searchTerm))
      .map(poi => ({
        id: `poi-${poi.name.replace(/\s/g, '-')}`,
        type: 'poi' as const,
        title: poi.name,
        subtitle: 'Point of Interest in Dubai',
        location: `${poi.name}, Dubai`,
        coordinates: poi.coords as [number, number],
      }));
  };

  /**
   * 🌍 Search Mapbox for locations (UAE only)
   */
  const searchMapboxPlaces = async (query: string): Promise<LocationSuggestion[]> => {
    if (!query.trim() || query.length < 3) return [];

    try {
      setIsSearchingMapbox(true);

      const proximity = '55.2708,25.2048'; // Dubai center
      const bbox = '51.5,22.5,56.5,26.5'; // UAE bounding box

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${MAPBOX_TOKEN}` +
        `&proximity=${proximity}` +
        `&bbox=${bbox}` + // Limit to UAE
        `&country=AE` + // Only UAE results
        `&limit=8` +
        `&language=en` +
        `&fuzzyMatch=true` +
        `&types=poi,address,place,locality,neighborhood`;

      console.log('🔍 Searching Mapbox:', query);
      const response = await fetch(url);
      const data = await response.json();

      if (!data.features) return [];

      console.log(`✅ Found ${data.features.length} Mapbox results`);

      const suggestions: LocationSuggestion[] = data.features.map((feature: any) => {
        const [lng, lat] = feature.center;
        const placeType = feature.place_type?.[0] || 'place';
        
        let type: LocationSuggestion['type'] = 'place';
        if (placeType === 'poi') type = 'poi';
        if (placeType === 'address') type = 'address';

        // Better subtitle formatting
        const context = feature.context || [];
        const place = context.find((c: any) => c.id.includes('place'));
        const subtitle = place ? `${feature.text}, ${place.text}` : feature.place_name;

        return {
          id: `mapbox-${feature.id}`,
          type,
          title: feature.text || feature.place_name,
          subtitle: subtitle,
          location: feature.place_name,
          coordinates: [lng, lat],
          placeType,
        };
      });

      return suggestions;
    } catch (error) {
      console.error('Mapbox geocoding error:', error);
      return [];
    } finally {
      setIsSearchingMapbox(false);
    }
  };

  /**
   * 🏠 Search local property database
   */
  const searchLocalProperties = (query: string, filterType: FilterType): LocationSuggestion[] => {
    if (!query.trim() || query.length < 2) return [];

    const searchTerm = query.toLowerCase().trim();
    const suggestions: LocationSuggestion[] = [];
    const seenLocations = new Set<string>();

    const filteredProperties = properties.filter(property => {
      if (filterType === 'all') return true;
      
      const transactionType = property.Transaction_Type?.toLowerCase() || '';
      const isForSale = transactionType.includes('sale') || transactionType.includes('buy');
      
      return filterType === 'buy' ? isForSale : !isForSale;
    });

    filteredProperties.forEach(property => {
      const location = property.Location?.toLowerCase() || '';
      const community = property.Community?.toLowerCase() || '';
      const buildingName = property.Building_Name?.toLowerCase() || '';

      const matches = [
        location.includes(searchTerm),
        community.includes(searchTerm),
        buildingName.includes(searchTerm)
      ].some(Boolean);

      if (matches) {
        const locationKey = property.Location || property.Community;
        if (locationKey && !seenLocations.has(locationKey)) {
          seenLocations.add(locationKey);
          suggestions.push({
            id: `location-${locationKey}`,
            type: 'location',
            title: locationKey,
            subtitle: 'Property Area in Dubai',
            location: locationKey,
            coordinates: [property.Longitude, property.Latitude]
          });
        }

        if (property.Building_Name) {
          const transactionType = property.Transaction_Type?.toLowerCase() || '';
          const isForSale = transactionType.includes('sale') || transactionType.includes('buy');
          const propertyType = isForSale ? 'For Sale' : 'For Rent';
          
          suggestions.push({
            id: `property-${property.Property_ID}`,
            type: 'property',
            title: property.Building_Name,
            subtitle: `${property.Property_Type} ${propertyType} in ${property.Location}`,
            location: property.Location || '',
            coordinates: [property.Longitude, property.Latitude],
            property
          });
        }
      }
    });

    return suggestions.slice(0, 5);
  };

  /**
   * 🎯 COMBINED SEARCH with priority:
   * 1. Hardcoded Dubai POIs (instant)
   * 2. Local property areas
   * 3. Local properties
   * 4. Mapbox places (UAE only)
   */
  const searchLocations = useMemo(() => {
    return async (query: string, filterType: FilterType = 'all'): Promise<LocationSuggestion[]> => {
      if (!query.trim() || query.length < 2) return [];

      console.log('🔍 Searching for:', query);

      // 1. Check hardcoded POIs first (instant, 100% accurate)
      const hardcodedPOIs = searchHardcodedPOIs(query);
      console.log(`📍 Found ${hardcodedPOIs.length} hardcoded POIs`);

      // 2. Search local properties (instant)
      const localResults = searchLocalProperties(query, filterType);
      console.log(`🏠 Found ${localResults.length} local results`);

      // 3. Search Mapbox places (async, UAE only)
      const mapboxResults = await searchMapboxPlaces(query);
      console.log(`🗺️ Found ${mapboxResults.length} Mapbox results`);

      // Combine with priority
      const combined = [
        ...hardcodedPOIs,                                    // Priority 1: Known POIs
        ...localResults.filter(s => s.type === 'location'), // Priority 2: Property areas
        ...localResults.filter(s => s.type === 'property'), // Priority 3: Properties
        ...mapboxResults                                     // Priority 4: Other places
      ];

      // Remove duplicates by coordinates
      const unique = combined.reduce((acc: LocationSuggestion[], curr) => {
        const isDuplicate = acc.some(item => {
          if (!item.coordinates || !curr.coordinates) return false;
          const [lng1, lat1] = item.coordinates;
          const [lng2, lat2] = curr.coordinates;
          return Math.abs(lng1 - lng2) < 0.001 && Math.abs(lat1 - lat2) < 0.001;
        });
        if (!isDuplicate) acc.push(curr);
        return acc;
      }, []);

      console.log(`✅ Returning ${unique.length} total results`);
      return unique.slice(0, 10);
    };
  }, [properties]);

  return {
    searchLocations,
    isLoading,
    isSearchingMapbox,
    properties
  };
}
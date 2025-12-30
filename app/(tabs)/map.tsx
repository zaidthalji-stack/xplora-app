import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Crosshair, Search, X, Compass, Chrome as Home, Key, LayoutGrid, Building2, User, Box, Navigation, RefreshCw, MapPin } from 'lucide-react-native';
import useLocation from '@/hooks/useLocation';
import { useNavigation } from '@/hooks/useNavigation';
import { NavigationPanel } from '@/components/NavigationPanel';
import { Speedometer } from '@/components/Speedometer';
import { useProperties } from '@/hooks/useProperties';
import { isBinghattiProperty } from '@/utils/developerLogos';
import { BinghattiMarker } from '@/components/BinghattiMarker';
import { useLocationSearch } from '@/hooks/useLocationSearch';
import { LocationSearchDropdown } from '@/components/LocationSearchDropdown';
import Supercluster from 'supercluster';
import { PropertyBottomSheet } from '@/components/PropertyBottomSheet';
import { CompactPropertyCard } from '@/components/CompactPropertyCard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePropertyContext } from '@/context/PropertyContext';
import { useNearMe, type NearMeAction } from '@/hooks/useNearMe';
import { useIsochrone } from '@/hooks/useIsochrone';

// Import Three.js and Mapbox for 3D model (only works on web)
let Map: any = null;
let Marker: any = null;
let Source: any = null;
let Layer: any = null;
let THREE: any = null;
let GLTFLoader: any = null;
let DRACOLoader: any = null;
let mapboxgl: any = null;

if (Platform.OS === 'web') {
  try {
    const mapgl = require('react-map-gl');
    Map = mapgl.default;
    Marker = mapgl.Marker;
    Source = mapgl.Source;
    Layer = mapgl.Layer;
    
    THREE = require('three');
    const loaders = require('three/examples/jsm/loaders/GLTFLoader.js');
    const dracoLoaders = require('three/examples/jsm/loaders/DRACOLoader.js');
    GLTFLoader = loaders.GLTFLoader;
    DRACOLoader = dracoLoaders.DRACOLoader;
    mapboxgl = require('mapbox-gl');
    require('mapbox-gl/dist/mapbox-gl.css');
  } catch (error) {
    console.log('Three.js or Mapbox not available:', error);
  }
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmFpdGFrIiwiYSI6ImNtZ2o5YWN3djBjdTcybXF3MjNlOGFwaHAifQ.fZik8fQ5NvQZngIxCgaB6w';
const INITIAL_COORDS = {
  longitude: 55.139841,
  latitude: 25.074224,
};

type FilterType = 'all' | 'buy' | 'rent' | 'binghatti';

const formatPrice = (price: number) => {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M`;
  }
  return `${Math.round(price / 1000)}k`;
};

const getPOIIcon = (category: string): string => {
  const icons: Record<string, string> = {
    restaurants: '🍽️',
    coffee: '☕',
    bars: '🍺',
    hotels: '🏨',
    atm: '🏧',
    hospital: '🏥',
    pharmacy: '💊',
    school: '🏫',
    supermarket: '🛒',
    shopping: '🛍️',
    park: '🌳',
    gym: '💪',
    mosque: '🕌',
    metro_station: '🚇',
    bus_stop: '🚌',
    fuel: '⛽',
    parking: '🅿️',
  };
  return icons[category] || '📍';
};

export default function MapScreen() {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const { location, errorMsg, otherUsers } = useLocation();
  const { properties, binghattiCount, openHouseCount, isLoading } = useProperties();
  const [showBinghattiLogos, setShowBinghattiLogos] = useState(true);

  // 3D Model states
  const [show3DModel, setShow3DModel] = useState(false);
  const model3DLayerRef = useRef<any>(null);
  const threeSceneRef = useRef<any>(null);
  const threeModelRef = useRef<any>(null);

  // Near Me states
  const [nearMeAction, setNearMeAction] = useState<NearMeAction | null>(null);
  const [searchRadiusCircle, setSearchRadiusCircle] = useState<any>(null); 
  const [isochroneData, setIsochroneData] = useState<any>(null);
  const nearMe = useNearMe();
  const isochrone = useIsochrone();
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);

  useEffect(() => {
    console.log('Properties loaded:', properties?.length);
    console.log('Is loading:', isLoading);
    console.log('Sample property:', properties?.[0]);
  }, [properties, isLoading]);

  const [followUser, setFollowUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // AIRBNB-STYLE STATE MANAGEMENT - Single property state
  const [selectedProperty, setSelectedProperty] = useState<any>(null); // For PropertyBottomSheet only

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [chatFilterIds, setChatFilterIds] = useState<string[] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [isStreetView, setIsStreetView] = useState(false);

  // Animation for property card transitions
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const {
    selectedProperty: contextSelectedProperty,
    highlightedProperties,
    setSelectedProperty: setContextProperty,
    clearSelection
  } = usePropertyContext();

  const { searchLocations } = useLocationSearch();
  const params = useLocalSearchParams();
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const lastNavigationKey = useRef<string | null>(null);

  // Turn-by-Turn Navigation Hook
  const navigation = useNavigation(location, mapRef);
  const [actualSearchRadiusKm, setActualSearchRadiusKm] = useState<number | null>(null);
  const [showRadiusToggle, setShowRadiusToggle] = useState(false);
  const [userRadiusCircle, setUserRadiusCircle] = useState<any>(null);
  const [userRadiusKm, setUserRadiusKm] = useState(2); // Default 2km for user toggle
  const [showRadiusOptions, setShowRadiusOptions] = useState(false);


  useEffect(() => {
    console.log('Map params received:', {
      lat: params.lat,
      lng: params.lng,
      zoom: params.zoom,
      showMultiple: params.showMultiple,
      propertyIds: params.propertyIds,
      propertyIdsType: typeof params.propertyIds,
      near_me_action: params.near_me_action,
    });
  }, [params]);

  const [viewport, setViewport] = useState({
    latitude: params.lat ? parseFloat(params.lat as string) : INITIAL_COORDS.latitude,
    longitude: params.lng ? parseFloat(params.lng as string) : INITIAL_COORDS.longitude,
    zoom: params.zoom ? parseFloat(params.zoom as string) : 18,
    pitch: 60,
    bearing: 0,
  });

  useEffect(() => {
    if (params.type) {
      setFilterType(params.type as FilterType);
    }
  }, [params.type]);

  useEffect(() => {
    if (params.propertyIds && typeof params.propertyIds === 'string') {
      const ids = params.propertyIds.split(',').filter(id => id.trim());
      console.log('Chat filter activated with', ids.length, 'property IDs:', ids);
      setChatFilterIds(ids);
    } else if (params.showMultiple === 'false' || !params.showMultiple) {
      console.log('No propertyIds in params, clearing chat filter');
      setChatFilterIds(null);
    }
  }, [params.propertyIds, params.showMultiple]);

  // Handle near_me_action from chat
  useEffect(() => {
    if (params.near_me_action) {
      try {
        const action = typeof params.near_me_action === 'string' 
          ? JSON.parse(params.near_me_action)
          : params.near_me_action;
        
        console.log('Near Me action received:', action);
        handleNearMeAction(action);
      } catch (error) {
        console.error('Error parsing near_me_action:', error);
      }
    }
  }, [params.near_me_action]);

  useEffect(() => {
    if (params.lat && params.lng) {
      const lat = parseFloat(params.lat as string);
      const lng = parseFloat(params.lng as string);
      const zoom = params.zoom ? parseFloat(params.zoom as string) : 16.5;
      const navigationKey = `${lat}-${lng}-${zoom}-${params.propertyId || ''}-${params.showMultiple || ''}`;

      if (navigationKey !== lastNavigationKey.current) {
        console.log('Navigating to:', { lat, lng, zoom, propertyId: params.propertyId, showMultiple: params.showMultiple });
        lastNavigationKey.current = navigationKey;
        setViewport({
          ...viewport,
          latitude: lat,
          longitude: lng,
          zoom: zoom,
          pitch: 60,
        });
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: zoom,
            pitch: 60,
            duration: 300,
          });
        }
        setFollowUser(false);
      }
    }
  }, [params.lat, params.lng, params.zoom, params.propertyId, params.showMultiple]);

  useEffect(() => {
    if (followUser && location && !navigation.isNavigating) {
      const newViewport = {
        ...viewport,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setViewport(newViewport);
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [location.coords.longitude, location.coords.latitude],
          duration: 300,
        });
      }
    }
  }, [location, followUser, navigation.isNavigating]);

  useEffect(() => {
    if (contextSelectedProperty && params.propertyId) {
      console.log('Opening property from chat:', contextSelectedProperty.Property_ID);
      setSelectedProperty(contextSelectedProperty);
    }
  }, [contextSelectedProperty, params.propertyId]);

  useEffect(() => {
    if (highlightedProperties.length > 0 && params.showMultiple === 'true') {
      console.log(`Highlighting ${highlightedProperties.length} properties from chat`);
    }
  }, [highlightedProperties, params.showMultiple]);

  // Automatic immersive 3D view during navigation
  useEffect(() => {
    if (!mapRef.current) return;
    if (navigation.isNavigating) {
      console.log('Entering Mapbox Navigation SDK camera mode');
      mapRef.current.easeTo({
        pitch: 60,
        zoom: 18,
        duration: 1500,
        essential: true,
      });
    } else {
      console.log('Returning to explore mode');
      mapRef.current.easeTo({
        pitch: 60,
        zoom: 18,
        bearing: 0,
        duration: 1000,
      });
    }
  }, [navigation.isNavigating]);

  // Auto-enable street view and 3D during navigation
  useEffect(() => {
    if (navigation.isNavigating) {
      console.log('Enabling immersive navigation mode');
      setIsStreetView(true);
      if (Platform.OS === 'web') {
        setShow3DModel(true);
      }
    }
  }, [navigation.isNavigating]);

  // Handle user interaction with map
  const handleMapMove = useCallback(() => {
    if (followUser && !navigation.isNavigating) {
      setFollowUser(false);
      console.log('User moved map - follow mode disabled');
    }

 if (navigation.isNavigating && navigation.onUserInteraction) {
    navigation.onUserInteraction();
  }
}, [followUser, navigation]);

  // Helper to create circle GeoJSON
  const createCircle = useCallback((center: [number, number], radiusKm: number) => {
    const points = 64;
    const coords = [];
    const distanceX = radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
    const distanceY = radiusKm / 110.574;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      coords.push([center[0] + x, center[1] + y]);
    }
    coords.push(coords[0]); // Close the circle

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    };
  }, []);

  // Handle Near Me actions
const handleNearMeAction = async (action: NearMeAction) => {
  setNearMeAction(action);
  setActualSearchRadiusKm(action.radius_km || 2);

  // Determine center point (SEARCH LOCATION, not user location)
  let centerCoords: [number, number] | null = null;

  if (action.use_user_location && location?.coords) {
    centerCoords = [location.coords.longitude, location.coords.latitude];
    console.log('✅ Using user location for search:', centerCoords);
  } else if (action.center) {
    if (typeof action.center === 'string') {
      console.log('🗺️ Geocoding search location:', action.center);
      centerCoords = await nearMe.geocodeLocation(action.center);
      console.log('✅ Geocoded to:', centerCoords);
    } else {
      centerCoords = action.center;
    }
  }

  if (!centerCoords) {
    console.error('❌ Could not determine center coordinates');
    return;
  }

  console.log('🎯 Search center determined:', {
    coords: centerCoords,
    radius: action.radius_km || 2,
    source: action.use_user_location ? 'USER_GPS' : 'LANDMARK'
  });

  // Check if we have property IDs from chat (PRIORITY)
  if (params.propertyIds && typeof params.propertyIds === 'string') {
    const chatPropertyIds = params.propertyIds.split(',').filter(id => id.trim());
    console.log('✅ Using property IDs from chat:', chatPropertyIds.length);
    
    setChatFilterIds(chatPropertyIds);
    
    if (properties) {
      const filteredByProximity = nearMe.filterPropertiesByProximity(
        properties, 
        centerCoords,
        action.radius_km || 2
      );
      
      const finalFiltered = filteredByProximity.filter(p => 
        chatPropertyIds.includes(p.Property_ID)
      );
      
      console.log(`📍 Final: ${finalFiltered.length} properties (chat + proximity)`);
    }
  } else {
    console.log('📍 No chat filter - using proximity only');
    
    switch (action.type) {
      case 'proximity_search':
        await handleProximitySearch(centerCoords, action.radius_km || 2);
        break;

      case 'isochrone_search':
        await handleIsochroneSearch(
          centerCoords,
          action.time_minutes || [10],
          action.profile || 'mapbox/driving-traffic'
        );
        break;

      case 'find_nearby_pois':
        await handleFindPOIs(centerCoords, action.categories || [], action.radius_km || 1);
        break;
    }
  }

  // Position map camera with proper error handling
  if (mapRef.current) {
    try {
      const map = mapRef.current.getMap();
      
      if (map && typeof map.getStyle === 'function') {
        const style = map.getStyle();
        
        if (style && style.layers && Array.isArray(style.layers)) {
          style.layers.forEach((layer: any) => {
            if (layer && layer.id && (
                layer.id.includes('traffic') ||
                layer.id.includes('congestion') ||
                layer['source-layer'] === 'traffic')) {
              try {
                map.setLayoutProperty(layer.id, 'visibility', 'visible');
                console.log('✅ Traffic layer enabled for Near Me:', layer.id);
              } catch (error) {
                console.log('Could not enable traffic layer:', layer.id);
              }
            }
          });
        }
      }
    } catch (error) {
      console.warn('Could not access map style in handleNearMeAction:', error);
    }

    // Fly to SEARCH CENTER (not user location)
    console.log('✈️ Flying to search center:', centerCoords);
    mapRef.current.flyTo({
      center: centerCoords,
      zoom: action.type === 'proximity_search' ? 13 : 14,
      pitch: 50,
      bearing: 0,
      duration: 1500,
    });

    // ✅ CREATE SEARCH RADIUS CIRCLE (at search location)
    if (action.type === 'proximity_search' && action.radius_km) {
      const circle = createCircle(centerCoords, action.radius_km);
      setSearchRadiusCircle(circle); // ✅ Use searchRadiusCircle
      console.log('✅ Search radius circle created at:', centerCoords, 'with radius:', action.radius_km, 'km');
    }

    console.log('✅ Near Me camera positioned with filters applied');
  }
};

// ══════════════════════════════════════════════════════════════════════════
// STEP 3: Update handleProximitySearch - Use searchRadiusCircle
// Replace around line ~460
// ══════════════════════════════════════════════════════════════════════════

const handleProximitySearch = async (center: [number, number], radiusKm: number) => {
  console.log(`🔍 Proximity search: ${radiusKm}km radius at`, center);

  // ✅ Create SEARCH circle at the passed center (not user location)
  const circle = createCircle(center, radiusKm);
  setSearchRadiusCircle(circle); // ✅ Use searchRadiusCircle
  
  console.log('✅ Search circle created at:', center);

  // Filter properties
  if (properties) {
    const filtered = nearMe.filterPropertiesByProximity(properties, center, radiusKm);
    console.log(`✅ Found ${filtered.length} properties within ${radiusKm}km`);

    setChatFilterIds(filtered.map(p => p.Property_ID));
  }
};

  // Isochrone search (time-based)
  const handleIsochroneSearch = async (
    center: [number, number],
    timeMinutes: number[],
    profile: string
  ) => {
    console.log(`🕐 Isochrone search: ${timeMinutes.join(', ')} minutes`);

    const result = await isochrone.fetchIsochrone({
      location: { latitude: center[1], longitude: center[0] },
      profile: profile as any,
      contours: timeMinutes,
      contoursType: 'isochrone',
    });

    if (result) {
      setIsochroneData(result);

      // Filter properties within the largest isochrone
      const largestContour = result.features[result.features.length - 1];
      if (largestContour && properties) {
        const filtered = nearMe.filterPropertiesByIsochrone(
          properties,
          largestContour.geometry.coordinates
        );
        console.log(`Found ${filtered.length} properties within ${timeMinutes[timeMinutes.length - 1]} min`);
        setChatFilterIds(filtered.map(p => p.Property_ID));
      }
    }
  };

  // Find POIs
  const handleFindPOIs = async (
    center: [number, number],
    categories: string[],
    radiusKm: number
  ) => {
    console.log(`📍 Finding POIs: ${categories.join(', ')}`);

    const pois = await nearMe.findNearbyPOIs(center, categories, radiusKm);
    console.log(`Found ${pois.length} POIs`);
  };

const handleRadiusToggle = () => {
  if (!location) {
    console.warn('User location not available');
    return;
  }

  const centerCoords: [number, number] = [
    location.coords.longitude,
    location.coords.latitude
  ];

  if (showRadiusToggle) {
    // Hide circle + close panel
    setUserRadiusCircle(null);
    setShowRadiusToggle(false);
    setShowRadiusOptions(false);  // ✅ Close panel
    console.log('❌ User exploration circle hidden');
  } else {
    // Show circle + open panel
    const circle = createCircle(centerCoords, userRadiusKm);
    setUserRadiusCircle(circle);
    setShowRadiusToggle(true);
    setShowRadiusOptions(true);  // ✅ Open panel
    
    console.log('✅ User exploration circle created');
    
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: centerCoords,
        zoom: userRadiusKm <= 1 ? 14 : userRadiusKm <= 3 ? 13 : 12,
        duration: 1000,
      });
    }
  }
};

const handleRadiusChange = (newRadius: number) => {
  setUserRadiusKm(newRadius);
  
  if (showRadiusToggle && location) {
    const centerCoords: [number, number] = [
      location.coords.longitude,
      location.coords.latitude
    ];
    const circle = createCircle(centerCoords, newRadius);
    setUserRadiusCircle(circle);
    console.log('✅ Updated to:', newRadius, 'km');
    
    // ✅ AUTO-CLOSE panel after selection
    setShowRadiusOptions(false);
    
    // Haptic feedback
    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.log('Haptics not available');
    }
  }
};

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    console.log('Filter check:', {
      highlightedPropsCount: highlightedProperties?.length || 0,
      chatFilterIdsCount: chatFilterIds?.length || 0,
      filterType,
      totalProps: properties.length,
    });

    if (highlightedProperties && highlightedProperties.length > 0) {
      console.log('Using highlightedProperties from context:', highlightedProperties.length);
      const highlightedIds = highlightedProperties.map(p => p.Property_ID);
      const contextFiltered = properties.filter(p => highlightedIds.includes(p.Property_ID));
      console.log(`Filtered to ${contextFiltered.length} highlighted properties`);
      return contextFiltered;
    }

    if (chatFilterIds && chatFilterIds.length > 0) {
      console.log('Using chatFilterIds from params:', chatFilterIds.length);
      const chatProperties = properties.filter(property =>
        chatFilterIds.includes(property.Property_ID)
      );
      console.log(`Filtered to ${chatProperties.length} chat properties from params`);
      if (chatProperties.length === 0) {
        console.warn('No matching properties found in database for chat IDs:', chatFilterIds);
      }
      return chatProperties;
    }

    console.log('Using regular filter:', filterType);

    if (filterType === 'binghatti') {
      return properties.filter(property => isBinghattiProperty(property));
    }
    if (filterType === 'all') return properties;
    return properties.filter(property => {
      const transactionType = property.Transaction_Type?.toLowerCase() || '';
      const isForSale = transactionType.includes('sale') || transactionType.includes('buy');
      return filterType === 'buy' ? isForSale : !isForSale;
    });
  }, [properties, filterType, chatFilterIds, highlightedProperties]);

  const clusters = useMemo(() => {
    if (!filteredProperties || filteredProperties.length === 0) return [];

    const binghattiProps = filteredProperties.filter(p => isBinghattiProperty(p));
    const regularProps = filteredProperties.filter(p => !isBinghattiProperty(p));

    const regularIndex = new Supercluster({
      radius: viewport.zoom >= 17 ? 30 : 60,
      maxZoom: 16,
      minZoom: 0,
      extent: 512,
      nodeSize: 64,
    });

   const binghattiIndex = new Supercluster({
  radius: () => {
    if (viewport.zoom >= 17) return 40;
    if (viewport.zoom >= 12) return 120;
    return 250;
  },
  maxZoom: 1000,   // ← Totally fine!
  minZoom: 0,
  extent: 512,
  nodeSize: 64,
});

    if (regularProps.length > 0) {
      regularIndex.load(
        regularProps.map((property) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [property.Longitude, property.Latitude],
          },
          properties: { ...property, isBinghattiCluster: false },
        }))
      );
    }

    if (binghattiProps.length > 0) {
      binghattiIndex.load(
        binghattiProps.map((property) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [property.Longitude, property.Latitude],
          },
          properties: { ...property, isBinghattiCluster: true },
        }))
      );
    }

    const boundsPadding = viewport.zoom < 11 ? 0.4 : viewport.zoom < 13 ? 0.25 : viewport.zoom < 15 ? 0.15 : 0.1;
    const bounds = [
      [viewport.longitude - boundsPadding, viewport.latitude - boundsPadding],
      [viewport.longitude + boundsPadding, viewport.latitude + boundsPadding],
    ];

    const regularClusters = regularProps.length > 0
      ? regularIndex.getClusters(
          [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]],
          Math.floor(viewport.zoom)
        )
      : [];

    const binghattiClusters = binghattiProps.length > 0
      ? binghattiIndex.getClusters(
          [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]],
          Math.floor(viewport.zoom)
        )
      : [];

    return [...regularClusters, ...binghattiClusters];
  }, [filteredProperties, viewport.zoom, viewport.latitude, viewport.longitude]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setShowSearchDropdown(false);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          searchQuery
        )}.json?access_token=${MAPBOX_TOKEN}&proximity=${INITIAL_COORDS.longitude},${INITIAL_COORDS.latitude}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setViewport({
          ...viewport,
          longitude: lng,
          latitude: lat,
          zoom: 18,
          pitch: 60,
        });
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 18,
            pitch: 60,
            duration: 300,
          });
        }
      }
    } catch (error) {
      console.error('Error searching location:', error);
    }
  }, [searchQuery, viewport]);

const handleSearchInputChange = async (text: string) => {
  setSearchQuery(text);
  
  if (text.length >= 2) {
    setShowSearchDropdown(true);
    // Call async search and store results in state
    const results = await searchLocations(text, filterType);
    setSearchSuggestions(results);
  } else {
    setShowSearchDropdown(false);
    setSearchSuggestions([]);
  }
};

  const handleLocationSelect = (suggestion: any) => {
    setSearchQuery(suggestion.title);
    setShowSearchDropdown(false);
    setShowSearchOverlay(false);

    if (suggestion.coordinates) {
      const [lng, lat] = suggestion.coordinates;
      setViewport({
        ...viewport,
        longitude: lng,
        latitude: lat,
        zoom: suggestion.type === 'property' ? 18 : 17,
        pitch: 60,
      });
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: suggestion.type === 'property' ? 18 : 17,
          pitch: 60,
          duration: 300,
        });
      }
      if (suggestion.type === 'property' && suggestion.property) {
        setTimeout(() => {
          setSelectedProperty(suggestion.property);
        }, 2000);
      }
    }
  };

  const cyclePropertyType = () => {
    const types: FilterType[] = ['all', 'buy', 'rent'];
    const currentIndex = types.indexOf(filterType);
    const nextType = types[(currentIndex + 1) % types.length];
    setFilterType(nextType);
    const newParams = {
      ...params,
      type: nextType,
    };
    router.setParams(newParams);
  };

  const handleBinghattiLogoClick = useCallback(() => {
    if (filterType === 'binghatti') {
      setFilterType('all');
      router.setParams({ ...params, type: 'all' });
    } else {
      setFilterType('binghatti');
      router.setParams({ ...params, type: 'binghatti' });
    }
  }, [filterType, params, router]);

  // AIRBNB-STYLE: Property selection handler with improved close handling
  const handlePropertySelect = useCallback((property: any) => {
    try {
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      } else if (Platform.OS === 'android') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.log('Haptics not available:', error);
    }

    console.log('Selecting property:', property.Property_ID);
    setSelectedProperty(property);
  }, []);

  // Improved property close handler
  const handlePropertyClose = useCallback(() => {
    console.log('Closing property sheet');
    setSelectedProperty(null);
    if (highlightedProperties.length > 0) {
      setTimeout(() => clearSelection(), 300);
    }
  }, [highlightedProperties, clearSelection]);

  const handleAskAI = (property: any) => {
    console.log('Asking AI about property:', property.Property_ID);
    setContextProperty(property);
    router.push({
      pathname: '/(tabs)',
      params: {
        propertyId: property.Property_ID,
        askAbout: property.Building_Name || property.Location,
      },
    });
  };

  const toggleBinghattiLogos = () => {
    setShowBinghattiLogos(!showBinghattiLogos);
  };

  const resetBearing = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        bearing: 0,
        pitch: 60,
        duration: 300,
      });
    }
  };

  const toggleStreetView = () => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();

      if (isStreetView) {
        console.log('Switching to 2D flat map view');
        mapRef.current.flyTo({
          pitch: 0,
          zoom: 14,
          duration: 300,
        });

        setTimeout(() => {
          if (map.getLayer('3d-buildings')) {
            map.removeLayer('3d-buildings');
            console.log('3D buildings removed');
          }
        }, 350);
      } else {
        console.log('Enabling Mapbox Navigation SDK 3D view');
        mapRef.current.flyTo({
          pitch: 60,
          zoom: 18,
          duration: 300,
        });

        setTimeout(() => {
          if (!map.getLayer('3d-buildings')) {
            const layers = map.getStyle().layers;
            const labelLayerId = layers.find(
              (layer) => layer.type === 'symbol' && layer.layout['text-field']
            )?.id;
            map.addLayer(
              {
                id: '3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 15,
                paint: {
                  'fill-extrusion-color': '#aaa',
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'height'],
                  ],
                  'fill-extrusion-base': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'min_height'],
                  ],
                  'fill-extrusion-opacity': 0.6,
                },
              },
              labelLayerId
            );
            console.log('3D buildings added');
          }
        }, 100);
      }

      setIsStreetView(!isStreetView);
    }
  };

  const getFilterIcon = () => {
    switch (filterType) {
      case 'buy':
        return <Home size={20} color={theme.primary} />;
      case 'rent':
        return <Key size={20} color={theme.primary} />;
      default:
        return <LayoutGrid size={20} color={theme.primary} />;
    }
  };

  const getFilterText = () => {
    switch (filterType) {
      case 'buy':
        return 'Buy';
      case 'rent':
        return 'Rent';
      case 'binghatti':
        return 'Binghatti';
      default:
        return 'All';
    }
  };

  const getMapStyle = () => {
    return isDarkMode
      ? 'mapbox://styles/mapbox/navigation-night-v1'
      : 'mapbox://styles/mapbox/outdoors-v12';
  };

const handleMapLoad = () => {
  if (mapRef.current) {
    try {
      const map = mapRef.current.getMap();
      
      // Check if map and getStyle are available
      if (!map || typeof map.getStyle !== 'function') {
        console.warn('Map or getStyle not available yet');
        return;
      }
      
      const style = map.getStyle();

      // ✅ Enable traffic layer by default (with null checks)
      if (style && style.layers && Array.isArray(style.layers)) {
        style.layers.forEach((layer: any) => {
          if (layer && layer.id && (
              layer.id.includes('traffic') ||
              layer.id.includes('congestion') ||
              layer['source-layer'] === 'traffic')) {
            try {
              map.setLayoutProperty(layer.id, 'visibility', 'visible');
              console.log('✅ Traffic layer enabled:', layer.id);
            } catch (error) {
              console.log('Could not enable traffic layer:', layer.id);
            }
          }
        });
      }

      console.log('Enabling 3D buildings for default explore mode...');

      setTimeout(() => {
        if (!map.getLayer('3d-buildings')) {
          const layers = map.getStyle()?.layers;
          if (layers && Array.isArray(layers)) {
            const labelLayerId = layers.find(
              (layer: any) => layer.type === 'symbol' && layer.layout?.['text-field']
            )?.id;
            
            map.addLayer(
              {
                id: '3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 15,
                paint: {
                  'fill-extrusion-color': '#aaa',
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'height'],
                  ],
                  'fill-extrusion-base': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'min_height'],
                  ],
                  'fill-extrusion-opacity': 0.6,
                },
              },
              labelLayerId
            );
            setIsStreetView(true);
            console.log('3D buildings enabled');
          }
        }
      }, 100);
    } catch (error) {
      console.error('Error in handleMapLoad:', error);
    }
  }
};

  const handleMapError = (error: any) => {
    console.error('Map error:', error);
    setMapError(error.message || 'Failed to load map');
  };

  const getMarkerSize = (zoom: number) => {
    if (zoom < 12) return { padding: 5, fontSize: 9 };
    if (zoom < 14) return { padding: 6, fontSize: 10 };
    if (zoom < 16) return { padding: 7, fontSize: 11 };
    return { padding: 8, fontSize: 12 };
  };

  const markerSize = getMarkerSize(viewport.zoom);

  // ✅ Native Mapbox-style 3D Model Layer with automatic perspective scaling (WEB ONLY)
  const create3DModelLayerDynamic = useCallback((map: any) => {
    if (!THREE || !GLTFLoader || !DRACOLoader || !mapboxgl || Platform.OS !== 'web') {
      console.log('⚠️ Three.js not available or not on web platform');
      return null;
    }

    const MODEL_URL = 'https://srbbuxpndcpeanyzqxva.supabase.co/storage/v1/object/public/models/witheewe.glb';
    const TARGET_LATITUDE = 25.188620898870248;
    const TARGET_LONGITUDE = 55.27988663706024;
    const MODEL_ALTITUDE = 0;
    const MODEL_SCALE = 1;

    return {
      id: '3d-model-layer',
      type: 'custom',
      renderingMode: '3d',
      
      onAdd: function(map: any, gl: WebGLRenderingContext) {
        console.log('🏠 Initializing native Mapbox 3D model layer');
        
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();
        threeSceneRef.current = this.scene;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 300, 100).normalize();
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-100, 100, -100).normalize();
        this.scene.add(fillLight);

        const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
          [TARGET_LONGITUDE, TARGET_LATITUDE],
          MODEL_ALTITUDE
        );
        
        this.modelOrigin = [
          modelAsMercatorCoordinate.x,
          modelAsMercatorCoordinate.y,
          modelAsMercatorCoordinate.z
        ];
        
        this.modelScale = modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * MODEL_SCALE;
        
        console.log('📍 Model origin (Mercator):', this.modelOrigin);
        console.log('📏 Model scale factor:', this.modelScale);

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.setDecoderConfig({ type: 'js' });
        
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        
        console.log('⏳ Loading 3D model...');
        
        let retryCount = 0;
        const maxRetries = 3;
        
        const loadModel = () => {
          loader.load(
            MODEL_URL,
            (gltf: any) => {
              console.log('✅ Model loaded successfully');
              
              const model = gltf.scene;
              
              const box = new THREE.Box3().setFromObject(model);
              const center = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              
              console.log('📦 Model dimensions:', {
                center: `(${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`,
                size: `(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`
              });
              
              model.traverse((child: any) => {
                if (child.isMesh && child.material) {
                  child.material.side = THREE.DoubleSide;
                  child.material.needsUpdate = true;
                  child.castShadow = true;
                  child.receiveShadow = true;
                  
                  if (child.material.metalness !== undefined) {
                    child.material.metalness = Math.min(child.material.metalness * 1.2, 1);
                  }
                  if (child.material.roughness !== undefined) {
                    child.material.roughness = Math.max(child.material.roughness * 0.8, 0.2);
                  }
                }
              });
              
              this.scene.add(model);
              this.model = model;
              threeModelRef.current = model;
              
              console.log('✅ Model added to scene');
              map.triggerRepaint();
            },
            (progress: any) => {
              if (progress.lengthComputable) {
                const percent = (progress.loaded / progress.total) * 100;
                console.log(`⏳ Loading: ${percent.toFixed(1)}%`);
              }
            },
            (error: any) => {
              console.error(`❌ Model load error (attempt ${retryCount + 1}/${maxRetries}):`, error);
              
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`🔄 Retrying in 2 seconds...`);
                setTimeout(loadModel, 2000);
              } else {
                console.error('❌ Failed to load model after', maxRetries, 'attempts');
              }
            }
          );
        };
        
        loadModel();

        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true,
          alpha: true,
          logarithmicDepthBuffer: true,
        });
        
        this.renderer.autoClear = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        console.log('✅ Renderer ready');
      },
      
      render: function(gl: WebGLRenderingContext, matrix: number[]) {
        if (!this.renderer || !this.scene || !this.camera || !this.model) return;

        const m = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4()
          .makeTranslation(
            this.modelOrigin[0],
            this.modelOrigin[1], 
            this.modelOrigin[2]
          )
          .scale(
            new THREE.Vector3(
              this.modelScale,
              -this.modelScale,
              this.modelScale
            )
          )
          .multiply(
            new THREE.Matrix4().makeRotationAxis(
              new THREE.Vector3(1, 0, 0),
              Math.PI / 2
            )
          );

        this.camera.projectionMatrix = m.multiply(l);

        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        
        map.triggerRepaint();
      }
    };
  }, []);

  const toggle3DModel = useCallback(() => {
    if (Platform.OS !== 'web') {
      console.warn('⚠️ 3D Model viewer only available on web platform');
      return;
    }

    if (!mapRef.current) return;

    const map = mapRef.current.getMap();

    if (!show3DModel) {
      console.log('🏠 Showing native Mapbox-style 3D model');
      
      const layer = create3DModelLayerDynamic(map);
      
      if (layer) {
        try {
          map.addLayer(layer);
          model3DLayerRef.current = layer;
          
          console.log('✅ 3D model layer added');
          
          mapRef.current.flyTo({
            center: [55.27988663706024, 25.188620898870248],
            zoom: 19,
            pitch: 60,
            bearing: 0,
            duration: 1500,
          });
        } catch (error) {
          console.error('❌ Error adding 3D model layer:', error);
        }
      }
    } else {
      console.log('🏠 Hiding 3D model');
      
      try {
        if (map.getLayer('3d-model-layer')) {
          map.removeLayer('3d-model-layer');
          console.log('✅ 3D model layer removed');
        }
        model3DLayerRef.current = null;
        threeModelRef.current = null;
        threeSceneRef.current = null;
      } catch (error) {
        console.error('❌ Error removing 3D model layer:', error);
      }
    }

    setShow3DModel(!show3DModel);
  }, [show3DModel, create3DModelLayerDynamic]);

  if (errorMsg) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{errorMsg}</Text>
      </View>
    );
  }

  if (mapError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>Map Error: {mapError}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => setMapError(null)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {Platform.OS === 'web' && (
        <style>
          {`
            .mapboxgl-ctrl-logo,
            .mapboxgl-ctrl-attrib,
            .mapboxgl-ctrl-attrib-inner,
            .mapbox-logo {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }
          `}
        </style>
      )}

      {/* Fixed Header Bar */}
      {!navigation.isNavigating && !selectedProperty && (
        <View style={[styles.fixedHeader, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[styles.headerSearchButton, { backgroundColor: theme.card }]}
            onPress={() => setShowSearchOverlay(true)}
          >
            <Search size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerFilterButton, { backgroundColor: theme.card }]}
            onPress={cyclePropertyType}
          >
            {getFilterIcon()}
            <Text style={[styles.headerFilterText, { color: theme.text }]}>
              {getFilterText()}
            </Text>
          </TouchableOpacity>
        </View>
      )}

{/* Chat Filter Banner */}
{((highlightedProperties && highlightedProperties.length > 0) || (chatFilterIds && chatFilterIds.length > 0)) && !selectedProperty && !nearMeAction && (
  <View style={[styles.chatFilterBanner, { backgroundColor: theme.primary }]}>
    <Text style={styles.chatFilterText}>
      Showing {Math.min(filteredProperties.length, 10)} of {filteredProperties.length} properties
    </Text>
    <TouchableOpacity
      style={styles.clearFilterButton}
      onPress={() => {
        console.log('Clearing chat filter');
        clearSelection();
        setChatFilterIds(null);
        router.push({
          pathname: '/(tabs)/map',
          params: {
            lat: viewport.latitude.toString(),
            lng: viewport.longitude.toString(),
            zoom: viewport.zoom.toString(),
          },
        });
      }}
    >
      <X size={16} color="white" />
      <Text style={styles.clearFilterText}>Show All</Text>
    </TouchableOpacity>
  </View>
)}

      {/* Near Me Banner */}
     {nearMeAction && !selectedProperty && (
  <View style={[styles.nearMeBanner, { backgroundColor: theme.primary }]}>
    <MapPin size={16} color="white" style={{ marginRight: 8 }} />
    <Text style={styles.nearMeText}>
      {nearMeAction.type === 'proximity_search' && (
        <>
          Within {actualSearchRadiusKm || nearMeAction.radius_km || 2}km radius
          {filteredProperties.length > 0 && (
            <> • {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'}</>
          )}
        </>
      )}
      {nearMeAction.type === 'isochrone_search' && `Within ${nearMeAction.time_minutes?.[nearMeAction.time_minutes.length - 1]} min`}
      {nearMeAction.type === 'find_nearby_pois' && `Showing nearby amenities`}
    </Text>
    <TouchableOpacity
      style={styles.clearNearMeButton}
      onPress={() => {
        setNearMeAction(null);
        setSearchRadiusCircle(null);
        setIsochroneData(null);
        setActualSearchRadiusKm(null);
        nearMe.clearPOIs();
        setChatFilterIds(null);
        console.log('✅ Near Me search cleared');
      }}
    >
      <X size={16} color="white" />
      <Text style={styles.clearNearMeText}>Clear</Text>
    </TouchableOpacity>
  </View>
)}
   {/* Radius Toggle Button */}
{!navigation.isNavigating && !selectedProperty && location && (
  <TouchableOpacity
    style={[styles.radiusToggleButton, { backgroundColor: theme.card }]}
    onPress={handleRadiusToggle}
    onLongPress={() => {
      // Long press to show radius options
      if (Platform.OS === 'ios') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (error) {
          console.log('Haptics not available');
        }
      }
      // You can add a modal/dropdown here for radius selection
    }}
  >
    <View style={styles.radiusToggleContent}>
      <MapPin size={20} color={showRadiusToggle ? theme.primary : theme.tabIconDefault} />
      {showRadiusToggle && (
        <Text style={[styles.radiusToggleText, { color: theme.text }]}>
          {userRadiusKm}km
        </Text>
      )}
    </View>
  </TouchableOpacity>
)}

{/* Radius Options Modal - Show when toggle is active */}
{showRadiusOptions && !selectedProperty && (
  <View style={[styles.radiusOptionsPanel, { backgroundColor: theme.background }]}>
    <Text style={[styles.radiusOptionsTitle, { color: theme.text }]}>
      Search Radius
    </Text>
    <View style={styles.radiusOptionsButtons}>
      {[0.5, 1, 2, 3, 5, 10].map((radius) => (
        <TouchableOpacity
          key={radius}
          style={[
            styles.radiusOptionButton,
            {
              backgroundColor: userRadiusKm === radius ? theme.primary : theme.card,
            }
          ]}
          onPress={() => handleRadiusChange(radius)}
        >
          <Text
            style={[
              styles.radiusOptionText,
              {
                color: userRadiusKm === radius ? 'white' : theme.text,
              }
            ]}
          >
            {radius}km
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
)}   

      {/* Search Overlay */}
      {showSearchOverlay && (
        <View style={styles.searchOverlay}>
          <View style={[styles.searchOverlayContent, { backgroundColor: theme.background }]}>
            <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
              <Search size={20} color={theme.tabIconDefault} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search location..."
                placeholderTextColor={theme.tabIconDefault}
                value={searchQuery}
                onChangeText={handleSearchInputChange}
                onSubmitEditing={handleSearch}
                autoFocus
              />
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                  setShowSearchOverlay(false);
                }}
                style={styles.clearButton}
              >
                <X size={20} color={theme.tabIconDefault} />
              </TouchableOpacity>
            </View>

            <LocationSearchDropdown
              suggestions={searchSuggestions}
              onSelect={handleLocationSelect}
              visible={showSearchDropdown}
            />
          </View>
        </View>
      )}

      {/* Map */}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={viewport}
        onMove={evt => setViewport(evt.viewState)}
        onMoveStart={handleMapMove}
        onZoom={handleMapMove}
        onDrag={handleMapMove}
        onError={handleMapError}
        onLoad={handleMapLoad}
        style={styles.map}
        mapStyle={getMapStyle()}
        attributionControl={false}
        minZoom={8}
        maxZoom={22}
        interactiveLayerIds={selectedProperty ? [] : undefined}
      >
    {/* Search Radius Circle (from chat - shows at search location) */}
{searchRadiusCircle && nearMeAction && (
  <Source id="search-radius-circle" type="geojson" data={searchRadiusCircle}>
    <Layer
      id="search-radius-circle-fill"
      type="fill"
      paint={{
        'fill-color': theme.primary,
        'fill-opacity': 0.1,
      }}
    />
    <Layer
      id="search-radius-circle-outline"
      type="line"
      paint={{
        'line-color': theme.primary,
        'line-width': 2,
        'line-dasharray': [2, 2],
      }}
    />
  </Source>
)}

{/* User Exploration Radius Circle (from toggle - shows at user location) */}
{userRadiusCircle && showRadiusToggle && (
  <Source id="user-radius-circle" type="geojson" data={userRadiusCircle}>
    <Layer
      id="user-radius-circle-fill"
      type="fill"
      paint={{
        'fill-color': '#00C853', // ✅ Different color for user exploration
        'fill-opacity': 0.15,
      }}
    />
    <Layer
      id="user-radius-circle-outline"
      type="line"
      paint={{
        'line-color': '#00C853',
        'line-width': 3,
        'line-dasharray': [4, 2],
      }}
    />
  </Source>
)}

        {/* Isochrone Visualization */}
        {isochroneData && nearMeAction?.show_isochrone && (
          <Source id="isochrone" type="geojson" data={isochroneData}>
            {isochroneData.features.map((feature: any, index: number) => (
              <Layer
                key={`isochrone-${index}`}
                id={`isochrone-fill-${index}`}
                type="fill"
                source="isochrone"
                filter={['==', 'contour', feature.properties.contour]}
                paint={{
                  'fill-color': feature.properties.fillColor || theme.primary,
                  'fill-opacity': feature.properties.fillOpacity || 0.3,
                }}
              />
            ))}
          </Source>
        )}

        {/* POI Markers */}
        {nearMe.pois.map((poi) => (
          <Marker
            key={poi.id}
            longitude={poi.coordinates[0]}
            latitude={poi.coordinates[1]}
          >
            <View style={[styles.poiMarker, { backgroundColor: theme.card }]}>
              <Text style={{ fontSize: 20 }}>{getPOIIcon(poi.category)}</Text>
            </View>
          </Marker>
        ))}

        {/* User Location Marker - Rotates with bearing during navigation */}
        {location && navigation.isNavigating && (
          <Marker
            longitude={location.coords.longitude}
            latitude={location.coords.latitude}
            anchor="center"
            rotation={navigation.userBearing}
          >
            <View style={styles.userLocationContainer}>
              <View style={[
                styles.navigationCarContainer,
                {
                  transform: [{ rotate: `${navigation.userBearing}deg` }]
                }
              ]}>
                {navigation.profile === 'mapbox/walking' ? (
                  <View style={[styles.profileMarker, { backgroundColor: theme.primary }]}>
                    <Text style={styles.profileMarkerIcon}>🚶</Text>
                  </View>
                ) : navigation.profile === 'mapbox/cycling' ? (
                  <View style={[styles.profileMarker, { backgroundColor: theme.primary }]}>
                    <Text style={styles.profileMarkerIcon}>🚴</Text>
                  </View>
                ) : (
                  <View style={[styles.carBody, { backgroundColor: theme.primary }]}>
                    <View style={[styles.carWindshield, { backgroundColor: theme.primary }]} />
                    <View style={styles.carMirrorLeft} />
                    <View style={styles.carMirrorRight} />
                    <View style={styles.carHeadlights} />
                  </View>
                )}
              </View>
              <View style={[styles.carShadow, { backgroundColor: theme.primary }]} />
            </View>
          </Marker>
        )}

        {/* User Location - Normal blue dot when not navigating */}
        {location && !navigation.isNavigating && (
          <Marker
            longitude={location.coords.longitude}
            latitude={location.coords.latitude}
          >
            <View style={styles.userLocationDot} />
          </Marker>
        )}

        {/* Route Display */}
        {(navigation.isNavigating || navigation.showingPreview) && navigation.route && navigation.route.geometry && navigation.route.geometry.coordinates && (
          <>
            <Source
              id="route"
              type="geojson"
              data={{
                type: 'Feature',
                geometry: navigation.route.geometry,
                properties: {}
              }}
            >
              <Layer
                id="route-outline"
                type="line"
                paint={{
                  'line-color': '#FFFFFF',
                  'line-width': 10,
                  'line-opacity': 0.5,
                }}
              />
              <Layer
                id="route-layer"
                type="line"
                paint={{
                  'line-color': theme.primary,
                  'line-width': 6,
                  'line-opacity': 0.9,
                }}
              />
            </Source>
            {navigation.alternativeRoutes.map((altRoute: any, index: number) => (
              altRoute.geometry && (
                <Source
                  key={`alt-route-${index}`}
                  id={`alt-route-${index}`}
                  type="geojson"
                  data={{
                    type: 'Feature',
                    geometry: altRoute.geometry,
                    properties: { index }
                  }}
                >
                  <Layer
                    id={`alt-route-layer-${index}`}
                    type="line"
                    paint={{
                      'line-color': navigation.showingPreview ? theme.tabIconDefault : theme.tabIconDefault,
                      'line-width': navigation.showingPreview ? 5 : 4,
                      'line-opacity': navigation.showingPreview ? 0.6 : 0.4,
                      'line-dasharray': [2, 2],
                    }}
                    onClick={() => {
                      if (navigation.showingPreview) {
                        console.log(`Selected alternative route ${index + 1}`);
                        navigation.switchToAlternative(index);
                        try {
                          if (Platform.OS === 'ios') {
                            Haptics.selectionAsync();
                          } else if (Platform.OS === 'android') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        } catch (error) {
                          console.log('Haptics not available:', error);
                        }
                      }
                    }}
                  />
                </Source>
              )
            ))}
          </>
        )}

        {/* Property Markers */}
        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;

          if (isCluster) {
            const clusterSize = viewport.zoom < 12 ? 36 : viewport.zoom < 14 ? 40 : 44;

            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
              >
                <View style={[styles.clusterMarker, { width: clusterSize, height: clusterSize, borderRadius: clusterSize / 2 }]}>
                  <Text style={[styles.clusterText, { fontSize: viewport.zoom < 12 ? 11 : 13 }]}>{pointCount}</Text>
                </View>
              </Marker>
            );
          }

          const isForSale = cluster.properties.Transaction_Type?.toLowerCase().includes('sale') ||
                          cluster.properties.Transaction_Type?.toLowerCase().includes('buy');
          const isBinghatti = isBinghattiProperty(cluster.properties);
          const isHighlighted = highlightedProperties.some(
            p => p.Property_ID === cluster.properties.Property_ID
          );

          return (
            <React.Fragment key={cluster.properties.Property_ID}>
              <Marker
                longitude={longitude}
                latitude={latitude}
                onClick={() => handlePropertySelect(cluster.properties)}
              >
                <View style={[
                  styles.propertyMarker,
                  {
                    backgroundColor: isForSale ? '#FF7E00' : '#00C853',
                    padding: markerSize.padding,
                    borderWidth: isHighlighted ? 4 : 2,
                    borderColor: isHighlighted ? '#FFD700' : 'white',
                    shadowColor: isHighlighted ? '#FFD700' : '#000',
                    shadowOpacity: isHighlighted ? 0.8 : 0.3,
                    shadowRadius: isHighlighted ? 8 : 3,
                    elevation: isHighlighted ? 10 : 5,
                    transform: [{ scale: isHighlighted ? 1.2 : 1 }],
                  }
                ]}>
                  <Text style={[styles.propertyPrice, { fontSize: markerSize.fontSize }]}>
                    {cluster.properties.Price ? formatPrice(cluster.properties.Price) : 'N/A'}
                  </Text>
                </View>
              </Marker>
              {isBinghatti && showBinghattiLogos && viewport.zoom >= 13 && (
                <BinghattiMarker
                  longitude={longitude}
                  latitude={latitude}
                  zoomLevel={viewport.zoom}
                  onLogoClick={handleBinghattiLogoClick}
                  onPropertyClick={() => handlePropertySelect(cluster.properties)}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Other Users */}
        {otherUsers.map((user) => (
          <Marker
            key={user.user_id}
            longitude={user.location.coordinates[0]}
            latitude={user.location.coordinates[1]}
          >
            <View style={styles.otherUserMarker} />
          </Marker>
        ))}
      </Map>

      {/* Controls - Always visible but behind sheet */}
      <View style={[styles.controlsContainer, selectedProperty && styles.controlsBehindSheet]}>
        {Platform.OS === 'web' && (
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: theme.card }]}
            onPress={toggle3DModel}
          >
            <Box
              size={24}
              color={show3DModel ? theme.primary : theme.tabIconDefault}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.card }]}
          onPress={toggleBinghattiLogos}
        >
          <Building2
            size={24}
            color={showBinghattiLogos ? theme.primary : theme.tabIconDefault}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.card }]}
          onPress={toggleStreetView}
        >
          <User
            size={24}
            color={isStreetView ? theme.primary : theme.tabIconDefault}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.card }]}
          onPress={resetBearing}
        >
          <Compass size={24} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.card }]}
          onPress={() => {
            if (location) {
              console.log('Recentering to user location');
              setFollowUser(true);
              setViewport({
                ...viewport,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });
              if (mapRef.current) {
                mapRef.current.flyTo({
                  center: [location.coords.longitude, location.coords.latitude],
                  zoom: 16.5,
                  duration: 1000,
                });
              }
            }
          }}
        >
          <Crosshair
            size={24}
            color={followUser ? theme.primary : theme.tabIconDefault}
          />
        </TouchableOpacity>
      </View>

      {/* Binghatti Filter Badge */}
      {filterType === 'binghatti' && !selectedProperty && (
        <View style={[styles.filterBadge, { backgroundColor: theme.card }]}>
          <Text style={[styles.filterBadgeText, { color: theme.text }]}>
            Showing {binghattiCount} Binghatti Properties
          </Text>
          <TouchableOpacity onPress={() => handleBinghattiLogoClick()}>
            <X size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Route Preview Panel */}
      {navigation.showingPreview && !navigation.isNavigating && (
        <View style={styles.previewPanel}>
          <View style={[styles.previewContent, { backgroundColor: theme.background }]}>
            <View style={styles.previewHeader}>
              <View style={styles.previewRouteInfo}>
                <Text style={[styles.previewDistance, { color: theme.text }]}>
                  {((navigation.route?.distance || 0) / 1000).toFixed(1)} km
                </Text>
                <Text style={[styles.previewDuration, { color: theme.tabIconDefault }]}>
                  {Math.round((navigation.route?.duration || 0) / 60)} min
                </Text>
              </View>

              {navigation.alternativeRoutes.length > 0 && (
                <View style={styles.previewAlternatives}>
                  <Text style={[styles.previewAltText, { color: theme.tabIconDefault }]}>
                    {navigation.alternativeRoutes.length} alternative route{navigation.alternativeRoutes.length > 1 ? 's' : ''} available
                  </Text>
                  <Text style={[styles.previewAltHint, { color: theme.tabIconDefault }]}>
                    Tap on map to select
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.previewCancelButton, { backgroundColor: theme.cardBackground }]}
                onPress={() => {
                  navigation.stopNavigation();
                  setSelectedProperty(null);
                }}
              >
                <X size={20} color={theme.text} />
                <Text style={[styles.previewCancelText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewStartButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  try {
                    if (Platform.OS === 'ios') {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } else if (Platform.OS === 'android') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    }
                  } catch (error) {
                    console.log('Haptics not available:', error);
                  }
                  console.log("Let's Go!");
                  navigation.confirmStartNavigation();
                }}
              >
                <Navigation size={24} color="white" />
                <Text style={styles.previewStartText}>Let's Go!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Arrival Notification */}
      {navigation.hasArrived && (
        <View style={[styles.arrivalBanner, { backgroundColor: theme.primary }]}>
          <Text style={styles.arrivalText}>You have arrived!</Text>
        </View>
      )}

{/* Off-Route Indicator - Now handled by NavigationPanel */}

      {/* Speedometer */}
      {navigation.isNavigating && location && (
        <Speedometer
          speedMps={navigation.speedMps}
          speedLimit={navigation.speedLimit}
          isOverSpeedLimit={navigation.isOverSpeedLimit}
          theme={theme}
        />
      )}

      {/* Navigation Panel */}
      <NavigationPanel
        isNavigating={navigation.isNavigating}
        currentInstruction={navigation.currentInstruction}
        nextInstruction={navigation.nextInstruction}
        instructionIcon={navigation.instructionIcon}
        distanceToNextTurn={navigation.distanceToNextTurn}
        remainingDistance={navigation.remainingDistance}
        remainingDuration={navigation.remainingDuration}
        elapsedTime={navigation.elapsedTime}
        speedMps={navigation.speedMps}
        estimatedTimeOfArrival={navigation.estimatedTimeOfArrival}
        isOffRoute={navigation.isOffRoute}
        laneGuidance={navigation.laneGuidance}
        currentLanes={navigation.currentLanes}
        currentProfile={navigation.profile}
        theme={theme}
        onStop={navigation.stopNavigation}
        onReroute={navigation.reroute}
        onChangeProfile={navigation.changeProfile}
      />

      {/* PropertyBottomSheet - with improved gesture handling */}
      {selectedProperty && !navigation.isNavigating && !navigation.showingPreview && (
        <PropertyBottomSheet
          property={selectedProperty}
          onClose={handlePropertyClose}
          onNavigate={() => {
            try {
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else if (Platform.OS === 'android') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              }
            } catch (error) {
              console.log('Haptics not available:', error);
            }
            navigation.startNavigation(selectedProperty);
          }}
          onAskAI={() => handleAskAI(selectedProperty)}
        />
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerSearchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  headerFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    flex: 1,
  },
  headerFilterText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  map: {
    flex: 1,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  searchOverlayContent: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  searchContainer: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  userLocationContainer: {
    position: 'relative',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationCarContainer: {
    position: 'relative',
  },
  carBody: {
    width: 30,
    height: 42,
    borderRadius: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
    overflow: 'visible',
  },
  carWindshield: {
    width: 20,
    height: 14,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginTop: 3,
    opacity: 0.9,
  },
  carMirrorLeft: {
    position: 'absolute',
    left: -3,
    top: 18,
    width: 4,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  carMirrorRight: {
    position: 'absolute',
    right: -3,
    top: 18,
    width: 4,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  carHeadlights: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  profileMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  profileMarkerIcon: {
    fontSize: 20,
  },
  carShadow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    opacity: 0.15,
    zIndex: 1,
  },
  userLocationDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'white',
  },
  otherUserMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    borderWidth: 3,
    borderColor: 'white',
  },
  propertyMarker: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  propertyPrice: {
    color: 'white',
    fontWeight: 'bold',
  },
  clusterMarker: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  clusterText: {
    color: 'white',
    fontWeight: 'bold',
  },
  poiMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    gap: 12,
    zIndex: 100,
  },
  controlsBehindSheet: {
    zIndex: 50,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'PorscheDesign-Regular',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  filterBadge: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  chatFilterBanner: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  chatFilterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
    flex: 1,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearFilterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  nearMeBanner: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  nearMeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
    flex: 1,
  },
  clearNearMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearNearMeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  offRouteWarning: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 998,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  offRouteText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  reroutingIcon: {},
  arrivalBanner: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 999,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  arrivalText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
  },
  previewPanel: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  previewContent: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  previewHeader: {
    marginBottom: 20,
  },
  previewRouteInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 8,
  },
  previewDistance: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
  },
  previewDuration: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  previewAlternatives: {
    marginTop: 8,
  },
  previewAltText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
    marginBottom: 4,
  },
  previewAltHint: {
    fontSize: 12,
    fontFamily: 'PorscheDesign-Regular',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  previewCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewCancelText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  previewStartButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  previewStartText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
  },
radiusToggleButton: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 150, 
  },
  radiusToggleContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusToggleText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
    marginTop: 2,
  },
  radiusOptionsPanel: {
    position: 'absolute',
    top: 160,
    right: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    minWidth: 200,
    zIndex: 151, 
  },
  radiusOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
    marginBottom: 12,
  },
  radiusOptionsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusOptionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  radiusOptionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
    markerDistanceBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerDistanceBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
  },
  
});
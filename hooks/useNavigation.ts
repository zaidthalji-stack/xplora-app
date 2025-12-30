import { useState, useEffect, useRef, useCallback } from 'react';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmFpdGFrIiwiYSI6ImNtZ2o5YWN3djBjdTcybXF3MjNlOGFwaHAifQ.fZik8fQ5NvQZngIxCgaB6w';

// ✅ Mapbox Navigation SDK thresholds
const OFF_ROUTE_THRESHOLD = 25;
const REROUTE_DEBOUNCE = 3000;
const ARRIVAL_THRESHOLD = 20;
const STEP_COMPLETION_THRESHOLD = 15;

// 🎯 NEW: Auto-follow behavior settings
const AUTO_RECENTER_DELAY = 8000; // 8 seconds of inactivity before auto-recenter
const CAMERA_FOLLOW_DISTANCE_THRESHOLD = 100; // If user pans >100m away, disable auto-follow

export type RoutingProfile = 
  | 'mapbox/driving-traffic'
  | 'mapbox/driving'
  | 'mapbox/walking'
  | 'mapbox/cycling';

interface NavigationStep {
  distance: number;
  duration: number;
  geometry: any;
  name: string;
  maneuver: {
    type: string;
    instruction: string;
    bearing_after: number;
    bearing_before: number;
    location: [number, number];
  };
  bannerInstructions?: any[];
}

/**
 * ✅ Smart Navigation Hook with Flexible Camera
 * 
 * Features:
 * - Map Matching API for smooth GPS snapping
 * - Auto-recenter after 8s of user inactivity
 * - Freedom to pan/zoom during navigation
 * - Smart bearing and step progression
 */
export function useNavigation(location: any, mapRef: any) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [showingPreview, setShowingPreview] = useState(false);
  const [route, setRoute] = useState<any>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<any[]>([]);
  const [destination, setDestination] = useState<any>(null);
  const [profile, setProfile] = useState<RoutingProfile>('mapbox/driving-traffic');
  const [hasArrived, setHasArrived] = useState(false);
  
  // Navigation progress
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceAlongStep, setDistanceAlongStep] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Off-route detection
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  
  // Tracking
  const [userBearing, setUserBearing] = useState<number>(0);
  const [snappedLocation, setSnappedLocation] = useState<any>(null);
  
  // 🎯 NEW: Camera control states
  const [isUserControllingCamera, setIsUserControllingCamera] = useState(false);
  const [shouldAutoFollow, setShouldAutoFollow] = useState(true);
  
  const lastRerouteTime = useRef<number>(0);
  const updateInterval = useRef<any>(null);
  const gpsTraceBuffer = useRef<any[]>([]);
  
  // 🎯 NEW: User interaction tracking
  const lastUserInteraction = useRef<number>(Date.now());
  const autoRecenterTimeout = useRef<any>(null);
  const lastCameraPosition = useRef<{ lat: number; lng: number } | null>(null);

  /**
   * ✅ Haversine distance
   */
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  /**
   * ✅ Calculate bearing
   */
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    
    return ((θ * 180 / Math.PI) + 360) % 360;
  };

  /**
   * 🎯 NEW: Detect user interaction with map
   */
  const handleUserInteraction = useCallback(() => {
    console.log('👆 User interacted with map');
    lastUserInteraction.current = Date.now();
    setIsUserControllingCamera(true);

    // Clear existing timeout
    if (autoRecenterTimeout.current) {
      clearTimeout(autoRecenterTimeout.current);
    }

    // Set new timeout to re-enable auto-follow
    autoRecenterTimeout.current = setTimeout(() => {
      console.log('⏰ Auto-recenter timer expired - resuming auto-follow');
      setIsUserControllingCamera(false);
      setShouldAutoFollow(true);
    }, AUTO_RECENTER_DELAY);
  }, []);

  /**
   * 🎯 NEW: Check if user has panned too far from route
   */
  const checkCameraDistance = useCallback((userLat: number, userLon: number) => {
    if (!mapRef?.current) return;

    const map = mapRef.current.getMap();
    const center = map.getCenter();
    const cameraLat = center.lat;
    const cameraLng = center.lng;

    // Store camera position
    lastCameraPosition.current = { lat: cameraLat, lng: cameraLng };

    // Calculate distance between camera center and user location
    const distance = calculateDistance(userLat, userLon, cameraLat, cameraLng);

    // If user has panned far away, consider it an interaction
    if (distance > CAMERA_FOLLOW_DISTANCE_THRESHOLD) {
      if (shouldAutoFollow) {
        console.log(`📍 User panned ${Math.round(distance)}m away - disabling auto-follow temporarily`);
        handleUserInteraction();
      }
    }
  }, [shouldAutoFollow, handleUserInteraction]);

  /**
   * ✅ Use Map Matching API to snap GPS trace to road
   */
  const snapToRoad = async (coordinates: [number, number][]) => {
    if (coordinates.length < 2) return null;

    try {
      const coordsString = coordinates
        .map(coord => `${coord[0]},${coord[1]}`)
        .join(';');
      
      const url = `https://api.mapbox.com/matching/v5/${profile}/${coordsString}` +
        `?geometries=geojson` +
        `&radiuses=${coordinates.map(() => '25').join(';')}` +
        `&steps=false` +
        `&overview=full` +
        `&timestamps=${coordinates.map(() => Math.floor(Date.now() / 1000)).join(';')}` +
        `&access_token=${MAPBOX_TOKEN}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.matchings && data.matchings.length > 0) {
        const matched = data.matchings[0];
        const tracepoints = data.tracepoints;
        
        return {
          coordinates: tracepoints[tracepoints.length - 1]?.location || coordinates[coordinates.length - 1],
          confidence: matched.confidence,
          distance: matched.distance,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Map matching error:', error);
      return null;
    }
  };

  /**
   * ✅ Fetch route from Directions API
   */
  const fetchRoute = async (
    origin: { latitude: number; longitude: number },
    dest: { latitude: number; longitude: number },
    routingProfile: RoutingProfile,
    includeAlternatives: boolean = true
  ) => {
    try {
      const url = `https://api.mapbox.com/directions/v5/${routingProfile}/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}` +
        `?alternatives=${includeAlternatives}` +
        `&geometries=geojson` +
        `&overview=full` +
        `&steps=true` +
        `&banner_instructions=true` +
        `&voice_instructions=true` +
        `&annotations=maxspeed,congestion,distance` +
        `&continue_straight=false` +
        `&language=en` +
        `&access_token=${MAPBOX_TOKEN}`;
      
      console.log(`🗺️ Fetching route with ${routingProfile}...`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        console.log(`✅ Got ${data.routes.length} route(s)`);
        return {
          primary: data.routes[0],
          alternatives: data.routes.slice(1)
        };
      }
      
      console.error('❌ Route error:', data.code, data.message);
      return null;
    } catch (error) {
      console.error('❌ Fetch error:', error);
      return null;
    }
  };

  /**
   * ✅ Find nearest point on current step geometry
   */
  const findNearestPointOnStep = (userLat: number, userLon: number, step: NavigationStep) => {
    if (!step?.geometry?.coordinates) {
      return { distance: Infinity, bearing: 0, nearestPoint: null, distanceAlong: 0 };
    }

    const coords = step.geometry.coordinates;
    let minDistance = Infinity;
    let nearestPoint: [number, number] | null = null;
    let nearestSegmentIndex = 0;
    let distanceAlong = 0;

    for (let i = 0; i < coords.length; i++) {
      const coord = coords[i];
      const distance = calculateDistance(userLat, userLon, coord[1], coord[0]);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = coord;
        nearestSegmentIndex = i;
      }
    }

    for (let i = 0; i < nearestSegmentIndex; i++) {
      if (i < coords.length - 1) {
        distanceAlong += calculateDistance(
          coords[i][1], coords[i][0],
          coords[i + 1][1], coords[i + 1][0]
        );
      }
    }

    let bearing = 0;
    if (nearestSegmentIndex < coords.length - 1) {
      bearing = calculateBearing(
        coords[nearestSegmentIndex][1], coords[nearestSegmentIndex][0],
        coords[nearestSegmentIndex + 1][1], coords[nearestSegmentIndex + 1][0]
      );
    }

    return {
      distance: minDistance,
      bearing,
      nearestPoint,
      distanceAlong
    };
  };

  /**
   * ✅ Update navigation progress
   */
  const updateProgress = useCallback(async () => {
    if (!location?.coords || !route || !isNavigating || !destination) return;

    const userLat = location.coords.latitude;
    const userLon = location.coords.longitude;

    // Check for arrival
    const distToDestination = calculateDistance(
      userLat, userLon,
      destination.latitude, destination.longitude
    );

    if (distToDestination < ARRIVAL_THRESHOLD && !hasArrived) {
      console.log('🎉 Arrived at destination!');
      setHasArrived(true);
      setTimeout(() => stopNavigation(), 3000);
      return;
    }

    const steps: NavigationStep[] = route.legs[0].steps;
    const currentStep = steps[currentStepIndex];

    if (!currentStep) return;

    // 🎯 Check camera distance for user interaction detection
    checkCameraDistance(userLat, userLon);

    // Snap to road using Map Matching API
    gpsTraceBuffer.current.push([userLon, userLat]);
    if (gpsTraceBuffer.current.length >= 3) {
      const snapped = await snapToRoad(gpsTraceBuffer.current.slice(-5));
      if (snapped) {
        setSnappedLocation({
          latitude: snapped.coordinates[1],
          longitude: snapped.coordinates[0]
        });
      }
      gpsTraceBuffer.current = gpsTraceBuffer.current.slice(-3);
    }

    // Find position on current step
    const { distance, bearing, distanceAlong } = findNearestPointOnStep(userLat, userLon, currentStep);
    
    setDistanceAlongStep(distanceAlong);
    setUserBearing(bearing);

    // Check if off route
    if (distance > OFF_ROUTE_THRESHOLD) {
      if (!isOffRoute) {
        console.log(`⚠️ Off route by ${Math.round(distance)}m`);
        setIsOffRoute(true);
      }

      const now = Date.now();
      if (now - lastRerouteTime.current > REROUTE_DEBOUNCE) {
        console.log('🔄 Auto-rerouting...');
        lastRerouteTime.current = now;
        setIsRerouting(true);

        const routeData = await fetchRoute(
          { latitude: userLat, longitude: userLon },
          destination,
          profile,
          false
        );

        if (routeData?.primary) {
          console.log('✅ Reroute successful');
          setRoute(routeData.primary);
          setCurrentStepIndex(0);
          setDistanceAlongStep(0);
          setIsOffRoute(false);
        }

        setIsRerouting(false);
      }
    } else if (isOffRoute) {
      console.log('✅ Back on route');
      setIsOffRoute(false);
    }

    // Check if should advance to next step
    const remainingInStep = currentStep.distance - distanceAlong;
    if (remainingInStep < STEP_COMPLETION_THRESHOLD && currentStepIndex < steps.length - 1) {
      console.log(`📍 Step ${currentStepIndex + 1}/${steps.length} completed`);
      setCurrentStepIndex(currentStepIndex + 1);
      setDistanceAlongStep(0);
    }

    // Update elapsed time
    if (startTime) {
      setElapsedTime((Date.now() - startTime) / 1000);
    }
  }, [location, route, isNavigating, currentStepIndex, destination, profile, isOffRoute, startTime, hasArrived, checkCameraDistance]);

  /**
   * 🎯 SMART Auto-update map camera with user interaction respect
   */
  useEffect(() => {
    if (isNavigating && location?.coords && mapRef?.current) {
      const useLocation = snappedLocation || location.coords;
      
      // Only auto-follow if:
      // 1. Not off route
      // 2. User hasn't interacted recently OR auto-follow is re-enabled
      const shouldFollow = !isOffRoute && (!isUserControllingCamera || shouldAutoFollow);

if (shouldFollow) {
  const map = mapRef.current.getMap();
  if (map) {
    // 🎯 Waze-style positioning: User at BOTTOM, maximum view ahead
    const mapCanvas = map.getCanvas();
    const screenHeight = mapCanvas?.height || 800;
    
    map.easeTo({
      center: [useLocation.longitude, useLocation.latitude],
      bearing: userBearing,
      zoom: 16.5, // Slightly zoomed out to see more ahead
      pitch: 60, // Immersive 3D but not too aggressive
      padding: {
        top: 0,                        // No top padding - maximize view ahead
        bottom: screenHeight * 0.70,   // Push user to bottom 30% of screen
        left: 0,
        right: 0,
      },
      duration: 1000,
      essential: true,
    });
  }
}else {
        console.log('📍 User is controlling camera - skipping auto-follow');
      }
    }
  }, [isNavigating, location, snappedLocation, userBearing, isOffRoute, isUserControllingCamera, shouldAutoFollow]);

  /**
   * ✅ Progress update loop
   */
  useEffect(() => {
    if (isNavigating && route) {
      updateProgress();
      updateInterval.current = setInterval(updateProgress, 1000);

      return () => {
        if (updateInterval.current) {
          clearInterval(updateInterval.current);
        }
      };
    }
  }, [isNavigating, route, updateProgress]);

  /**
   * ✅ Start navigation (preview first)
   */
  const startNavigation = async (property: any, selectedProfile?: RoutingProfile) => {
    if (!location?.coords) {
      alert('Location not available');
      return false;
    }

    const useProfile = selectedProfile || profile;
    console.log(`🧭 Calculating ${useProfile} route...`);

    const routeData = await fetchRoute(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      },
      {
        latitude: parseFloat(property.Latitude),
        longitude: parseFloat(property.Longitude)
      },
      useProfile,
      true
    );

    if (!routeData?.primary) {
      alert('Could not calculate route');
      return false;
    }

    setRoute(routeData.primary);
    setAlternativeRoutes(routeData.alternatives || []);
    setProfile(useProfile);
    setDestination({
      latitude: parseFloat(property.Latitude),
      longitude: parseFloat(property.Longitude),
      name: property.Property_Name || property.Building_Name
    });
    setCurrentStepIndex(0);
    setDistanceAlongStep(0);
    setIsOffRoute(false);
    setHasArrived(false);
    gpsTraceBuffer.current = [];
    
    // 🎯 Reset camera control
    setIsUserControllingCamera(false);
    setShouldAutoFollow(true);
    lastUserInteraction.current = Date.now();

    // Show route overview
    if (mapRef?.current && routeData.primary.geometry?.coordinates) {
      const allCoords = [
        ...routeData.primary.geometry.coordinates,
        ...(routeData.alternatives.flatMap((alt: any) => alt.geometry?.coordinates || []))
      ];
      
      const bounds = allCoords.reduce(
        (bounds: any, coord: any) => [
          [Math.min(bounds[0][0], coord[0]), Math.min(bounds[0][1], coord[1])],
          [Math.max(bounds[1][0], coord[0]), Math.max(bounds[1][1], coord[1])]
        ],
        [[allCoords[0][0], allCoords[0][1]], [allCoords[0][0], allCoords[0][1]]]
      );

      mapRef.current.fitBounds(bounds, {
        padding: { top: 150, bottom: 200, left: 50, right: 50 },
        duration: 1500
      });

      setTimeout(() => {
        if (mapRef.current && location?.coords) {
          mapRef.current.flyTo({
            center: [location.coords.longitude, location.coords.latitude],
            zoom: 17.5,
            pitch: 60,
            bearing: 0,
            duration: 1000,
          });
        }
      }, 2000);
    }

    setShowingPreview(true);
    return true;
  };

  /**
   * ✅ Confirm start
   */
const confirmStartNavigation = () => {
  console.log('🚀 Starting navigation');
  setShowingPreview(false);
  setIsNavigating(true);
  setStartTime(Date.now());
  setElapsedTime(0);
  
  // 🚦 Enable traffic layer for navigation
  if (mapRef?.current) {
    const map = mapRef.current.getMap();
    const style = map.getStyle();
    
    if (style && style.layers) {
      style.layers.forEach((layer: any) => {
        if (layer.id.includes('traffic') ||
            layer.id.includes('congestion') ||
            layer['source-layer'] === 'traffic') {
          try {
            map.setLayoutProperty(layer.id, 'visibility', 'visible');
            console.log('✅ Traffic layer enabled for navigation:', layer.id);
          } catch (error) {
            console.log('Could not enable traffic layer:', layer.id);
          }
        }
      });
    }
  }
};

  /**
   * ✅ Change profile
   */
  const changeProfile = async (newProfile: RoutingProfile) => {
    if (!isNavigating || !destination || !location?.coords) {
      setProfile(newProfile);
      return;
    }

    console.log(`🔄 Recalculating with ${newProfile}...`);
    setIsRerouting(true);
    
    const routeData = await fetchRoute(
      { latitude: location.coords.latitude, longitude: location.coords.longitude },
      destination,
      newProfile,
      true
    );

    if (routeData?.primary) {
      setRoute(routeData.primary);
      setAlternativeRoutes(routeData.alternatives || []);
      setProfile(newProfile);
      setCurrentStepIndex(0);
      setDistanceAlongStep(0);
    }
    
    setIsRerouting(false);
  };

  /**
   * ✅ Switch to alternative
   */
  const switchToAlternative = (index: number) => {
    if (index >= 0 && index < alternativeRoutes.length) {
      console.log(`🔀 Switching to alternative ${index + 1}`);
      const newRoute = alternativeRoutes[index];
      const newAlts = [route, ...alternativeRoutes];
      newAlts.splice(index + 1, 1);
      
      setRoute(newRoute);
      setAlternativeRoutes(newAlts.slice(1));
      setCurrentStepIndex(0);
      setDistanceAlongStep(0);
    }
  };

  /**
   * ✅ Stop navigation
   */
  const stopNavigation = () => {
    console.log('🛑 Navigation stopped');
    setIsNavigating(false);
    setShowingPreview(false);
    setRoute(null);
    setAlternativeRoutes([]);
    setDestination(null);
    setCurrentStepIndex(0);
    setDistanceAlongStep(0);
    setStartTime(null);
    setElapsedTime(0);
    setIsOffRoute(false);
    setIsRerouting(false);
    setHasArrived(false);
    setSnappedLocation(null);
    gpsTraceBuffer.current = [];
    
    // 🎯 Clear camera control
    setIsUserControllingCamera(false);
    setShouldAutoFollow(true);
    if (autoRecenterTimeout.current) {
      clearTimeout(autoRecenterTimeout.current);
    }
    
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
    }
  };

  // Extract current instruction data
  const steps: NavigationStep[] = route?.legs?.[0]?.steps || [];
  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];

  // Calculate remaining metrics
  const remainingDistance = steps
    .slice(currentStepIndex)
    .reduce((sum, step, i) => {
      if (i === 0) {
        return sum + (step.distance - distanceAlongStep);
      }
      return sum + step.distance;
    }, 0);

  const remainingDuration = steps
    .slice(currentStepIndex)
    .reduce((sum, step) => sum + step.duration, 0);

  const distanceToNextTurn = currentStep ? currentStep.distance - distanceAlongStep : 0;

  return {
    // State
    isNavigating,
    showingPreview,
    hasArrived,
    route,
    alternativeRoutes,
    destination,
    profile,
    
    // Current instruction
    currentInstruction: currentStep?.maneuver?.instruction || '',
    nextInstruction: nextStep?.maneuver?.instruction || '',
    instructionIcon: currentStep?.maneuver?.type || '',
    
    // Metrics
    totalDistance: route?.distance || 0,
    totalDuration: route?.duration || 0,
    remainingDistance,
    remainingDuration,
    distanceToNextTurn,
    
    // Time
    estimatedTimeOfArrival: startTime && remainingDuration 
      ? new Date(Date.now() + (remainingDuration * 1000))
      : null,
    elapsedTime,
    
    // Vehicle
    speedMps: location?.coords?.speed || 0,
    speedKmh: (location?.coords?.speed || 0) * 3.6,
    speedLimit: null,
    isOverSpeedLimit: false,
    userBearing,
    
    // Navigation state
    currentStepIndex,
    totalSteps: steps.length,
    isOffRoute,
    isRerouting,
    
    // 🎯 NEW: Camera control
    isUserControllingCamera,
    shouldAutoFollow,
    onUserInteraction: handleUserInteraction,
    
    // Actions
    startNavigation,
    confirmStartNavigation,
    stopNavigation,
    changeProfile,
    reroute: () => {
      if (location?.coords && destination) {
        lastRerouteTime.current = 0;
        updateProgress();
      }
    },
    switchToAlternative,
  };
}
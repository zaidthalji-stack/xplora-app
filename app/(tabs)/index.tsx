import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Share,
  Platform,
  Animated,
  Dimensions,
  Image,
  Modal, 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import { Mic, Send, Brain, Phone, Share2, MessageCircle, Copy, Check, MapPin, X as XIcon, RotateCcw, Download } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { ChatExportModal } from '@/components/ChatExportModal';
import { usePropertyContext } from '@/context/PropertyContext';
import { useLocalSearchParams } from 'expo-router';
import useLocation from '@/hooks/useLocation';

const { width: screenWidth } = Dimensions.get('window');

// ===== CONFIGURATION =====
const WEBHOOK_URL = 'https://baitak.app.n8n.cloud/webhook/11569ec8-0287-4a02-b281-b175e5c84575';

interface Property {
  Building_Name?: string;
  Property_ID?: string;
  Transaction_Type?: string;
  Off_Plan_Status?: string;
  Property_Type?: string;
  Location?: string;
  Price?: number;
  Bedrooms?: number;
  Bathrooms?: number;
  'Property_Size_(sqft)'?: number;
  Features?: string | string[];
  Furnishing?: string;
  Developer?: string;
  Building_Rating?: number;
  District?: string;
  Date_Listed?: string;
  Agent_Name?: string;
  Agency_Name?: string;
  Agent_Phone?: string;
  Latitude?: number;
  Longitude?: number;
  floor_number?: string;
  unit_number?: string;
  wing_side?: string;
  parking_spaces_allocated?: number;
  building_classification?: string;
  number_of_elevators?: number;
  service_elevators?: number;
  open_house_status?: string;
  open_house_date?: string;
  viewing_availability?: string;
}

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  properties?: Property[];
  isContext?: boolean;
  audioUrl?: string;
  images?: string[] | Array<{ unitType: string; imageUrl: string }>;
}

// ===== AUDIO PLAYER COMPONENT =====
const AudioPlayer = ({ audioUrl, theme }: { audioUrl: string; theme: any }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);

  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const togglePlayback = async () => {
    try {
      if (Platform.OS === 'web') {
        const audio = new Audio(audioUrl);
        if (isPlaying) {
          audio.pause();
        } else {
          await audio.play();
        }
        setIsPlaying(!isPlaying);
      } else {
        if (sound) {
          if (isPlaying) {
            await sound.pauseAsync();
          } else {
            await sound.playAsync();
          }
          setIsPlaying(!isPlaying);
        } else {
          const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUrl });
          setSound(newSound);
          await newSound.playAsync();
          setIsPlaying(true);
          
          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.audioPlayerButton, { backgroundColor: theme.primary }]}
      onPress={togglePlayback}
    >
      <Text style={styles.audioPlayerIcon}>
        {isPlaying ? '⏸️' : '▶️'}
      </Text>
      <Text style={styles.audioPlayerText}>
        {isPlaying ? 'Pause' : 'Play'} Voice Message
      </Text>
    </TouchableOpacity>
  );
};

const BinghattiBadges = ({ 
  property, 
  theme, 
  isDarkMode 
}: { 
  property: Property; 
  theme: any; 
  isDarkMode: boolean;
}) => {
  // ✅ Check both is_binghatti flag AND developer name
  const isBinghatti = property.is_binghatti || 
                      property.Developer?.toLowerCase().includes('binghatti');
  
  if (!isBinghatti) return null;
  
  return (
    <View style={styles.binghattiBadgesContainer}>
      {/* Ultra-Luxury Badge */}
      {property.ultra_luxury && (
        <LinearGradient
          colors={['#FFD700', '#FFA500', '#FF6B6B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ultraLuxuryBadge}
        >
          <Text style={styles.ultraLuxuryBadgeText}>
            ✨ ULTRA LUXURY
          </Text>
        </LinearGradient>
      )}
      
      {/* Featured Badge */}
      {property.featured_property && !property.ultra_luxury && (
        <View style={[styles.featuredBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.featuredBadgeText}>
            ⭐ FEATURED
          </Text>
        </View>
      )}
      
      {/* ✅ NEW: Open House Badge */}
      {property.open_house_status?.toLowerCase() === 'scheduled' && (
        <View style={[styles.openHouseBadge, { backgroundColor: '#00C853' }]}>
          <Text style={styles.openHouseBadgeText}>
            🏠 OPEN HOUSE
          </Text>
        </View>
      )}
      
      {/* Brand/Project Badges */}
      {property.binghatti_badges && property.binghatti_badges.map((badge, index) => (
        <BlurView 
          key={index}
          intensity={60} 
          tint={isDarkMode ? 'dark' : 'light'} 
          style={styles.binghattiSpecialBadge}
        >
          <Text style={[styles.binghattiSpecialBadgeText, { color: theme.text }]}>
            {badge}
          </Text>
        </BlurView>
      ))}
    </View>
  );
};

const FloorPlanImages = ({ 
  images, 
  theme, 
  isDarkMode 
}: { 
  images: string[] | Array<{ unitType: string; imageUrl: string }>; 
  theme: any; 
  isDarkMode: boolean;
}) => {
  const [loadedImages, setLoadedImages] = useState<{[key: string]: boolean}>({});
  const [failedImages, setFailedImages] = useState<{[key: string]: boolean}>({});
  const [selectedImage, setSelectedImage] = useState<{ url: string; label: string } | null>(null);

  // Normalize images to array of objects
  const normalizedImages = Array.isArray(images) 
    ? images.map((img, idx) => 
        typeof img === 'string' 
          ? { unitType: `Floor Plan ${idx + 1}`, imageUrl: img }
          : img
      )
    : [];

  const handleImageLoad = (url: string) => {
    setLoadedImages(prev => ({ ...prev, [url]: true }));
  };

  const handleImageError = (url: string) => {
    setFailedImages(prev => ({ ...prev, [url]: true }));
    console.error('Failed to load image:', url);
  };

  const openImageModal = (url: string, label: string) => {
    setSelectedImage({ url, label });
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  return (
    <>
      <View style={styles.floorPlanImagesContainer}>
        <Text style={[styles.imagesSectionTitle, { color: theme.text }]}>
          📐 Floor Plans
        </Text>
        <View style={styles.imagesGrid}>
          {normalizedImages.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.imageWrapper}
              onPress={() => openImageModal(item.imageUrl, item.unitType)}
              activeOpacity={0.8}
            >
              <BlurView 
                intensity={60} 
                tint={isDarkMode ? 'dark' : 'light'} 
                style={styles.imageBlurContainer}
              >
                {/* Show actual image */}
                <Image
                  key={`image-${index}`}
                  source={{ uri: item.imageUrl }}
                  style={styles.floorPlanImage}
                  resizeMode="contain"
                  onLoad={() => {
                    console.log('✅ Image loaded successfully:', item.unitType);
                    handleImageLoad(item.imageUrl);
                  }}
                  onError={(error) => {
                    console.error('❌ Image failed:', item.unitType, item.imageUrl);
                    console.error('Error details:', error.nativeEvent);
                    handleImageError(item.imageUrl);
                  }}
                  onLoadStart={() => {
                    console.log('📥 Starting to load:', item.unitType);
                  }}
                />

                {/* Loading state */}
                {!loadedImages[item.imageUrl] && !failedImages[item.imageUrl] && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.imageLoadingText, { color: theme.text }]}>
                      Loading {item.unitType}...
                    </Text>
                  </View>
                )}
                
                {/* Error state with clickable fallback */}
                {failedImages[item.imageUrl] && (
                  <TouchableOpacity 
                    style={styles.imageErrorOverlay}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open(item.imageUrl, '_blank');
                      } else {
                        Linking.openURL(item.imageUrl);
                      }
                    }}
                  >
                    <Text style={styles.imageErrorIcon}>🖼️</Text>
                    <Text style={[styles.imageErrorText, { color: theme.text }]}>
                      {item.unitType}
                    </Text>
                    <Text style={[styles.imageErrorHint, { color: theme.tabIconDefault }]}>
                      Tap to open in browser
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Overlay with unit type */}
                <View style={[styles.imageOverlay, { 
                  backgroundColor: failedImages[item.imageUrl] 
                    ? 'rgba(0,0,0,0.7)' 
                    : isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' 
                }]}>
                  <Text style={[styles.imageLabel, { color: theme.text }]}>
                    {item.unitType}
                  </Text>
                  <Text style={[styles.imageTapHint, { color: theme.tabIconDefault }]}>
                    {failedImages[item.imageUrl] ? 'Unavailable' : 'Tap to view'}
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ✅ FULL-SCREEN IMAGE MODAL */}
      {selectedImage && (
        <View style={styles.imageModalOverlay}>
          <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFillObject}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>{selectedImage.label}</Text>
              <TouchableOpacity 
                style={styles.imageModalCloseButton}
                onPress={closeImageModal}
              >
                <XIcon size={28} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView
              contentContainerStyle={styles.imageModalScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <Image
                source={{ uri: selectedImage.url }}
                style={styles.imageModalFullImage}
                resizeMode="contain"
              />
            </ScrollView>
            
            <View style={styles.imageModalFooter}>
              <Text style={styles.imageModalHint}>
                Pinch to zoom • Scroll to pan
              </Text>
            </View>
          </BlurView>
        </View>
      )}
    </>
  );
};


export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const params = useLocalSearchParams();
  const { setSelectedProperty, setHighlightedProperties, selectedProperty: contextProperty, clearSelection } = usePropertyContext();
  const [recognition, setRecognition] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const messagePositionsRef = useRef<{ [key: string]: number }>({});
  const lastMessageIdRef = useRef<string | null>(null);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const animatedValue2 = useRef(new Animated.Value(0)).current;
  const animatedValue3 = useRef(new Animated.Value(0)).current;
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const copyTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionIdRef = useRef<string>(`${Date.now()}`);
  const { location: userLocation } = useLocation(); 
  const [isSending, setIsSending] = useState(false);
  const [showCancelButton, setShowCancelButton] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';
        
        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsRecording(false);
        };
        
        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };
        
        recognitionInstance.onend = () => {
          setIsRecording(false);
        };
        
        setRecognition(recognitionInstance);
      }
    }
  }, []);

  React.useEffect(() => {
    const animateCircle1 = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: Math.random(),
          duration: 2000 + Math.random() * 2000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: Math.random(),
          duration: 2000 + Math.random() * 2000,
          useNativeDriver: false,
        }),
      ]).start(() => animateCircle1());
    };

    const animateCircle2 = () => {
      Animated.sequence([
        Animated.timing(animatedValue2, {
          toValue: Math.random(),
          duration: 1500 + Math.random() * 2500,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue2, {
          toValue: Math.random(),
          duration: 1500 + Math.random() * 2500,
          useNativeDriver: false,
        }),
      ]).start(() => animateCircle2());
    };

    const animateCircle3 = () => {
      Animated.sequence([
        Animated.timing(animatedValue3, {
          toValue: Math.random(),
          duration: 1800 + Math.random() * 2200,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue3, {
          toValue: Math.random(),
          duration: 1800 + Math.random() * 2200,
          useNativeDriver: false,
        }),
      ]).start(() => animateCircle3());
    };

    animateCircle1();
    animateCircle2();
    animateCircle3();
  }, []);

  // Smart auto-scroll to new messages with properties
  React.useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only scroll if it's a new assistant message with properties
      if (!lastMessage.isUser && 
          lastMessage.properties && 
          lastMessage.properties.length > 0 &&
          lastMessage.id !== lastMessageIdRef.current) {
        
        lastMessageIdRef.current = lastMessage.id;
        
        // Wait for the message to render and positions to be measured
        setTimeout(() => {
          const messagePosition = messagePositionsRef.current[lastMessage.id];
          if (messagePosition !== undefined && scrollViewRef.current) {
            // Scroll to the message with some padding at the top (80px for the export button area)
            scrollViewRef.current.scrollTo({ 
              y: Math.max(0, messagePosition - 80), 
              animated: true 
            });
          }
        }, 200);
      }
    }
  }, [messages]);

  // Scroll to the "Thinking..." indicator when processing starts
  React.useEffect(() => {
    if (isProcessing) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isProcessing]);

React.useEffect(() => {
  if (contextProperty && params.propertyId) {
    console.log('📍 Property context received from map:', contextProperty);
    console.log('🔑 Using Session ID:', sessionIdRef.current);
    
    const propertyName = contextProperty.Building_Name || contextProperty.Location;
    const transactionType = contextProperty.Transaction_Type?.toLowerCase() || '';
    const isForSale = transactionType.includes('sale') || transactionType.includes('buy');
    const propertyTypeText = (contextProperty.Property_Type || 'property').toLowerCase();
    
    const sendContextToAI = async () => {
      setIsProcessing(true);
      
      try {
        const contextMessage = `I'm viewing a property and would like to know more about it.

Property: ${propertyName}
ID: ${contextProperty.Property_ID}
Type: ${contextProperty.Property_Type || 'N/A'}
Transaction: ${isForSale ? 'FOR SALE' : 'FOR RENT'}
Price: AED ${(contextProperty.Price || 0).toLocaleString()}${!isForSale ? '/year' : ''}
Location: ${contextProperty.Location || 'N/A'}
Bedrooms: ${contextProperty.Bedrooms || 'N/A'}
Bathrooms: ${contextProperty.Bathrooms || 'N/A'}
Size: ${contextProperty['Property_Size_(sqft)'] || 'N/A'} sqft
Furnishing: ${contextProperty.Furnishing || 'Not specified'}
Developer: ${contextProperty.Developer || 'Not specified'}
Agent: ${contextProperty.Agent_Name || 'Not specified'}
Agent Phone: ${contextProperty.Agent_Phone || 'Not available'}

Please give me a brief, friendly greeting and ask what I'd like to know about this property.`;

        // ✅ Get user location
        const currentUserLocation = userLocation ? {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          accuracy: userLocation.coords.accuracy || null
        } : null;

        // ✅ Build request body
        const requestBody = {
          text: contextMessage,
          timestamp: new Date().toISOString(),
          sessionId: sessionIdRef.current,
          userLocation: currentUserLocation
        };
        
        console.log('📤 INITIAL context request:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const rawData = await response.json();
        console.log('📥 Response received:', rawData);
        
        let responseText = '';
        if (rawData?.message) responseText = rawData.message;
        else if (rawData?.output) responseText = rawData.output;
        else if (rawData?.data?.message) responseText = rawData.data.message;
        else if (Array.isArray(rawData) && rawData[0]?.output) responseText = rawData[0].output;
        else responseText = `I can help you learn more about this ${propertyTypeText} in ${propertyName}. What would you like to know?`;

        setMessages([{
          id: `greeting-${Date.now()}`,
          text: formatResponseText(responseText),
          timestamp: new Date(),
          isUser: false,
          isContext: false,
        }]);
        
        console.log('✅ Context initialized with Session ID:', sessionIdRef.current);
        
      } catch (error) {
        console.error('Error sending context:', error);
        setMessages([{
          id: `greeting-${Date.now()}`,
          text: `I can help you learn more about this ${propertyTypeText} in ${propertyName}. What would you like to know?`,
          timestamp: new Date(),
          isUser: false,
          isContext: false,
        }]);
      } finally {
        setIsProcessing(false);
      }
    };

    setTimeout(() => sendContextToAI(), 300);
    setInputText('');
  }
}, [contextProperty, params.propertyId]);

/**
 * Validates if a property object has meaningful data
 * Returns true only if the property has actual useful information
 */
const isValidProperty = (property: Property): boolean => {
  if (!property) return false;
  
  // A property is valid if it has at least 3 of these critical fields with real data
  const criticalFields = [
    property.Building_Name && property.Building_Name !== 'N/A',
    property.Location && property.Location !== 'N/A',
    property.Price && property.Price > 0,
    property.Property_Type && property.Property_Type !== 'N/A',
    property.Bedrooms && property.Bedrooms > 0,
    property.Property_ID && property.Property_ID !== 'N/A',
  ];
  
  const validFieldCount = criticalFields.filter(Boolean).length;
  
  // Also check that we don't have placeholder values
  const hasPlaceholderValues = 
    property.Building_Name === 'Property' ||
    property.Price === 0 ||
    String(property.Price) === 'N/A';
  
  // Valid if we have at least 3 critical fields and no placeholder values
  return validFieldCount >= 3 && !hasPlaceholderValues;
};

/**
 * Filters out invalid/empty properties from the array
 */
const filterValidProperties = (properties: Property[]): Property[] => {
  if (!properties || !Array.isArray(properties)) return [];
  
  return properties.filter(isValidProperty);
};

  
  const formatDate = (dateString: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number) => {
    if (!price) return 'N/A';
    return price.toLocaleString('en-AE');
  };

  // ADD THESE TWO FUNCTIONS:
const handleViewOnMap = (property: Property) => {
  console.log('🗺️ Viewing property on map:', property.Property_ID);
  
  // Validate coordinates
  if (!property.Latitude || !property.Longitude || isNaN(property.Latitude) || isNaN(property.Longitude)) {
    alert('Property location not available');
    return;
  }
  
  // Set in context for map to use
  setSelectedProperty(property);
  
  console.log('📍 Navigating to property:', {
    id: property.Property_ID,
    lat: property.Latitude,
    lng: property.Longitude,
    name: property.Property_Name
  });
 
  router.push({
    pathname: '/(tabs)/map',
    params: {
      lat: property.Latitude.toString(),
      lng: property.Longitude.toString(),
      zoom: '18',
      propertyId: property.Property_ID,
    },
  });
};

const handleViewAllOnMap = (properties: Property[]) => {
  console.log('🗺️ Viewing multiple properties on map:', properties.length);
  
  const validProperties = properties.filter(
    p => p.Latitude && p.Longitude && 
         !isNaN(p.Latitude) && !isNaN(p.Longitude)
  );
  
  if (validProperties.length === 0) {
    alert('No properties with valid locations found');
    return;
  }
  
  setHighlightedProperties(validProperties);
  
  // Calculate average position for initial view
  const avgLat = validProperties.reduce((sum, p) => sum + p.Latitude!, 0) / validProperties.length;
  const avgLng = validProperties.reduce((sum, p) => sum + p.Longitude!, 0) / validProperties.length;
  
  // Calculate bounding box to determine optimal zoom
  const lats = validProperties.map(p => p.Latitude!);
  const lngs = validProperties.map(p => p.Longitude!);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  // Calculate distance span
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const maxSpan = Math.max(latSpan, lngSpan);
  
  // Smart zoom calculation based on property spread
  let smartZoom;
  if (maxSpan < 0.01) {
    // Very close together (< ~1km) - zoom in close
    smartZoom = 16;
  } else if (maxSpan < 0.03) {
    // Close together (< ~3km) - good detail
    smartZoom = 15;
  } else if (maxSpan < 0.05) {
    // Moderate spread (< ~5km) - neighborhood view
    smartZoom = 14;
  } else if (maxSpan < 0.1) {
    // Wider spread (< ~10km) - district view
    smartZoom = 13;
  } else if (maxSpan < 0.2) {
    // Large spread (< ~20km) - city area view
    smartZoom = 12;
  } else {
    // Very spread out - city-wide view
    smartZoom = 11;
  }
  
  console.log(`📏 Property spread: ${maxSpan.toFixed(4)}° → Zoom: ${smartZoom}`);
  
  // Extract property IDs to pass to map for filtering
  const propertyIds = validProperties
    .map(p => p.Property_ID)
    .filter(id => id)
    .join(',');
  
  console.log('🏠 Property IDs to show on map:', propertyIds);
  
  router.push({
    pathname: '/(tabs)/map',
    params: {
      lat: avgLat.toString(),
      lng: avgLng.toString(),
      zoom: smartZoom.toString(),
      showMultiple: 'true',
      propertyIds: propertyIds, // Pass the specific property IDs
    },
  });
};

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${cleanNumber}`);
  };

  const handleLocationPick = (property: Property) => {
    router.push({
      pathname: '/map',
      params: {
        lat: property.Latitude,
        lng: property.Longitude,
        zoom: 18,
      },
    });
  };

  const handleShare = async (property: Property) => {
    try {
      const propertyName = property.Building_Name || property.Location;
      const message = `Check out this property:\n\n${propertyName}\n${property.Property_Type}\nAED ${formatPrice(property.Price!)}\n\nContact ${property.Agent_Name} at ${property.Agent_Phone}`;
      
      if (Platform.OS === 'web') {
        try {
          if (navigator.share) {
            await navigator.share({
              title: propertyName,
              text: message,
            });
            return;
          }
        } catch (shareError) {
          console.log('Share failed, falling back to clipboard:', shareError);
        }
        
        await navigator.clipboard.writeText(message);
        setCopySuccess(propertyName);
        
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => {
          setCopySuccess(null);
        }, 2000);
      } else {
        await Share.share({
          message,
          title: propertyName,
        });
      }
    } catch (error) {
      console.error('Error in share/clipboard operation:', error);
    }
  };

const handleClearSession = () => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm('Clear all messages and start a new session?');
    if (!confirmed) return;
  }
  
  // Generate new session ID
  sessionIdRef.current = `${Date.now()}`;
  
  // Clear all messages
  setMessages([]);
  
  // Clear property context
  clearSelection();
  
  // Reset input
  setInputText('');
  
  console.log('✅ Session cleared. New Session ID:', sessionIdRef.current);
};

const handleCancelSend = () => {
  // ✅ NEW: Clear the timeout if cancel clicked before 300ms
  if (cancelButtonTimeoutRef.current) {
    clearTimeout(cancelButtonTimeoutRef.current);
    cancelButtonTimeoutRef.current = null;
  }
  
  // ✅ Abort the ongoing fetch request
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    console.log('🚫 Request aborted');
  }
  
  setIsSending(false);
  setShowCancelButton(false); // ✅ NEW: Hide cancel button
  setIsProcessing(false);
  setInputText('');
  console.log('❌ Message send cancelled');
};
  
  const parsePropertyData = (data: any): { properties: Property[], context: string | null } => {
    if (!data) return { properties: [], context: null };
    
    try {
      // If it's already an array of property objects, return as-is
      if (Array.isArray(data) && data.length > 0 && data[0].Property_ID) {
        return { properties: data, context: null };
      }

      if (typeof data !== 'string') {
        return { properties: [], context: String(data) };
      }

      // Clean the text
      let text = data.replace(/\*\*/g, '').replace(/\\n/g, '\n').trim();
      
      // Language-agnostic property structure detection
      // Look for: numbered lists (1., 2., etc.) with structured key-value pairs
      const hasNumberedList = (text.match(/\d+\./g) || []).length >= 2;
      const hasKeyValuePairs = (text.match(/[\w\s]+:\s*[\w\s,]+/g) || []).length >= 3;
      const hasPropertyMarkers = (text.match(/###\s*\d+\./g) || []).length >= 1;
      
      // Check for multiple structured fields in sequence (property listing pattern)
      const hasStructuredFields = /:\s*[\w\s]+\n[\w\s]+:\s*[\w\s]+\n[\w\s]+:/i.test(text);
      
      const hasPropertyStructure = hasPropertyMarkers || (hasNumberedList && (hasKeyValuePairs || hasStructuredFields));

      // If it doesn't look like structured property data, treat as pure conversation
      if (!hasPropertyStructure) {
        return { properties: [], context: text };
      }

      // Extract conversational intro/outro (language-agnostic)
      let intro = '';
      let outro = '';
      let propertySection = text;

      // Extract intro (text before first numbered property with header)
      const firstPropertyMatch = text.match(/^(.*?)(?=###\s*\d+\.)/s);
      if (firstPropertyMatch && firstPropertyMatch[1].trim().length > 0) {
        intro = firstPropertyMatch[1].trim();
        propertySection = text.slice(firstPropertyMatch[0].length);
      }

      // Extract outro - look for summary section (any language) or trailing text
      const summaryMatch = propertySection.match(/###\s*[\w\s]+\n(.*?)$/s);
      const lastPropertyIndex = propertySection.lastIndexOf(/\d+\./);
      if (summaryMatch && !summaryMatch[0].match(/^\d+\./)) {
        outro = summaryMatch[1].trim();
        propertySection = propertySection.slice(0, propertySection.lastIndexOf('###'));
      }

      // Combine intro and outro as context
      const contextParts = [intro, outro].filter(Boolean);
      const context = contextParts.length > 0 ? contextParts.join('\n\n') : null;

      // Parse properties (language-agnostic field matching)
      const lines = propertySection.split('\n').filter(line => line.trim());
      const properties: Partial<Property>[] = [];
      let currentProperty: Partial<Property> = {};

      // Common property field patterns across languages
      const fieldPatterns = {
        name: /^(###\s*)?\d+\.\s*(.+)$/,
        type: /(type|tipo|نوع|类型|тип)/i,
        price: /(price|precio|سعر|价格|цена|prix)/i,
        size: /(size|tamaño|مساحة|面积|размер|superficie|sqft|متر)/i,
        bedroom: /(bedroom|bed|غرف|卧室|спальн|chambre|dormitorio)/i,
        bathroom: /(bathroom|bath|حمام|浴室|ванн|salle de bain|baño)/i,
        furnish: /(furnish|مفروش|装修|мебель|meublé|amueblado)/i,
        feature: /(feature|خصائص|特点|особенност|caractéristiques|características)/i,
        developer: /(developer|مطور|开发商|застройщик|promoteur)/i,
        rating: /(rating|تقييم|评分|рейтинг|évaluation|calificación)/i,
        date: /(date|listed|تاريخ|日期|дата|fecha)/i,
        agent: /(agent|وكيل|代理|агент|courtier)/i,
        contact: /(contact|phone|تواصل|联系|контакт|teléfono)/i,
        location: /(location|موقع|位置|местоположение|ubicación|lieu)/i,
      };

      for (const line of lines) {
        if (line.startsWith('###') && !line.match(/###\s*\d+\./)) continue;
        
        const cleanLine = line.replace(/\*\*/g, '').trim();
        
        // New property starts (numbered item)
        const nameMatch = cleanLine.match(fieldPatterns.name);
        if (nameMatch) {
          if (Object.keys(currentProperty).length > 0) {
            properties.push(currentProperty);
          }
          currentProperty = {
            Building_Name: nameMatch[2]?.trim() || 'Property',
          };
        } 
        // Property fields (colon-separated key-value pairs)
        else if (cleanLine.includes(':')) {
          const colonIndex = cleanLine.indexOf(':');
          const key = cleanLine.substring(0, colonIndex).trim();
          const value = cleanLine.substring(colonIndex + 1).trim();
          
          if (!value) continue;

          const keyLower = key.toLowerCase();
          
          // Match fields using patterns instead of exact strings
          if (fieldPatterns.type.test(keyLower)) {
            currentProperty.Property_Type = value;
          } else if (fieldPatterns.price.test(keyLower)) {
            currentProperty.Price = parseFloat(value.replace(/[^0-9.-]/g, '')) || undefined;
          } else if (fieldPatterns.size.test(keyLower)) {
            currentProperty['Property_Size_(sqft)'] = parseFloat(value.replace(/[^0-9.-]/g, '')) || undefined;
          } else if (fieldPatterns.bedroom.test(keyLower)) {
            currentProperty.Bedrooms = parseInt(value.replace(/[^0-9]/g, '')) || undefined;
          } else if (fieldPatterns.bathroom.test(keyLower)) {
            currentProperty.Bathrooms = parseInt(value.replace(/[^0-9]/g, '')) || undefined;
          } else if (fieldPatterns.furnish.test(keyLower)) {
            currentProperty.Furnishing = value;
          } else if (fieldPatterns.feature.test(keyLower)) {
            currentProperty.Features = value;
          } else if (fieldPatterns.developer.test(keyLower)) {
            currentProperty.Developer = value;
          } else if (fieldPatterns.rating.test(keyLower)) {
            currentProperty.Building_Rating = parseInt(value.replace(/[^0-9]/g, '')) || undefined;
          } else if (fieldPatterns.date.test(keyLower)) {
            currentProperty.Date_Listed = value;
          } else if (fieldPatterns.agent.test(keyLower)) {
            currentProperty.Agent_Name = value;
          } else if (fieldPatterns.contact.test(keyLower)) {
            currentProperty.Agent_Phone = value;
          } else if (fieldPatterns.location.test(keyLower)) {
            currentProperty.Location = value;
          }
        }
      }

      // Add last property
      if (Object.keys(currentProperty).length > 0) {
        properties.push(currentProperty);
      }

      // Only return properties if we actually found valid ones
      const validProperties = properties.filter(p => p.Building_Name || p.Location);

      return { 
        properties: validProperties as Property[], 
        context: context || (validProperties.length === 0 ? text : null)
      };
    } catch (error) {
      console.error('Error parsing property data:', error);
      // On error, treat as conversational response
      return { properties: [], context: typeof data === 'string' ? data : String(data) };
    }
  };

const sendMessage = async (audioFile?: File | Blob, audioUri?: string) => {
  if (!inputText.trim() && !audioFile && !audioUri) return;

  const newMessage: Message = {
    id: Date.now().toString(),
    text: audioFile || audioUri ? '🎤 Voice message' : inputText.trim(),
    timestamp: new Date(),
    isUser: true,
  };

setMessages((prev) => [...prev, newMessage]);
setInputText('');
abortControllerRef.current = new AbortController();
setIsSending(true);
setIsProcessing(true);
cancelButtonTimeoutRef.current = setTimeout(() => {
  setShowCancelButton(true);
}, 300);

  try {
    // ✅ Step 1: Create user location object
    const currentUserLocation = userLocation ? {
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude,
      accuracy: userLocation.coords.accuracy || null
    } : null;

    // ✅ Step 2: Build request body with user location
    const requestBody = {
      text: newMessage.text,
      timestamp: newMessage.timestamp.toISOString(),
      sessionId: sessionIdRef.current,
      userLocation: currentUserLocation
    };
    
    console.log('📤 Request:', JSON.stringify(requestBody, null, 2));

    if (abortControllerRef.current.signal.aborted) {
      console.log('⚠️ Aborted before fetch started');
      return;
    }
let response;
    if (audioFile || audioUri) {
      // ✅ Create abort controller for audio
      abortControllerRef.current = new AbortController();
      
      const formData = new FormData();
      formData.append('text', requestBody.text);
      formData.append('timestamp', requestBody.timestamp);
      formData.append('sessionId', requestBody.sessionId);
      if (requestBody.userLocation) {
        formData.append('userLocation', JSON.stringify(requestBody.userLocation));
      }

      if (audioFile) {
        formData.append('audio', audioFile, 'recording.webm');
      } else if (audioUri) {
        const audioResponse = await fetch(audioUri);
        const audioBlob = await audioResponse.blob();
        formData.append('audio', audioBlob, 'recording.m4a');
      }

      response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });
    } else {
  if (abortControllerRef.current.signal.aborted) {
        console.log('⚠️ Aborted before fetch started');
        return;
      }
            response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });
    }

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const contentType = response.headers.get('content-type');
    
    // ========== AUDIO RESPONSE HANDLING ==========
if (contentType?.includes('audio')) {
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        text: '🔊 Voice response',
        timestamp: new Date(),
        isUser: false,
        audioUrl: audioUrl,
      }]);
      
      if (Platform.OS === 'web') {
        const audio = new Audio(audioUrl);
        audio.play().catch(err => console.log('Auto-play prevented:', err));
      } else {
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
        await sound.playAsync();
      }
      return;
    }

    // ========== MAIN JSON RESPONSE HANDLING ==========
    const rawData = await response.json();
    console.log('📥 Raw n8n response:', JSON.stringify(rawData, null, 2));
    
    let assistantText = '';
    let properties: Property[] = [];
    let audioResponseUrl: string | undefined;

    // Unwrap array response from n8n
    let responseData = rawData;
    if (Array.isArray(rawData) && rawData.length > 0) {
      responseData = rawData[0];
      console.log('📦 Unwrapped array response');
    }

    // ========== CRITICAL DIAGNOSTIC SECTION ==========
    console.log('🔍 DIAGNOSTIC CHECK:');
    console.log('Response keys:', Object.keys(responseData));
    console.log('Has properties?', !!responseData?.properties);
    console.log('Properties count:', responseData?.properties?.length || 0);
    console.log('Has hasResults?', responseData?.hasResults);
    console.log('Intent:', responseData?.intent);
    console.log('Type:', responseData?.type);
    
    // ⚠️ CHECK IF AI DIDN'T SEARCH WHEN IT SHOULD HAVE
    if (responseData?.intent === 'search' && 
        (!responseData?.properties || responseData.properties.length === 0) &&
        responseData?.type !== 'no_results') {
      console.warn('⚠️ WARNING: AI indicated search intent but no properties returned!');
      console.warn('This suggests n8n did not execute the database query.');
      console.warn('Check n8n logs for requires_search flag and Query Builder execution.');
    }

    // Extract message text
    if (responseData?.message) assistantText = responseData.message;
    else if (responseData?.output) assistantText = responseData.output;
    else if (responseData?.data?.message) assistantText = responseData.data.message;
    else assistantText = JSON.stringify(responseData);

    // Extract properties
    if (responseData?.properties) {
      properties = Array.isArray(responseData.properties)
        ? responseData.properties
        : [responseData.properties];
    } else if (responseData?.data?.properties) {
      properties = Array.isArray(responseData.data.properties)
        ? responseData.data.properties
        : [responseData.data.properties];
    }

    // Convert string numbers to actual numbers
    properties = properties.map(prop => ({
      ...prop,
      Bedrooms: typeof prop.Bedrooms === 'string' ? parseInt(prop.Bedrooms) : prop.Bedrooms,
      Bathrooms: typeof prop.Bathrooms === 'string' ? parseInt(prop.Bathrooms) : prop.Bathrooms,
      District: typeof prop.District === 'string' ? parseInt(prop.District) : prop.District,
      'Property_Size_(sqft)': typeof prop['Property_Size_(sqft)'] === 'string' 
        ? parseInt(prop['Property_Size_(sqft)']) 
        : prop['Property_Size_(sqft)'],
    }));

    // Extract audio URL
    if (responseData?.audioUrl) audioResponseUrl = responseData.audioUrl;
    else if (responseData?.data?.audioUrl) audioResponseUrl = responseData.data.audioUrl;

    // Filter valid properties
    const validProperties = filterValidProperties(properties);

    console.log('🏠 Total properties received:', properties.length);
    console.log('✅ Valid properties after filtering:', validProperties.length);


// ✅ FLOOR PLAN IMAGE EXTRACTION - TRUST DATABASE ONLY
// ✅ EXTRACT FLOOR PLAN IMAGES WITH METADATA
let floorPlanImages: Array<{ unitType: string; imageUrl: string }> = [];

// Priority 1: Direct from n8n response
if (responseData?.floor_plan_images && Array.isArray(responseData.floor_plan_images)) {
  console.log('✅ Using floor_plan_images from n8n:', responseData.floor_plan_images.length);
  
  floorPlanImages = responseData.floor_plan_images.map((item: any, idx: number) => {
    if (typeof item === 'string') {
      return { unitType: `Floor Plan ${idx + 1}`, imageUrl: item };
    } else if (item.imageUrl || item.image_url) {
      return {
        unitType: item.unitType || item.unit_type || `Floor Plan ${idx + 1}`,
        imageUrl: item.imageUrl || item.image_url
      };
    }
    return null;
  }).filter(Boolean) as Array<{ unitType: string; imageUrl: string }>;
} 
// Priority 2: From property metadata
else if (validProperties.length > 0) {
  console.log('✅ Extracting from property metadata');
  
  floorPlanImages = validProperties
    .map((p, idx) => p.image_url ? {
      unitType: p.Property_Type || p.unit_type || `Floor Plan ${idx + 1}`,
      imageUrl: p.image_url
    } : null)
    .filter(Boolean) as Array<{ unitType: string; imageUrl: string }>;
}

// Priority 3: Extract from AI text (AS FALLBACK)
if (floorPlanImages.length === 0 && assistantText) {
  console.log('✅ Extracting from AI text as fallback');
  
  // Simple regex to extract markdown image links
  const imageRegex = /\[View Floor Plan\]\((https?:\/\/[^\s)]+)\)/g;
  const matches = [...assistantText.matchAll(imageRegex)];
  
  if (matches.length > 0) {
    floorPlanImages = matches.map((match, idx) => ({
      unitType: `Floor Plan ${idx + 1}`,
      imageUrl: match[1]
    }));
    
    // Remove the markdown links from text
    assistantText = assistantText.replace(imageRegex, '');
    assistantText = assistantText.replace(/- Floor plan:\s*\n/g, '');
    assistantText = assistantText.replace(/\n{3,}/g, '\n\n').trim();
    
    console.log('✅ Extracted', floorPlanImages.length, 'images from AI text');
  }
}

console.log('🖼️ Final floor plan images count:', floorPlanImages.length);
if (floorPlanImages.length > 0) {
  console.log('🖼️ Image URLs:', floorPlanImages.map(img => img.imageUrl));
}

    // ========== NEAR ME ACTION EXTRACTION ==========
    let nearMeAction = null;
    if (responseData?.near_me_action) {
      nearMeAction = responseData.near_me_action;
      console.log('✅ Found near_me_action at root level:', nearMeAction);
    } else if (responseData?.data?.near_me_action) {
      nearMeAction = responseData.data.near_me_action;
      console.log('✅ Found near_me_action in data:', nearMeAction);
    }

    // 🗺️ If Near Me action detected, navigate to map
    if (nearMeAction) {
      console.log('📍 Triggering Near Me map action');
      
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        text: formatResponseText(assistantText),
        timestamp: new Date(),
        isUser: false,
        properties: validProperties.length > 0 ? validProperties : undefined,
        audioUrl: audioResponseUrl,
        images: floorPlanImages.length > 0 ? floorPlanImages : undefined,
      }]);
      
      setTimeout(() => {
        const mapParams: any = {
          near_me_action: JSON.stringify(nearMeAction),
        };
        
        if (validProperties.length > 0) {
          const propertyIds = validProperties
            .map(p => p.Property_ID)
            .filter(id => id)
            .join(',');
          
          mapParams.propertyIds = propertyIds;
          mapParams.showMultiple = 'true';
        }
        
        if (nearMeAction.use_user_location) {
          mapParams.zoom = '14';
        } else if (typeof nearMeAction.center === 'string') {
          mapParams.zoom = '14';
        } else if (Array.isArray(nearMeAction.center)) {
          mapParams.lng = nearMeAction.center[0].toString();
          mapParams.lat = nearMeAction.center[1].toString();
          mapParams.zoom = '14';
        }
        
        console.log('🗺️ Navigating to map with params:', mapParams);
        
        router.push({
          pathname: '/(tabs)/map',
          params: mapParams,
        });
      }, 500);
      
      return;
    }

    // ========== IF NO PROPERTIES AND AI SAID IT WOULD SEARCH ==========
    if (responseData?.intent === 'search' && validProperties.length === 0) {
      assistantText += "\n\n🔍 *Searching for properties...*";
      console.log('⚠️ AI intended to search but no results - user may be left hanging');
    }

    // ✅ FIXED: Normal message handling WITH images
    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      text: formatResponseText(assistantText),
      timestamp: new Date(),
      isUser: false,
      properties: validProperties.length > 0 ? validProperties : undefined,
      audioUrl: audioResponseUrl,
      images: floorPlanImages.length > 0 ? floorPlanImages : undefined, // ✅ ADDED
    }]);
    
 } catch (error: any) {
  // ✅ Check if error was due to abort
  if (error.name === 'AbortError') {
    console.log('✅ Request successfully cancelled by user');
    // Don't show error message for intentional cancellation
    return;
  }
  
  console.error('❌ Error in sendMessage:', error);
  setMessages((prev) => [...prev, {
    id: Date.now().toString(),
    text: 'Oops! 😅 Something went wrong. Could you try again?',
    timestamp: new Date(),
    isUser: false,
  }]);
} finally {
 if (cancelButtonTimeoutRef.current) {
    clearTimeout(cancelButtonTimeoutRef.current);
    cancelButtonTimeoutRef.current = null;
  }
  
  setIsSending(false);
  setShowCancelButton(false);
  setIsProcessing(false);
  abortControllerRef.current = null;
}
};
  const formatResponseText = (text: string): string => {
    if (!text) return '';

    // Minimal formatting - preserve the natural language and personality from n8n
    let formatted = text
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\\n/g, '\n') // Convert escaped newlines
      .trim();

    // Only normalize excessive whitespace
    formatted = formatted
      .replace(/\n\n\n+/g, '\n\n') // Max 2 line breaks
      .replace(/^\n+/, '') // Remove leading breaks
      .replace(/\n+$/, ''); // Remove trailing breaks

    return formatted;
  };

  const extractImageUrlsFromText = (text: string): string[] => {
  if (!text) return [];
  
  // Regex to match markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const imageUrls: string[] = [];
  
  let match;
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    const url = match[2]; // The URL is the second capture group
    
    // Only include URLs that look like floor plan images
    if (url.includes('floor') || url.includes('floorplan') || url.includes('.png') || url.includes('.jpg')) {
      imageUrls.push(url);
    }
  }
  
  console.log('📸 Extracted image URLs from text:', imageUrls.length);
  return imageUrls;
};



 
  const renderProperty = (property: Property) => {
    const transactionType = property.Transaction_Type?.toLowerCase() || '';
    const isForSale = transactionType.includes('sale') || transactionType.includes('buy');
    const isOffPlan = property.Off_Plan_Status?.toLowerCase().includes('soon') || 
                       property.Off_Plan_Status?.toLowerCase() === 'yes';

    const features = property.Features 
      ? (typeof property.Features === 'string' 
          ? property.Features.split(',').map((f: string) => f.trim()).filter(Boolean)
          : property.Features)
      : [];

    return (
      <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={styles.propertyCard}>
        <LinearGradient
          colors={isDarkMode 
            ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
            : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']
          }
          style={styles.propertyGradient}
        >
          <View style={styles.propertyContent}>
            <View style={styles.propertyHeader}>
              <View style={styles.propertyHeaderLeft}>
                <Text style={[styles.propertyName, { color: theme.text }]}>
                  {property.Building_Name || property.Location}
                </Text>
                {property.Property_ID && (
                  <Text style={[styles.propertyId, { color: theme.tabIconDefault }]}>
                    ID: {property.Property_ID}
                  </Text>
                )}
                <View style={styles.propertyBadges}>
                  <View style={[
                    styles.transactionBadge,
                    { backgroundColor: isForSale ? theme.primary : '#00C853' }
                  ]}>
                    <Text style={styles.badgeText}>
                      {isForSale ? 'BUY' : 'RENT'}
                    </Text>
                  </View>
                  {isOffPlan && (
                    <View style={[styles.offPlanBadge, { backgroundColor: '#FF9800' }]}>
                      <Text style={styles.badgeText}>
                        OFF PLAN{property.Off_Plan_Status && property.Off_Plan_Status !== 'Yes' ? ` - ${property.Off_Plan_Status}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* ========== BINGHATTI BADGES ========== */}
            <BinghattiBadges property={property} theme={theme} isDarkMode={isDarkMode} />
            
            {/* ========== BINGHATTI SPECIAL FEATURES ========== */}
            {property.is_binghatti && property.binghatti_features && (
              <View style={styles.binghattiSpecialSection}>
                <View style={styles.binghattiHeaderRow}>
                  <Text style={styles.binghattiSpecialIcon}>🏗️</Text>
                  <Text style={[styles.binghattiSectionTitle, { color: theme.primary }]}>
                    Binghatti Excellence
                  </Text>
                </View>
                {property.binghatti_features.map((feature, index) => (
                  <View key={index} style={styles.binghattiFeatureRow}>
                    <Text style={styles.binghattiFeatureBullet}>•</Text>
                    <Text style={[styles.binghattiFeatureText, { color: theme.text }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            {/* ========== BINGHATTI INVESTMENT INSIGHTS ========== */}
            {property.is_binghatti && property.binghatti_investment && (
              <View style={styles.binghattiInvestmentSection}>
                <View style={styles.binghattiHeaderRow}>
                  <Text style={styles.binghattiSpecialIcon}>📈</Text>
                  <Text style={[styles.binghattiSectionTitle, { color: theme.primary }]}>
                    Investment Highlights
                  </Text>
                </View>
                
                <View style={styles.investmentGrid}>
                  {property.binghatti_investment.expectedROI && (
                    <View style={styles.investmentItem}>
                      <Text style={[styles.investmentLabel, { color: theme.tabIconDefault }]}>
                        Expected ROI
                      </Text>
                      <Text style={[styles.investmentValue, { color: theme.text }]}>
                        {property.binghatti_investment.expectedROI}
                      </Text>
                    </View>
                  )}
                  
                  {property.binghatti_investment.priceRange && (
                    <View style={styles.investmentItem}>
                      <Text style={[styles.investmentLabel, { color: theme.tabIconDefault }]}>
                        Price Range
                      </Text>
                      <Text style={[styles.investmentValue, { color: theme.text }]}>
                        {property.binghatti_investment.priceRange}
                      </Text>
                    </View>
                  )}
                  
                  {property.binghatti_investment.targetMarket && (
                    <View style={styles.investmentItem}>
                      <Text style={[styles.investmentLabel, { color: theme.tabIconDefault }]}>
                        Target Market
                      </Text>
                      <Text style={[styles.investmentValue, { color: theme.text }]}>
                        {property.binghatti_investment.targetMarket}
                      </Text>
                    </View>
                  )}
                </View>
                
                {property.binghatti_investment.brandPremium && (
                  <View style={styles.premiumCallout}>
                    <Text style={styles.premiumCalloutText}>
                      💎 Premium global brand collaboration - enhanced investment value
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ✨ Distance Badge (if proximity search) */}
            {property.distance_km && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>
                  📍 {property.distance_km.toFixed(1)}km away
                </Text>
              </View>
            )}

            {property.Property_Type && (
              <Text style={[styles.propertyType, { color: theme.tabIconDefault }]}>
                {property.Property_Type}
                {property.Location && ` in ${property.Location}`}
              </Text>
            )}

            <View style={styles.priceContainer}>
              <Text style={[styles.propertyPrice, { color: theme.primary }]}>
                AED {formatPrice(property.Price!)}
              </Text>
              {!isForSale && property.Price && (
                <Text style={[styles.pricePerMonth, { color: theme.tabIconDefault }]}>
                  /year ({Math.round(property.Price / 12).toLocaleString()}/month)
                </Text>
              )}
            </View>

            <View style={styles.specsRow}>
              {property.Bedrooms && (
                <View style={[styles.specItem, { backgroundColor: theme.background }]}>
                  <Text style={styles.specIcon}>🛏️</Text>
                  <Text style={[styles.specText, { color: theme.text }]}>
                    {property.Bedrooms} Bed{property.Bedrooms > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {property.Bathrooms && (
                <View style={[styles.specItem, { backgroundColor: theme.background }]}>
                  <Text style={styles.specIcon}>🚿</Text>
                  <Text style={[styles.specText, { color: theme.text }]}>
                    {property.Bathrooms} Bath{property.Bathrooms > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {property['Property_Size_(sqft)'] && (
                <View style={[styles.specItem, { backgroundColor: theme.background }]}>
                  <Text style={styles.specIcon}>📐</Text>
                  <Text style={[styles.specText, { color: theme.text }]}>
                    {property['Property_Size_(sqft)'].toLocaleString()} sqft
                  </Text>
                </View>
              )}
            </View>

            {features.length > 0 && (
              <View style={styles.propertyFeatures}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Features</Text>
                <View style={styles.featuresGrid}>
                  {features.slice(0, 8).map((feature, index) => (
                    <BlurView 
                      key={index} 
                      intensity={60} 
                      tint={isDarkMode ? 'dark' : 'light'} 
                      style={styles.featureTag}
                    >
                      <Text style={[styles.featureText, { color: theme.text }]}>
                        {feature}
                      </Text>
                    </BlurView>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.propertyDetails, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Property Details</Text>
              {property.Furnishing && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>
                    Furnishing:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {property.Furnishing}
                  </Text>
                </View>
              )}
              {property.Developer && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>
                    Developer:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {property.Developer}
                  </Text>
                </View>
              )}
              {property.Building_Rating && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>
                    Building Rating:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {property.Building_Rating}/5 ⭐
                  </Text>
                </View>
              )}
              {property.District && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>
                    District:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    District {property.District}
                  </Text>
                </View>
              )}
              {property.Date_Listed && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>
                    Listed:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {formatDate(property.Date_Listed)}
                  </Text>
                </View>
              )}
            </View>

            {/* ✨ Accessibility & Features Section */}
            {(property.wheelchair_accessible || 
              property.bathroom_type || 
              property.kitchen_type || 
              property.parking_spaces_allocated) && (
              <View style={[
                styles.accessibilitySection, 
                { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
              ]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  ♿ Accessibility & Features
                </Text>
                
                {property.wheelchair_accessible && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>
                      Wheelchair Access:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {property.wheelchair_accessible}
                    </Text>
                  </View>
                )}
                
                {property.kitchen_type && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>
                      Kitchen Type:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {property.kitchen_type}
                    </Text>
                  </View>
                )}
                
                {property.bathroom_type && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>
                      Bathroom Type:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {property.bathroom_type}
                    </Text>
                  </View>
                )}
                
                {property.parking_spaces_allocated && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>
                      Parking Spaces:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {property.parking_spaces_allocated}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={[styles.agentInfo, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Information</Text>
              <View style={styles.agentDetails}>
                {property.Agent_Name && (
                  <View style={styles.agentRow}>
                    <Text style={[styles.agentLabel, { color: theme.tabIconDefault }]}>
                      Agent:
                    </Text>
                    <Text style={[styles.agentName, { color: theme.text }]}>
                      {property.Agent_Name}
                    </Text>
                  </View>
                )}
                {property.Agency_Name && (
                  <View style={styles.agentRow}>
                    <Text style={[styles.agentLabel, { color: theme.tabIconDefault }]}>
                      Agency:
                    </Text>
                    <Text style={[styles.agentValue, { color: theme.text }]}>
                      {property.Agency_Name}
                    </Text>
                  </View>
                )}
                {property.Agent_Phone && (
                  <Text style={[styles.agentPhone, { color: theme.primary }]}>
                    📞 {property.Agent_Phone}
                  </Text>
                )}
              </View>

              {property.Latitude && property.Longitude && (
                <View style={styles.mapViewSection}>
                  <TouchableOpacity
                    style={[styles.viewOnMapButton, { backgroundColor: theme.primary }]}
                    onPress={() => handleViewOnMap(property)}
                  >
                    <MapPin size={20} color="white" />
                    <Text style={styles.viewOnMapText}>View on Map</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.contactButtons}>
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleCall(property.Agent_Phone!)}
                >
                  <Phone size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: '#25D366' }]}
                  onPress={() => handleWhatsApp(property.Agent_Phone!)}
                >
                  <MessageCircle size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleLocationPick(property)}
                >
                  <MapPin size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: theme.tabIconDefault }]}
                  onPress={() => handleShare(property)}
                >
                  {copySuccess === (property.Building_Name || property.Location) ? (
                    <Check size={20} color="white" />
                  ) : Platform.OS === 'web' && !navigator.share ? (
                    <Copy size={20} color="white" />
                  ) : (
                    <Share2 size={20} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>
      </BlurView>
    );
  };

  const AnimatedBackground = () => {
    const translateX1 = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [-screenWidth, screenWidth],
    });

    const translateY1 = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 100],
    });

    const rotate1 = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const translateX2 = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [screenWidth * 0.8, -screenWidth * 0.6],
    });

    const translateY2 = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [150, -80],
    });

    const rotate2 = animatedValue2.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '-270deg'],
    });

    const translateX3 = animatedValue3.interpolate({
      inputRange: [0, 1],
      outputRange: [-screenWidth * 0.3, screenWidth * 0.7],
    });

    const translateY3 = animatedValue3.interpolate({
      inputRange: [0, 1],
      outputRange: [200, -150],
    });

    const rotate3 = animatedValue3.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    return (
      <View style={StyleSheet.absoluteFillObject}>
        <Animated.View
          style={[
            styles.animatedOrb,
            {
              transform: [
                { translateX: translateX1 },
                { translateY: translateY1 },
                { rotate: rotate1 },
              ],
              backgroundColor: isDarkMode ? `${theme.primary}1A` : `${theme.primary}0D`,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.animatedOrb2,
            {
              transform: [
                { translateX: translateX2 },
                { translateY: translateY2 },
                { rotate: rotate2 },
              ],
              backgroundColor: isDarkMode ? `${theme.tabIconDefault}14` : `${theme.tabIconDefault}0A`,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.animatedOrb3,
            {
              transform: [
                { translateX: translateX3 },
                { translateY: translateY3 },
                { rotate: rotate3 },
              ],
              backgroundColor: isDarkMode ? `${theme.primary}12` : `${theme.primary}08`,
            },
          ]}
        />
      </View>
    );
  };

  const renderUserMessage = (message: Message) => {
    return (
      <BlurView intensity={80} tint="dark" style={styles.userMessageBlur}>
        <LinearGradient
          colors={[`${theme.primary}E6`, `${theme.primary}B3`]}
          style={styles.userMessageGradient}
        >
          <Text style={styles.userMessageText}>{message.text}</Text>
          <Text style={styles.userTimestamp}>
            {message.timestamp.toLocaleTimeString()}
          </Text>
        </LinearGradient>
      </BlurView>
    );
  };

const renderBotMessage = (message: Message) => {
  return (
    <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={styles.botMessageBlur}>
      <LinearGradient
        colors={isDarkMode 
          ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
          : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']
        }
        style={styles.botMessageGradient}
      >
        {message.audioUrl ? (
          <AudioPlayer audioUrl={message.audioUrl} theme={theme} />
        ) : (
          <View style={styles.messageTextContainer}>
            {renderFormattedText(message.text)}
          </View>
        )}
        
  {/* ✅ IMAGE RENDERING */}
{message.images && message.images.length > 0 && (
  <FloorPlanImages 
    images={message.images} 
    theme={theme} 
    isDarkMode={isDarkMode} 
  />
)}
        
        <Text style={[styles.botTimestamp, { color: theme.tabIconDefault }]}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </LinearGradient>
    </BlurView>
  );
};

  const renderFormattedText = (text: string) => {
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, paragraphIndex) => {
      const lines = paragraph.split('\n');
      
      return (
        <View key={paragraphIndex} style={styles.paragraphContainer}>
          {lines.map((line, lineIndex) => {
            const trimmedLine = line.trim();
            
            if (trimmedLine.match(/^\d+\./)) {
              return (
                <View key={lineIndex} style={styles.numberedListItem}>
                  <Text style={[styles.listNumber, { color: theme.primary }]}>
                    {trimmedLine.match(/^\d+\./)?.[0]}
                  </Text>
                  <Text style={[styles.listText, { color: theme.text }]}>
                    {trimmedLine.replace(/^\d+\.\s*/, '')}
                  </Text>
                </View>
              );
            }
            
            if (trimmedLine.startsWith('•')) {
              return (
                <View key={lineIndex} style={styles.bulletListItem}>
                  <Text style={[styles.bulletPoint, { color: theme.primary }]}>•</Text>
                  <Text style={[styles.listText, { color: theme.text }]}>
                    {trimmedLine.replace(/^•\s*/, '')}
                  </Text>
                </View>
              );
            }
            
            if (trimmedLine.match(/^\*\*(What|How|Where|When|Why|Which).*\*\*$/)) {
              return (
                <Text key={lineIndex} style={[styles.questionText, { color: theme.primary }]}>
                  {trimmedLine.replace(/\*\*/g, '')}
                </Text>
              );
            }
            
            if (trimmedLine) {
              return (
                <Text key={lineIndex} style={[styles.messageText, { color: theme.text }]}>
                  {trimmedLine}
                </Text>
              );
            }
            
            return null;
          })}
        </View>
      );
    });
  };

  const renderMessageContent = (message: Message) => {
    return (
      <View style={styles.messageContentContainer}>
        {message.text && (
          message.isUser ? renderUserMessage(message) : renderBotMessage(message)
        )}
        
        {message.properties && message.properties.length > 0 && (
          <View style={styles.propertiesContainer}>
            {message.properties.map((property, index) => (
              <View key={index} style={styles.propertyWrapper}>
                {renderProperty(property)}
              </View>
            ))}
          </View>
        )}
        {message.properties && message.properties.length > 1 && (
  <View style={styles.viewAllContainer}>
    <TouchableOpacity
      style={[styles.viewAllButton, { backgroundColor: theme.primary }]}
      onPress={() => handleViewAllOnMap(message.properties!)}
    >
      <MapPin size={20} color="white" />
      <Text style={styles.viewAllText}>
        View All {message.properties.length} Properties on Map
      </Text>
    </TouchableOpacity>
  </View>
)}
      </View>
    );
  };

  const startRecording = async () => {
    setIsRecording(true);
    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks: Blob[] = [];
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          await sendMessage(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
      } catch (error) {
        console.error('Error starting audio recording:', error);
        alert('Could not access microphone. Please check permissions.');
        setIsRecording(false);
      }
    } else {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
      } catch (error) {
        console.error('Error starting recording:', error);
        alert('Could not start recording. Please check permissions.');
        setIsRecording(false);
      }
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (Platform.OS === 'web') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
    } else {
      if (!recording) return;

      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        const uri = recording.getURI();
        setRecording(null);

        if (uri) {
          await sendMessage(undefined, uri);
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
  };

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isRecording) {
      timeout = setTimeout(() => {
        stopRecording();
      }, 10000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isRecording]);

  const handleMicrophonePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDarkMode 
          ? ['#000000', '#1a1a1a', '#000000']
          : ['#f8f9fa', '#ffffff', '#f0f2f5']
        }
        style={StyleSheet.absoluteFillObject}
      />
      <AnimatedBackground />

      <ScrollView
        ref={scrollViewRef}
        style={[styles.messagesContainer, Platform.OS === 'web' && { scrollbarWidth: 'thin' }]}
        contentContainerStyle={styles.messagesList}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled">
        
  {messages.length > 0 && (
  <View style={styles.exportButtonContainer}>
    <TouchableOpacity
      style={[styles.clearSessionButton, { backgroundColor: theme.notification }]}
      onPress={handleClearSession}
    >
      <RotateCcw size={18} color="white" />
      <Text style={styles.clearSessionButtonText}>Clear</Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={[styles.exportButton, { backgroundColor: theme.primary }]}
      onPress={() => setShowExportModal(true)}
    >
      <Download size={20} color="white" />
      <Text style={styles.exportButtonText}>Export</Text>
    </TouchableOpacity>
  </View>
)}
        
        {messages.map((message) => (
          <View 
            key={message.id} 
            style={styles.messageContainer}
            onLayout={(event) => {
              const { y } = event.nativeEvent.layout;
              messagePositionsRef.current[message.id] = y;
            }}
          >
            {renderMessageContent(message)}
          </View>
        ))}
        {isProcessing && (
          <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={styles.thinkingContainer}>
            <LinearGradient
              colors={isDarkMode 
                ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']
              }
              style={styles.thinkingGradient}
            >
              <Brain size={24} color={theme.primary} />
              <ActivityIndicator size="small" color={theme.primary} style={styles.thinkingSpinner} />
              <Text style={[styles.thinkingText, { color: theme.text }]}>Thinking...</Text>
            </LinearGradient>
          </BlurView>
        )}
      </ScrollView>

      <BlurView intensity={100} tint={isDarkMode ? 'dark' : 'light'} style={styles.inputContainer}>
        <LinearGradient
          colors={isDarkMode 
            ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
            : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']
          }
          style={styles.inputGradient}
        >
          <BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={styles.inputBlur}>
            <View style={[styles.inputBackground, { 
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor={theme.tabIconDefault}
              multiline
            />
            </View>
          </BlurView>

   <TouchableOpacity
          onPress={handleMicrophonePress}
          style={[
            styles.iconButton,
            styles.micButton,
            isRecording && [styles.recordingButton, { backgroundColor: theme.notification }],
          ]}>
          <Mic 
            size={24} 
            color={isRecording ? 'white' : theme.primary}
            style={isRecording ? { opacity: 0.8 } : {}}
          />
        </TouchableOpacity>

        {/* ✅ Three-state button logic */}
        {showCancelButton ? (
          // Show X button (only after 300ms delay)
          <TouchableOpacity 
            onPress={handleCancelSend} 
            style={[styles.iconButton, { backgroundColor: theme.notification }]}
          >
            <XIcon size={24} color="white" />
          </TouchableOpacity>
        ) : isSending ? (
          // Show spinner during first 300ms
          <View style={[styles.iconButton, { opacity: 0.7 }]}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : (
          // Show send button when not sending
          <TouchableOpacity 
            onPress={() => sendMessage()} 
            style={styles.iconButton}
            disabled={!inputText.trim()}
          >
            <Send 
              size={24} 
              color={inputText.trim() ? theme.primary : theme.tabIconDefault} 
            />
          </TouchableOpacity>
        )}
        
        </LinearGradient>
      </BlurView>
      
      <ChatExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        messages={messages}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  animatedOrb: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    top: '15%',
    left: '5%',
  },
  animatedOrb2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: '45%',
    right: '10%',
  },
  animatedOrb3: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: '70%',
    left: '20%',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messagesList: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 8,
    alignItems: 'flex-start',
    width: '100%',
  },
  messageContentContainer: {
    width: '100%',
  },
  userMessageBlur: {
    maxWidth: '80%',
    alignSelf: 'flex-end',
    borderRadius: 20,
    overflow: 'hidden',
    marginLeft: '20%',
    marginVertical: 4,
  },
  userMessageGradient: {
    padding: 16,
    borderRadius: 20,
  },
  userMessageText: {
    fontSize: 16,
    color: 'white',
    lineHeight: 22,
    marginBottom: 8,
    fontFamily: 'PorscheDesign-Regular',
  },
  userTimestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
    fontFamily: 'PorscheDesign-Light',
  },
  botMessageBlur: {
    maxWidth: '80%',
    alignSelf: 'flex-start',
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: '20%',
    marginVertical: 4,
  },
  botMessageGradient: {
    padding: 16,
    borderRadius: 20,
  },
  botTimestamp: {
    fontSize: 12,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'PorscheDesign-Regular',
  },
  inputContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    zIndex: 1000,
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    gap: 12,
  },
  inputBlur: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
  },
  inputBackground: {
    flex: 1,
    borderRadius: 30,
    borderWidth: 1,
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 100,
    minHeight: 50,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'PorscheDesign-Medium',
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  micButton: {
    marginRight: 8,
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  propertiesContainer: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  propertyWrapper: {
    width: '100%',
  },
  propertyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    width: '100%',
  },
  propertyGradient: {
    borderRadius: 16,
  },
  propertyContent: {
    padding: 20,
  },
  propertyHeader: {
    marginBottom: 12,
  },
  propertyHeaderLeft: {
    flex: 1,
  },
  propertyName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    flexWrap: 'wrap',
    fontFamily: 'PorscheDesign-Bold',
  },
  propertyId: {
    fontSize: 13,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  propertyBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  transactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  offPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'PorscheDesign-Bold',
  },
  propertyType: {
    fontSize: 15,
    marginBottom: 12,
    flexWrap: 'wrap',
    fontFamily: 'PorscheDesign-Regular',
  },
  priceContainer: {
    marginBottom: 16,
  },
  propertyPrice: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    flexWrap: 'wrap',
    fontFamily: 'PorscheDesign-Bold',
  },
  pricePerMonth: {
    fontSize: 14,
    fontFamily: 'PorscheDesign-Regular',
  },
  specsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    minWidth: 90,
  },
  specIcon: {
    fontSize: 18,
  },
  specText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'PorscheDesign-Medium',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'PorscheDesign-SemiBold',
  },
  propertyFeatures: {
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  featureText: {
    fontSize: 13,
    fontFamily: 'PorscheDesign-Regular',
  },
  propertyDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'PorscheDesign-Regular',
    flex: 0.4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
    flex: 0.6,
    textAlign: 'right',
  },
  agentInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  agentDetails: {
    marginBottom: 16,
    gap: 8,
  },
  agentRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  agentLabel: {
    fontSize: 13,
    fontFamily: 'PorscheDesign-Regular',
    minWidth: 60,
  },
  agentName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
    flex: 1,
  },
  agentValue: {
    fontSize: 15,
    fontFamily: 'PorscheDesign-Regular',
    flex: 1,
  },
  agentPhone: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
    fontFamily: 'PorscheDesign-Medium',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  thinkingContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginVertical: 5,
    maxWidth: '80%',
    marginRight: '20%',
  },
  thinkingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  thinkingSpinner: {
    marginHorizontal: 8,
  },
  thinkingText: {
    fontSize: 16,
    fontFamily: 'PorscheDesign-Regular',
  },
  messageTextContainer: {
    gap: 8,
  },
  paragraphContainer: {
    marginBottom: 12,
    gap: 4,
  },
  numberedListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingLeft: 8,
  },
  bulletListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingLeft: 8,
  },
  listNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 24,
    fontFamily: 'PorscheDesign-SemiBold',
  },
  bulletPoint: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 16,
    fontFamily: 'PorscheDesign-SemiBold',
  },
  listText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
    fontFamily: 'PorscheDesign-Regular',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginVertical: 4,
    fontFamily: 'PorscheDesign-SemiBold',
  },
exportButtonContainer: {
  flexDirection: 'row',  // ✅ CHANGED: from column to row
  alignItems: 'center',  // ✅ ADDED
  justifyContent: 'flex-end',  // ✅ ADDED
  marginBottom: 16,
  paddingHorizontal: 4,
},
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  audioPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  audioPlayerIcon: {
    fontSize: 20,
  },
 audioPlayerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',   
  },
  mapViewSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  viewOnMapText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  viewAllContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  viewAllText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
  },

   binghattiBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  
  ultraLuxuryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  
  ultraLuxuryBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'PorscheDesign-Bold',
  },
  
  featuredBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  featuredBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'PorscheDesign-Bold',
  },
  
  binghattiSpecialBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  binghattiSpecialBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  
  // Binghatti Special Section
  binghattiSpecialSection: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  
  binghattiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  
  binghattiSpecialIcon: {
    fontSize: 18,
  },
  
  binghattiSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
  },
  
  binghattiFeatureRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 4,
  },
  
  binghattiFeatureBullet: {
    fontSize: 14,
    marginRight: 8,
    color: '#FFD700',
    fontWeight: '700',
  },
  
  binghattiFeatureText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
    fontFamily: 'PorscheDesign-Regular',
  },
  
  // Investment Section
  binghattiInvestmentSection: {
    backgroundColor: 'rgba(0, 200, 83, 0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.2)',
  },
  
  investmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  
  investmentItem: {
    flex: 1,
    minWidth: '45%',
  },
  
  investmentLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontFamily: 'PorscheDesign-Regular',
  },
  
  investmentValue: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  
  premiumCallout: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  
  premiumCalloutText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
    lineHeight: 16,
  },
distanceBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  distanceBadgeText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  
  // Accessibility section
  accessibilitySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    marginBottom: 12,
  },

  openHouseBadge: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  shadowColor: '#00C853',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 3,
  elevation: 4,
},

openHouseBadgeText: {
  color: 'white',
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 0.5,
  fontFamily: 'PorscheDesign-Bold',
},

clearSessionButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 20,
  gap: 6,
  marginRight: 8,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
},
clearSessionButtonText: {
  color: 'white',
  fontSize: 13,
  fontWeight: '600',
  fontFamily: 'PorscheDesign-SemiBold',
},

  floorPlanImagesContainer: {
  marginTop: 16,
  marginBottom: 12,
},

imagesSectionTitle: {
  fontSize: 16,
  fontWeight: '600',
  marginBottom: 12,
  fontFamily: 'PorscheDesign-SemiBold',
},

imagesGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
},

imageWrapper: {
  width: '48%',
  aspectRatio: 1,
  borderRadius: 12,
  overflow: 'hidden',
},

imageBlurContainer: {
  width: '100%',
  height: '100%',
  borderRadius: 12,
  overflow: 'hidden',
  position: 'relative',
},

floorPlanImage: {
  width: '100%',
  height: '100%',
  backgroundColor: 'transparent', 
},

imageLoadingContainer: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  gap: 8,
  backgroundColor: 'rgba(0,0,0,0.05)', 
},

imageLoadingText: {
  fontSize: 12,
  fontFamily: 'PorscheDesign-Regular',
},

imageErrorContainer: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 8,
},

imageErrorIcon: {
  fontSize: 32,
  opacity: 0.5,
},

imageErrorText: {
  fontSize: 12,
  fontFamily: 'PorscheDesign-Regular',
},

imageOverlay: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: 8,
  opacity: 0.95,
},

imageLabel: {
  fontSize: 12,
  fontWeight: '600',
  fontFamily: 'PorscheDesign-SemiBold',
  marginBottom: 2,
},

imageTapHint: {
  fontSize: 10,
  fontFamily: 'PorscheDesign-Light',
},

  imageModalOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999,
},

imageModalCloseButton: {
  position: 'absolute',
  top: Platform.OS === 'ios' ? 60 : 40,
  right: 20,
  zIndex: 10000,
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},

imageModalScrollContent: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingVertical: 100,
},

imageModalFullImage: {
  width: screenWidth - 40,
  height: '100%',
  maxHeight: 800,
},

imageModalFooter: {
  position: 'absolute',
  bottom: Platform.OS === 'ios' ? 60 : 40,
  left: 0,
  right: 0,
  alignItems: 'center',
},

imageModalHint: {
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: 14,
  fontFamily: 'PorscheDesign-Regular',
},

  imageErrorSubtext: {
  fontSize: 10,
  fontFamily: 'PorscheDesign-Light',
  marginTop: 4,
},

imageModalHeader: {
  position: 'absolute',
  top: Platform.OS === 'ios' ? 60 : 40,
  left: 20,
  right: 80,
  zIndex: 10001,
},

imageModalTitle: {
  color: 'white',
  fontSize: 18,
  fontWeight: '600',
  fontFamily: 'PorscheDesign-SemiBold',
},

imageLoadingOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 12,
},

imageErrorOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.85)',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 8,
},

imageErrorHint: {
  fontSize: 11,
  marginTop: 4,
  fontFamily: 'PorscheDesign-Light',
},
  
});
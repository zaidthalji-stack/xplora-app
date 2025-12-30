import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Calendar,
  Building2,
  User,
  Phone,
  Home,
  Zap,
  Car,
  Droplet,
  Wind,
  Wifi,
  Flame,
  Accessibility,
  DoorOpen,
  ChefHat,
  Eye,
  Clock,
  Layers,
  Navigation,
  MessageSquare,
  Info,
  BarChart3,
  Wrench,
  TrendingUp,
  Share2,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { PropertyImageCarousel } from '@/components/PropertyImageCarousel';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.92;
const SHEET_MIN_HEIGHT = 180;
const SNAP_POINTS = [SHEET_MIN_HEIGHT, SCREEN_HEIGHT * 0.5, SHEET_MAX_HEIGHT];

interface PropertyBottomSheetProps {
  property: any;
  onClose: () => void;
  onAskAI?: () => void;
  onNavigate?: () => void;
}

type MainTabType = 'details' | 'insights';
type DetailsSubTabType = 'overview' | 'more';
type MoreSubTabType = 'unit' | 'building' | 'utilities' | 'agent';

export const PropertyBottomSheet: React.FC<PropertyBottomSheetProps> = ({
  property,
  onClose,
  onAskAI,
  onNavigate,
}) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>('details');
  const [activeDetailsSubTab, setActiveDetailsSubTab] = useState<DetailsSubTabType>('overview');
  const [activeMoreSubTab, setActiveMoreSubTab] = useState<MoreSubTabType>('unit');
  const [insights, setInsights] = useState<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [currentProperty, setCurrentProperty] = useState(property);
 
  // Content transition animation
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
 
  // Animated height
  const sheetHeight = useRef(new Animated.Value(SNAP_POINTS[0])).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const lastScrollY = useRef(0);
  const gestureStartScrollY = useRef(0);
 
  const propertyNameScale = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  // Smooth property transition when property changes
  useEffect(() => {
    if (property.Property_ID !== currentProperty.Property_ID) {
      console.log('🔄 Property changed, animating transition');
     
      // Animate out
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Update property
        setCurrentProperty(property);
        setInsights(null);
       
        // Scroll to top
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
       
        // Animate in
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(contentScale, {
            toValue: 1,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [property.Property_ID]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        lastScrollY.current = offsetY;
        const shouldExpand = offsetY < 50;
        if (shouldExpand !== isHeaderExpanded) {
          setIsHeaderExpanded(shouldExpand);
        }
      }
    }
  );

  React.useEffect(() => {
    const currentSheetHeight = (sheetHeight as any)._value;
    const isInitialMount = currentSheetHeight === 0;
   
    if (isInitialMount) {
      Animated.spring(sheetHeight, {
        toValue: SNAP_POINTS[0],
        tension: 80,
        friction: 14,
        useNativeDriver: false,
      }).start();
    }

    if (activeMainTab === 'insights' && !insights) {
      fetchInsights();
    }
  }, [activeMainTab]);

  const snapToNearest = (currentHeight: number, velocity: number) => {
    let nearestSnap = SNAP_POINTS[0];
    let minDistance = Math.abs(currentHeight - SNAP_POINTS[0]);
   
    SNAP_POINTS.forEach(snap => {
      const distance = Math.abs(currentHeight - snap);
      if (distance < minDistance) {
        minDistance = distance;
        nearestSnap = snap;
      }
    });

    if (velocity < -0.5 && nearestSnap < SHEET_MAX_HEIGHT) {
      const currentIndex = SNAP_POINTS.indexOf(nearestSnap);
      if (currentIndex < SNAP_POINTS.length - 1) {
        nearestSnap = SNAP_POINTS[currentIndex + 1];
      }
    } else if (velocity > 0.5 && nearestSnap > SHEET_MIN_HEIGHT) {
      const currentIndex = SNAP_POINTS.indexOf(nearestSnap);
      if (currentIndex > 0) {
        nearestSnap = SNAP_POINTS[currentIndex - 1];
      }
    }

    return nearestSnap;
  };

  const fetchInsights = async () => {
    setTimeout(() => {
      setInsights({
        currentPrice: property.Price,
        marketComparison: {
          averagePrice: 95000,
          sampleSize: 127,
          percentageAbove: 4782.6,
          medianPrice: 92000,
          percentageMedian: 4941.9,
        },
        transactionTrends: {
          cluster: {
            name: 'Cluster C',
            subtitle: 'Same building, 1 bed units',
            averagePrice: 94500,
            transactions: 8,
            trend: 2.3,
          },
          regional: {
            name: 'Dubai, UAE',
            subtitle: '1 bed, ~1080 sqft',
            averagePrice: 98200,
            transactions: 342,
            trend: 1.8,
          },
        },
        reraIndex: {
          current: 108.5,
          quarter: 'Q3 2024',
          change: 2.2,
          description: 'The RERA Rental Index tracks rental price movements in Dubai. A value above 100 indicates rental growth, while trending upward suggests increasing demand.',
        },
        valueAssessment: {
          rating: 'Good Value',
          confidence: 85,
          factors: [
            'Price is 1.5% below market average',
            'Building has strong transaction history',
            'RERA Index shows positive market growth',
            'Similar properties trending upward',
          ],
        },
      });
    }, 1000);
  };

  const handleClose = () => {
    Animated.spring(sheetHeight, {
      toValue: 0,
      tension: 80,
      friction: 14,
      useNativeDriver: false,
    }).start(() => {
      onClose();
    });
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    {
      useNativeDriver: false,
    }
  );

const onHandlerStateChange = (event: any) => {
  if (event.nativeEvent.oldState === State.BEGAN) {
    gestureStartScrollY.current = lastScrollY.current;
  }
 
  if (event.nativeEvent.oldState === State.ACTIVE) {
    const { translationY: ty, velocityY } = event.nativeEvent;
    const currentHeight = (sheetHeight as any)._value;
    const scrollOffset = lastScrollY.current;
   
    const scrolledDownFromStart = scrollOffset > gestureStartScrollY.current + 10;
    const isAtMinimumHeight = currentHeight <= SHEET_MIN_HEIGHT + 10;
    const isAtScrollTop = scrollOffset <= 15;
    const isDraggingDown = ty > 0;
    const isDraggingUp = ty < 0;
    
    // ✅ NEW: Detect fast upward swipe to expand sheet (even when scrolled)
    const isFastUpwardSwipe = isDraggingUp && velocityY < -800 && ty < -30;
    const isSheetNotMaximized = currentHeight < SHEET_MAX_HEIGHT * 0.9;
    
    // ✅ NEW: Allow sheet expansion on fast upward swipe
   if (isFastUpwardSwipe && isSheetNotMaximized) {
  // Calculate new height based on swipe distance
  const newHeight = Math.max(SHEET_MIN_HEIGHT, Math.min(SHEET_MAX_HEIGHT, currentHeight - ty));
  
  // Let snapToNearest decide which snap point (min/middle/max) based on velocity
  const targetHeight = snapToNearest(newHeight, velocityY / 1000);
  
  Animated.spring(sheetHeight, {
    toValue: targetHeight,
    tension: 80,
    friction: 14,
    velocity: -velocityY / 1000,
    useNativeDriver: false,
  }).start();
 
  translateY.setValue(0);
  return;
}
    
    const isSheetGesture = isAtScrollTop || (isDraggingDown && !scrolledDownFromStart);
    const shouldAllowSheetDrag = (isAtMinimumHeight && isDraggingDown) || isSheetGesture;
   
    if (!shouldAllowSheetDrag) {
      translateY.setValue(0);
      return;
    }
   
const newHeight = Math.max(SHEET_MIN_HEIGHT, Math.min(SHEET_MAX_HEIGHT, currentHeight - ty));
const isAtMaxHeight = currentHeight >= SHEET_MAX_HEIGHT * 0.85;
const closeThreshold = isAtMaxHeight ? 200 : 100;

if (newHeight < SHEET_MIN_HEIGHT * 0.7 || (velocityY > 1500 && currentHeight <= SHEET_MIN_HEIGHT * 1.2)) {
  handleClose();
  return;
}
   
    const targetHeight = snapToNearest(newHeight, velocityY / 1000);
   
    Animated.spring(sheetHeight, {
      toValue: targetHeight,
      tension: 80,
      friction: 14,
      velocity: -velocityY / 1000,
      useNativeDriver: false,
    }).start();
   
    translateY.setValue(0);
  }
};
  
  const formatPrice = (price: number) => {
    if (!price) return 'N/A';
    return price.toLocaleString('en-AE');
  };

  const transactionType = property.Transaction_Type?.toLowerCase() || '';
  const isForSale = transactionType.includes('sale') || transactionType.includes('buy');

  const getFeatureTags = () => {
    if (!property.Features) return [];
    const features = property.Features.split(',').map((f: string) => f.trim());
    return features.filter((f: string) => f.length > 0);
  };

  const handleCall = () => {
    if (property.Agent_Phone) {
      Linking.openURL(`tel:${property.Agent_Phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (property.Agent_Phone) {
      const phoneNumber = property.Agent_Phone.replace(/[^0-9]/g, '');
      Linking.openURL(`https://wa.me/${phoneNumber}`);
    }
  };

  const handleShare = async () => {
    const propertyName = property.Building_Name || property.Location;
    setCopySuccess(propertyName);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const featureTags = getFeatureTags();

  const renderInfoItem = (icon: React.ReactNode, label: string, value: string | number | null | undefined) => {
    if (!value) return null;
   
    return (
      <View style={styles.infoItemWrapper}>
        <BlurView intensity={40} tint="dark" style={styles.infoItemBlur}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              {icon}
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>{label}</Text>
              <Text style={[styles.infoValue, { color: '#FFFFFF' }]}>
                {value}
              </Text>
            </View>
          </View>
        </BlurView>
      </View>
    );
  };

  const renderInfoCard = (
    icon: React.ReactNode,
    label: string,
    value: string | number | null | undefined,
    fullWidth?: boolean
  ) => {
    if (!value) return null;
    return (
      <View style={[styles.infoCardWrapper, fullWidth && styles.fullWidth]}>
        <BlurView intensity={40} tint="dark" style={styles.infoCardBlur}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              {icon}
            </View>
            <View style={styles.infoCardContent}>
              <Text style={[styles.infoCardLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>{label}</Text>
              <Text
                style={[styles.infoCardValue, { color: '#FFFFFF' }]}
              >
                {value}
              </Text>
            </View>
          </View>
        </BlurView>
      </View>
    );
  };

const renderOverviewTab = () => (
    <View style={styles.tabContentView}>
      <View style={styles.quickStats}>
        {property.Bedrooms && (
          <BlurView intensity={40} tint="dark" style={styles.statBadgeBlur}>
            <View style={styles.statBadge}>
              <Bed size={16} color="#FFFFFF" />
              <Text style={styles.statBadgeText}>
                {property.Bedrooms} Bed{property.Bedrooms > 1 ? 's' : ''}
              </Text>
            </View>
          </BlurView>
        )}
        {property.Bathrooms && (
          <BlurView intensity={40} tint="dark" style={styles.statBadgeBlur}>
            <View style={styles.statBadge}>
              <Bath size={16} color="#FFFFFF" />
              <Text style={styles.statBadgeText}>
                {property.Bathrooms} Bath{property.Bathrooms > 1 ? 's' : ''}
              </Text>
            </View>
          </BlurView>
        )}
        {property['Property_Size_(sqft)'] && (
          <BlurView intensity={40} tint="dark" style={styles.statBadgeBlur}>
            <View style={styles.statBadge}>
              <Maximize size={16} color="#FFFFFF" />
              <Text style={styles.statBadgeText}>
                {property['Property_Size_(sqft)'].toLocaleString()} sqft
              </Text>
            </View>
          </BlurView>
        )}
      </View>

      {/* ✨ NEW: Distance Badge for Proximity Search */}
      {property.distance_km && (
        <View style={styles.distanceBadgeContainer}>
          <BlurView intensity={40} tint="dark" style={styles.distanceBadgeBlur}>
            <View style={styles.distanceBadge}>
              <MapPin size={16} color="#007AFF" />
              <Text style={styles.distanceBadgeText}>
                {property.distance_km.toFixed(1)}km from search location
              </Text>
            </View>
          </BlurView>
        </View>
      )}
   {/* ✅ NEW: Open House Information */}
{property.open_house_status?.toLowerCase() === 'scheduled' && (
  <View style={styles.openHouseSection}>
    <BlurView intensity={40} tint="dark" style={styles.openHouseSectionBlur}>
      <View style={styles.openHouseCard}>
        <View style={styles.openHouseHeader}>
          <Text style={styles.openHouseIcon}>🏠</Text>
          <Text style={[styles.openHouseTitle, { color: '#00C853' }]}>
            Open House Scheduled
          </Text>
        </View>
        {property.open_house_date && (
          <View style={styles.openHouseDetail}>
            <Calendar size={16} color="rgba(255, 255, 255, 0.6)" />
            <Text style={[styles.openHouseText, { color: '#FFFFFF' }]}>
              {new Date(property.open_house_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
        )}
        {property.viewing_availability && (
          <View style={styles.openHouseDetail}>
            <Clock size={16} color="rgba(255, 255, 255, 0.6)" />
            <Text style={[styles.openHouseText, { color: '#FFFFFF' }]}>
              {property.viewing_availability}
            </Text>
          </View>
        )}
      </View>
    </BlurView>
  </View>
)}
      {featureTags.length > 0 && (
        <View style={styles.featureTagsContainer}>
          <View style={styles.featureTags}>
            {featureTags.slice(0, 6).map((feature: string, index: number) => (
              <BlurView key={index} intensity={40} tint="dark" style={styles.featureTagBlur}>
                <View style={styles.featureTag}>
                  <Text style={styles.featureTagText}>
                    {feature}
                  </Text>
                </View>
              </BlurView>
            ))}
          </View>
        </View>
      )}

      <View style={styles.infoGrid}>
        {renderInfoItem(<Home size={16} color={theme.primary} />, 'Property Type', property.Property_Type)}
        {renderInfoItem(<Building2 size={16} color={theme.primary} />, 'Building', property.Building_Name)}
        {renderInfoItem(<MapPin size={16} color={theme.primary} />, 'Location', property.Location)}
        {renderInfoItem(<Home size={16} color={theme.primary} />, 'Furnishing', property.Furnishing)}
        {renderInfoItem(<Building2 size={16} color={theme.primary} />, 'Developer', property.Developer)}
        {renderInfoItem(<Building2 size={16} color={theme.primary} />, 'Building Rating', property.Building_Rating ? `${property.Building_Rating}/5` : null)}
        {renderInfoItem(<Calendar size={16} color={theme.primary} />, 'Listed', property.Date_Listed)}
      </View>

      {property.Agent_Name && (
        <View style={styles.agentCardWrapper}>
          <BlurView intensity={40} tint="dark" style={styles.agentCardBlur}>
            <View style={styles.agentCard}>
              <View style={styles.agentHeader}>
                <Text style={[styles.agentLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>Agent:</Text>
                <Text style={[styles.agentName, { color: '#FFFFFF' }]}>{property.Agent_Name}</Text>
                {property.Agency_Name && (
                  <Text style={[styles.agencyName, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                    {property.Agency_Name}
                  </Text>
                )}
                {property.Agent_Phone && (
                  <Text style={[styles.agentPhone, { color: theme.primary }]}>
                    {property.Agent_Phone}
                  </Text>
                )}
              </View>
              <View style={styles.contactButtons}>
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: theme.primary }]}
                  onPress={handleCall}
                >
                  <Phone size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: '#25D366' }]}
                  onPress={handleWhatsApp}
                >
                  <MessageSquare size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}
                  onPress={handleShare}
                >
                  {copySuccess ? (
                    <Check size={18} color="white" />
                  ) : (
                    <Share2 size={18} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      )}

      {onAskAI && (
        <TouchableOpacity
          style={[styles.askAIButton, { backgroundColor: theme.primary }]}
          onPress={onAskAI}
        >
          <TrendingUp size={20} color="white" />
          <Text style={styles.askAIButtonText}>Ask AI About This Property</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </View>
  );

  const renderMoreTab = () => (
    <View style={styles.detailsTabContainer}>
      <View style={styles.subTabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subTabBar}
          contentContainerStyle={styles.subTabBarContent}
        >
          <TouchableOpacity
            style={[
              styles.subTab,
              activeMoreSubTab === 'unit' && [styles.subTabActive, { backgroundColor: theme.primary }],
              activeMoreSubTab !== 'unit' && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            ]}
            onPress={() => setActiveMoreSubTab('unit')}
          >
            <DoorOpen size={16} color={activeMoreSubTab === 'unit' ? 'white' : 'rgba(255, 255, 255, 0.6)'} />
            <Text
              style={[
                styles.subTabText,
                { color: activeMoreSubTab === 'unit' ? 'white' : 'rgba(255, 255, 255, 0.6)' },
              ]}
            >
              Unit Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subTab,
              activeMoreSubTab === 'building' && [styles.subTabActive, { backgroundColor: theme.primary }],
              activeMoreSubTab !== 'building' && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            ]}
            onPress={() => setActiveMoreSubTab('building')}
          >
            <Building2 size={16} color={activeMoreSubTab === 'building' ? 'white' : 'rgba(255, 255, 255, 0.6)'} />
            <Text
              style={[
                styles.subTabText,
                { color: activeMoreSubTab === 'building' ? 'white' : 'rgba(255, 255, 255, 0.6)' },
              ]}
            >
              Building
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subTab,
              activeMoreSubTab === 'utilities' && [styles.subTabActive, { backgroundColor: theme.primary }],
              activeMoreSubTab !== 'utilities' && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            ]}
            onPress={() => setActiveMoreSubTab('utilities')}
          >
            <Wrench size={16} color={activeMoreSubTab === 'utilities' ? 'white' : 'rgba(255, 255, 255, 0.6)'} />
            <Text
              style={[
                styles.subTabText,
                { color: activeMoreSubTab === 'utilities' ? 'white' : 'rgba(255, 255, 255, 0.6)' },
              ]}
            >
              Utilities
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subTab,
              activeMoreSubTab === 'agent' && [styles.subTabActive, { backgroundColor: theme.primary }],
              activeMoreSubTab !== 'agent' && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            ]}
            onPress={() => setActiveMoreSubTab('agent')}
          >
            <User size={16} color={activeMoreSubTab === 'agent' ? 'white' : 'rgba(255, 255, 255, 0.6)'} />
            <Text
              style={[
                styles.subTabText,
                { color: activeMoreSubTab === 'agent' ? 'white' : 'rgba(255, 255, 255, 0.6)' },
              ]}
            >
              Agent Info
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={styles.subTabContent} showsVerticalScrollIndicator={false}>
        {activeMoreSubTab === 'unit' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Unit Specifications</Text>
            <View style={styles.infoCardGrid}>
              {renderInfoCard(<Layers size={18} color={theme.primary} />, 'Floor Number', property.floor_number)}
              {renderInfoCard(<DoorOpen size={18} color={theme.primary} />, 'Unit Number', property.unit_number)}
              {renderInfoCard(<Navigation size={18} color={theme.primary} />, 'Wing/Side', property.wing_side, true)}
              {renderInfoCard(<ChefHat size={18} color={theme.primary} />, 'Kitchen Type', property.kitchen_type)}
              {renderInfoCard(<Droplet size={18} color={theme.primary} />, 'Bathroom Type', property.bathroom_type)}
              {renderInfoCard(<Accessibility size={18} color={theme.primary} />, 'Wheelchair Accessible', property.wheelchair_accessible)}
              {renderInfoCard(<Accessibility size={18} color={theme.primary} />, 'Accessibility Features', property.accessibility_features, true)}
              {renderInfoCard(<Eye size={18} color={theme.primary} />, 'Open House Status', property.open_house_status, true)}
              {renderInfoCard(<Calendar size={18} color={theme.primary} />, 'Open House Date', property.open_house_date, true)}
              {renderInfoCard(<Clock size={18} color={theme.primary} />, 'Viewing Availability', property.viewing_availability, true)}
            </View>
          </View>
        )}
        {activeMoreSubTab === 'building' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Building Specifications</Text>
            <View style={styles.infoCardGrid}>
              {renderInfoCard(<Building2 size={18} color={theme.primary} />, 'Classification', property.building_classification, true)}
              {renderInfoCard(<Building2 size={18} color={theme.primary} />, 'Building Rating', property.Building_Rating ? `${property.Building_Rating}/10` : null)}
              {renderInfoCard(<Layers size={18} color={theme.primary} />, 'Number of Elevators', property.number_of_elevators)}
              {renderInfoCard(<Layers size={18} color={theme.primary} />, 'Service Elevators', property.service_elevators)}
              {renderInfoCard(<Car size={18} color={theme.primary} />, 'Parking Spaces Allocated', property.parking_spaces_allocated)}
              {renderInfoCard(<Navigation size={18} color={theme.primary} />, 'Entry/Exit Points', property['Entry/Exit Points'])}
              {renderInfoCard(<Building2 size={18} color={theme.primary} />, 'Nearest Mall', property.Nearest_Mall, true)}
              {renderInfoCard(<Navigation size={18} color={theme.primary} />, 'Nearest Metro', property.Nearest_Metro, true)}
            </View>
          </View>
        )}
        {activeMoreSubTab === 'utilities' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Utility Providers</Text>
            <View style={styles.infoCardGrid}>
              {renderInfoCard(<Zap size={18} color={theme.primary} />, 'DEWA Premise Number', property.dewa_premise_number, true)}
              {renderInfoCard(<Wifi size={18} color={theme.primary} />, 'Telecom Provider', property.telecom_provider)}
              {renderInfoCard(<Wifi size={18} color={theme.primary} />, 'Telecom Account Number', property.telecom_account_number)}
              {renderInfoCard(<Flame size={18} color={theme.primary} />, 'Gas Provider', property.gas_provider, true)}
              {renderInfoCard(<Wind size={18} color={theme.primary} />, 'Chiller Provider', property.chiller_provider, true)}
            </View>
          </View>
        )}
        {activeMoreSubTab === 'agent' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Agent Contact Information</Text>
            <View style={styles.infoCardGrid}>
              {renderInfoCard(<User size={18} color={theme.primary} />, 'Agent Name', property.Agent_Name, true)}
              {renderInfoCard(<Phone size={18} color={theme.primary} />, 'Phone Number', property.Agent_Phone, true)}
              {renderInfoCard(<Building2 size={18} color={theme.primary} />, 'Agency Name', property.Agency_Name, true)}
              {renderInfoCard(<MapPin size={18} color={theme.primary} />, 'Agency Address', property.Agency_Address, true)}
              {renderInfoCard(<Building2 size={18} color={theme.primary} />, 'Agent License Number', property.Agent_License)}
              {renderInfoCard(<Building2 size={18} color={theme.primary} />, 'DLD Permit Number', property.DLD_Permit_Number)}
            </View>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );

  const renderInsightsTab = () => (
    <View style={styles.tabContentView}>
      <BlurView intensity={40} tint="dark" style={styles.insightsHeaderBlur}>
        <View style={styles.insightsHeaderCard}>
          <BarChart3 size={20} color={theme.primary} />
          <Text style={[styles.insightsHeaderText, { color: theme.primary }]}>Market Insights</Text>
        </View>
      </BlurView>

      <View style={styles.dataInsightsSection}>
        <Text style={[styles.dataInsightsTitle, { color: '#FFFFFF' }]}>Data Insights</Text>
        <Text style={[styles.dataInsightsSubtitle, { color: 'rgba(255, 255, 255, 0.6)' }]}>
          {property.Bedrooms} bed • {property['Property_Size_(sqft)']} sqft • {property.Building_Name}
        </Text>
        <BlurView intensity={40} tint="dark" style={styles.priceCardBlur}>
          <View style={styles.priceCard}>
            <Text style={[styles.priceCardLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>
              Current Listing Price
            </Text>
            <Text style={[styles.priceCardValue, { color: theme.primary }]}>
              AED {formatPrice(property.Price)}
            </Text>
          </View>
        </BlurView>
      </View>

      {!insights ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: 'rgba(255, 255, 255, 0.6)' }]}>
            Loading insights...
          </Text>
        </View>
      ) : (
        <>
          <BlurView intensity={40} tint="dark" style={styles.insightCardBlur}>
            <View style={styles.insightCard}>
              <View style={styles.insightCardHeader}>
                <BarChart3 size={20} color="#FFFFFF" />
                <Text style={[styles.insightCardTitle, { color: '#FFFFFF' }]}>Market Comparison</Text>
              </View>
              <Text style={[styles.insightCardSubtitle, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                Based on similar properties in your dataset
              </Text>
              <View style={styles.comparisonGrid}>
                <View style={styles.comparisonItem}>
                  <Text style={[styles.comparisonLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                    Average Price
                  </Text>
                  <Text style={[styles.comparisonValue, { color: '#FFFFFF' }]}>
                    AED {insights.marketComparison.averagePrice.toLocaleString()}
                  </Text>
                  <Text style={[styles.comparisonMeta, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                    {insights.marketComparison.sampleSize} similar properties
                  </Text>
                  <View style={styles.percentageBadge}>
                    <Text style={styles.percentageText}>
                      +{insights.marketComparison.percentageAbove.toLocaleString()}%
                    </Text>
                    <Text style={styles.percentageLabel}>above avg</Text>
                  </View>
                </View>
                <View style={styles.comparisonItem}>
                  <Text style={[styles.comparisonLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                    Median Price
                  </Text>
                  <Text style={[styles.comparisonValue, { color: '#FFFFFF' }]}>
                    AED {insights.marketComparison.medianPrice.toLocaleString()}
                  </Text>
                  <Text style={[styles.comparisonMeta, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                    Middle market value
                  </Text>
                  <View style={styles.percentageBadge}>
                    <Text style={styles.percentageText}>
                      +{insights.marketComparison.percentageMedian.toLocaleString()}%
                    </Text>
                    <Text style={styles.percentageLabel}>above median</Text>
                  </View>
                </View>
              </View>
            </View>
          </BlurView>

          <BlurView intensity={40} tint="dark" style={styles.insightCardBlur}>
            <View style={styles.insightCard}>
              <View style={styles.insightCardHeader}>
                <TrendingUp size={20} color="#FFFFFF" />
                <Text style={[styles.insightCardTitle, { color: '#FFFFFF' }]}>Transaction Trends</Text>
              </View>
              <Text style={[styles.insightCardSubtitle, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                Based on DXB Interact data
              </Text>
              <View style={styles.timeframeSelector}>
                {[
                  { value: '3months', label: '3 Months' },
                  { value: '6months', label: '6 Months' },
                  { value: '1year', label: '1 Year' },
                ].map((timeframe) => (
                  <TouchableOpacity
                    key={timeframe.value}
                    style={[
                      styles.timeframeButton,
                      {
                        backgroundColor: selectedTimeframe === timeframe.value
                          ? theme.primary
                          : 'rgba(255, 255, 255, 0.1)',
                      }
                    ]}
                    onPress={() => setSelectedTimeframe(timeframe.value)}
                  >
                    <Calendar
                      size={14}
                      color={selectedTimeframe === timeframe.value ? 'white' : 'rgba(255, 255, 255, 0.6)'}
                    />
                    <Text
                      style={[
                        styles.timeframeText,
                        { color: selectedTimeframe === timeframe.value ? 'white' : 'rgba(255, 255, 255, 0.6)' }
                      ]}
                    >
                      {timeframe.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <BlurView intensity={30} tint="dark" style={styles.trendCardBlur}>
                <View style={styles.trendCard}>
                  <Text style={[styles.trendCardTitle, { color: '#FFFFFF' }]}>
                    {insights.transactionTrends.cluster.name}
                  </Text>
                  <Text style={[styles.trendCardSubtitle, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                    {insights.transactionTrends.cluster.subtitle}
                  </Text>
                  <View style={styles.trendStats}>
                    <View style={styles.trendStat}>
                      <Text style={[styles.trendStatLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                        Average Price
                      </Text>
                      <Text style={[styles.trendStatValue, { color: '#FFFFFF' }]}>
                        AED {insights.transactionTrends.cluster.averagePrice.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.trendStat}>
                      <Text style={[styles.trendStatLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                        Transactions
                      </Text>
                      <Text style={[styles.trendStatValue, { color: '#FFFFFF' }]}>
                        {insights.transactionTrends.cluster.transactions}
                      </Text>
                    </View>
                    <View style={styles.trendStat}>
                      <Text style={[styles.trendStatLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                        Trend
                      </Text>
                      <Text style={[
                        styles.trendStatValue,
                        { color: insights.transactionTrends.cluster.trend > 0 ? '#4CAF50' : '#FF5252' }
                      ]}>
                        {insights.transactionTrends.cluster.trend > 0 ? '+' : ''}
                        {insights.transactionTrends.cluster.trend}%
                      </Text>
                    </View>
                  </View>
                </View>
              </BlurView>
              <BlurView intensity={30} tint="dark" style={styles.trendCardBlur}>
                <View style={styles.trendCard}>
                  <Text style={[styles.trendCardTitle, { color: '#FFFFFF' }]}>
                    {insights.transactionTrends.regional.name}
                  </Text>
                  <Text style={[styles.trendCardSubtitle, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                    {insights.transactionTrends.regional.subtitle}
                  </Text>
                  <View style={styles.trendStats}>
                    <View style={styles.trendStat}>
                      <Text style={[styles.trendStatLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                        Average Price
                      </Text>
                      <Text style={[styles.trendStatValue, { color: '#FFFFFF' }]}>
                        AED {insights.transactionTrends.regional.averagePrice.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.trendStat}>
                      <Text style={[styles.trendStatLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                        Transactions
                      </Text>
                      <Text style={[styles.trendStatValue, { color: '#FFFFFF' }]}>
                        {insights.transactionTrends.regional.transactions}
                      </Text>
                    </View>
                    <View style={styles.trendStat}>
                      <Text style={[styles.trendStatLabel, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                        Trend
                      </Text>
                      <Text style={[
                        styles.trendStatValue,
                        { color: insights.transactionTrends.regional.trend > 0 ? '#4CAF50' : '#FF5252' }
                      ]}>
                        {insights.transactionTrends.regional.trend > 0 ? '+' : ''}
                        {insights.transactionTrends.regional.trend}%
                      </Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>
          </BlurView>

          <BlurView intensity={40} tint="dark" style={styles.insightCardBlur}>
            <View style={styles.insightCard}>
              <View style={styles.insightCardHeader}>
                <BarChart3 size={20} color="#FFFFFF" />
                <Text style={[styles.insightCardTitle, { color: '#FFFFFF' }]}>RERA Rental Index</Text>
              </View>
              <Text style={[styles.insightCardSubtitle, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                Official Dubai rental market indicator
              </Text>
              <View style={styles.reraIndexDisplay}>
                <Text style={[styles.reraCurrentIndex, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                  Current Index
                </Text>
                <View style={styles.reraIndexRow}>
                  <Text style={[styles.reraIndexValue, { color: '#FFFFFF' }]}>
                    {insights.reraIndex.current}
                  </Text>
                  <View style={styles.reraChangeBadge}>
                    <Text style={styles.reraChangeText}>
                      +{insights.reraIndex.change}%
                    </Text>
                    <Text style={styles.reraChangeLabel}>
                      vs previous quarter
                    </Text>
                  </View>
                </View>
                <Text style={[styles.reraQuarter, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                  {insights.reraIndex.quarter}
                </Text>
              </View>
              <Text style={[styles.reraDescription, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                {insights.reraIndex.description}
              </Text>
            </View>
          </BlurView>

          <BlurView intensity={40} tint="dark" style={styles.valueCardBlur}>
            <View style={styles.valueAssessmentCard}>
              <View style={styles.valueHeader}>
                <Text style={styles.valueEmoji}>👍</Text>
                <View>
                  <Text style={styles.valueRating}>
                    {insights.valueAssessment.rating}
                  </Text>
                  <Text style={[styles.valueConfidence, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                    {insights.valueAssessment.confidence}% confidence
                  </Text>
                </View>
              </View>
              <Text style={[styles.valueAssessmentTitle, { color: '#FFFFFF' }]}>Key Factors</Text>
              {insights.valueAssessment.factors.map((factor: string, index: number) => (
                <View key={index} style={styles.factorItem}>
                  <Text style={[styles.factorBullet, { color: '#FFFFFF' }]}>•</Text>
                  <Text style={[styles.factorText, { color: '#FFFFFF' }]}>{factor}</Text>
                </View>
              ))}
            </View>
          </BlurView>
        </>
      )}

      <View style={{ height: 40 }} />
    </View>
  );

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetY={[-10, 10]}
        failOffsetX={[-30, 30]}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              transform: [{ translateY: translateY }]
            }
          ]}
        >
          <BlurView intensity={60} tint="dark" style={styles.sheetBlur}>
            <View style={styles.sheetContainer}>
              <TouchableOpacity
                style={styles.dragHandleContainer}
                activeOpacity={0.7}
              >
                <View style={styles.dragHandle} />
              </TouchableOpacity>

              <Animated.ScrollView
                ref={scrollViewRef}
                style={styles.unifiedScrollView}
                contentContainerStyle={styles.unifiedScrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                bounces={true}
                alwaysBounceVertical={true}
                scrollEnabled={true}
                nestedScrollEnabled={false}
                overScrollMode="always"
              >
                <Animated.View
                  style={{
                    opacity: contentOpacity,
                    transform: [{ scale: contentScale }]
                  }}
                >
                  {/* 🎥 UPDATED: PropertyImageCarousel now supports videos */}
                  <View style={styles.inlineCarouselContainer}>
                    <PropertyImageCarousel
                      propertyId={currentProperty.Property_ID}
                      height={250}
                      showIndicators={true}
                      showControls={true}
                      borderRadius={16}
                      theme={theme}
                      supportsVideo={true}
                    />
                  </View>

                  <View style={styles.headerContent}>
<View style={styles.headerTop}>
  <View style={styles.badgesRow}>
    <View style={[styles.transactionBadge, {
      backgroundColor: (currentProperty.Transaction_Type?.toLowerCase().includes('sale') ||
                      currentProperty.Transaction_Type?.toLowerCase().includes('buy'))
        ? theme.primary : '#00C853'
    }]}>
      <Text style={styles.transactionBadgeText}>
        {(currentProperty.Transaction_Type?.toLowerCase().includes('sale') ||
          currentProperty.Transaction_Type?.toLowerCase().includes('buy')) ? 'Buy' : 'Rent'}
      </Text>
    </View>
    
    {/* ✅ Binghatti Badge */}
    {(currentProperty.is_binghatti || 
      currentProperty.Developer?.toLowerCase().includes('binghatti')) && (
      <View style={[styles.binghattiBadge, { backgroundColor: '#FFD700' }]}>
        <Text style={styles.binghattiBadgeText}>
          ⭐ BINGHATTI
        </Text>
      </View>
    )}
    
    {/* ✅ Open House Badge */}
    {currentProperty.open_house_status?.toLowerCase() === 'scheduled' && (
      <View style={[styles.openHouseBadge, { backgroundColor: '#00C853' }]}>
        <Text style={styles.openHouseBadgeText}>
          🏠 OPEN HOUSE
        </Text>
      </View>
    )}
  </View>
  
  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
    <X size={24} color="#FFFFFF" />
  </TouchableOpacity>
</View>

                    <Animated.View style={[
                      styles.propertyNameContainer,
                      { transform: [{ scale: propertyNameScale }] }
                    ]}>
                      <Text style={[styles.propertyName, { color: '#FFFFFF' }]} numberOfLines={1}>
                        {currentProperty.Building_Name || currentProperty.Property_Name || 'Property'}
                      </Text>
                      <Text style={[styles.propertyId, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                        ID: {currentProperty.Property_ID}
                      </Text>
                    </Animated.View>

                    <View style={styles.priceContainer}>
                      <View style={styles.priceRow}>
                        <Text style={[styles.price, { color: theme.primary }]}>
                          AED {formatPrice(currentProperty.Price)}
                        </Text>
                        {!(currentProperty.Transaction_Type?.toLowerCase().includes('sale') ||
                           currentProperty.Transaction_Type?.toLowerCase().includes('buy')) && (
                          <Text style={[styles.priceFrequency, { color: 'rgba(255, 255, 255, 0.6)' }]}>
                            /year
                          </Text>
                        )}
                      </View>
                      {!(currentProperty.Transaction_Type?.toLowerCase().includes('sale') ||
                         currentProperty.Transaction_Type?.toLowerCase().includes('buy')) && (
                        <Text style={[styles.pricePerMonth, { color: 'rgba(255, 255, 255, 0.5)' }]}>
                          ({formatPrice(Math.round(currentProperty.Price / 12))}/month)
                        </Text>
                      )}
                    </View>

                    {onNavigate && (
                      <TouchableOpacity
                        style={[styles.navigationButtonCompact, { backgroundColor: theme.primary }]}
                        onPress={onNavigate}
                      >
                        <Navigation size={16} color="white" />
                        <Text style={styles.navigationButtonText}>Navigate</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.tabs}>
                      <TouchableOpacity
                        style={[
                          styles.tab,
                          activeMainTab === 'details' && { borderBottomColor: theme.primary }
                        ]}
                        onPress={() => setActiveMainTab('details')}
                      >
                        <Info size={18} color={activeMainTab === 'details' ? theme.primary : 'rgba(255, 255, 255, 0.6)'} />
                        <Text
                          style={[
                            styles.tabText,
                            { color: activeMainTab === 'details' ? theme.primary : 'rgba(255, 255, 255, 0.6)' }
                          ]}
                        >
                          Details
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.tab,
                          activeMainTab === 'insights' && { borderBottomColor: theme.primary }
                        ]}
                        onPress={() => setActiveMainTab('insights')}
                      >
                        <BarChart3 size={18} color={activeMainTab === 'insights' ? theme.primary : 'rgba(255, 255, 255, 0.6)'} />
                        <Text
                          style={[
                            styles.tabText,
                            { color: activeMainTab === 'insights' ? theme.primary : 'rgba(255, 255, 255, 0.6)' }
                          ]}
                        >
                          Insights
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {activeMainTab === 'details' && (
                      <View style={styles.detailsSubTabBarContainer}>
                        <TouchableOpacity
                          style={[
                            styles.detailsSubTab,
                            activeDetailsSubTab === 'overview' && [styles.detailsSubTabActive, { backgroundColor: theme.primary }],
                            activeDetailsSubTab !== 'overview' && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                          ]}
                          onPress={() => setActiveDetailsSubTab('overview')}
                        >
                          <Info size={16} color={activeDetailsSubTab === 'overview' ? 'white' : 'rgba(255, 255, 255, 0.6)'} />
                          <Text
                            style={[
                              styles.detailsSubTabText,
                              { color: activeDetailsSubTab === 'overview' ? 'white' : 'rgba(255, 255, 255, 0.6)' },
                            ]}
                          >
                            Overview
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.detailsSubTab,
                            activeDetailsSubTab === 'more' && [styles.detailsSubTabActive, { backgroundColor: theme.primary }],
                            activeDetailsSubTab !== 'more' && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                          ]}
                          onPress={() => setActiveDetailsSubTab('more')}
                        >
                          <Layers size={16} color={activeDetailsSubTab === 'more' ? 'white' : 'rgba(255, 255, 255, 0.6)'} />
                          <Text
                            style={[
                              styles.detailsSubTabText,
                              { color: activeDetailsSubTab === 'more' ? 'white' : 'rgba(255, 255, 255, 0.6)' },
                            ]}
                          >
                            More
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {activeMainTab === 'details' && activeDetailsSubTab === 'overview' && renderOverviewTab()}
                  {activeMainTab === 'details' && activeDetailsSubTab === 'more' && renderMoreTab()}
                  {activeMainTab === 'insights' && renderInsightsTab()}
                 
                </Animated.View>
              </Animated.ScrollView>
            </View>
          </BlurView>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_MAX_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetBlur: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  draggableArea: {
    width: '100%',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  headerContent: {
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  unifiedScrollView: {
    flex: 1,
  },
  unifiedScrollContent: {
    flexGrow: 1,
  },
  inlineCarouselContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabContentView: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  transactionBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  propertyName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 24,
  },
  propertyNameContainer: {
    marginBottom: 4,
  },
  propertyId: {
    fontSize: 12,
    marginBottom: 12,
  },
  priceContainer: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
  },
  priceFrequency: {
    fontSize: 16,
    fontWeight: '400',
  },
  pricePerMonth: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  navigationButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  navigationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  imageContainer: {
    marginBottom: 16,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBadgeBlur: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  featureTagsContainer: {
    marginBottom: 16,
  },
  featureTags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    paddingRight: 20,
  },
  featureTagBlur: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  featureTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  featureTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    flexShrink: 0,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoItemWrapper: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 1,
  },
  infoItemBlur: {
    flex: 1,
    minHeight: 64,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 12,
    minHeight: 64,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  infoLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  agentCardWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  agentCardBlur: {
    flex: 1,
  },
  agentCard: {
    padding: 16,
  },
  agentHeader: {
    marginBottom: 12,
  },
  agentLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  agencyName: {
    fontSize: 13,
    marginBottom: 4,
  },
  agentPhone: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  askAIButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  askAIButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  detailsTabContainer: {
    flex: 1,
  },
  detailsMainContainer: {
    flex: 1,
  },
  detailsSubTabBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailsSubTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  detailsSubTabActive: {},
  detailsSubTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subTabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  subTabBar: {
    maxHeight: 50,
  },
  subTabBarContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    paddingRight: 40,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  subTabActive: {},
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
  },
  subTabContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoCardWrapper: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 1,
  },
  fullWidth: {
    minWidth: '100%',
  },
  infoCardBlur: {
    flex: 1,
    minHeight: 64,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 12,
    minHeight: 64,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardContent: {
    flex: 1,
    flexShrink: 1,
  },
  infoCardLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '600',
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  insightsHeaderBlur: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  insightsHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 126, 0, 0.2)',
  },
  insightsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dataInsightsSection: {
    marginBottom: 16,
  },
  dataInsightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  dataInsightsSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  priceCardBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  priceCard: {
    padding: 16,
  },
  priceCardLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  priceCardValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  insightCardBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  insightCard: {
    padding: 16,
  },
  insightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  insightCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  insightCardSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  comparisonItem: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  comparisonMeta: {
    fontSize: 11,
    marginBottom: 8,
  },
  percentageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
  percentageText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '700',
  },
  percentageLabel: {
    color: '#FF5252',
    fontSize: 10,
  },
  timeframeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  timeframeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  timeframeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trendCardBlur: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  trendCard: {
    padding: 12,
  },
  trendCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  trendCardSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  trendStats: {
    flexDirection: 'row',
    gap: 16,
  },
  trendStat: {
    flex: 1,
  },
  trendStatLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  trendStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  reraIndexDisplay: {
    marginBottom: 16,
  },
  reraCurrentIndex: {
    fontSize: 13,
    marginBottom: 8,
  },
  reraIndexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  reraIndexValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  reraChangeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  reraChangeText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '700',
  },
  reraChangeLabel: {
    color: '#4CAF50',
    fontSize: 10,
  },
  reraQuarter: {
    fontSize: 12,
  },
  reraDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  valueCardBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  valueAssessmentCard: {
    padding: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  valueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  valueEmoji: {
    fontSize: 32,
  },
  valueRating: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  valueConfidence: {
    fontSize: 13,
    fontWeight: '600',
  },
  valueAssessmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  factorBullet: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    width: 16,
  },
  factorText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

    distanceBadgeContainer: {
    marginBottom: 16,
  },
  distanceBadgeBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  distanceBadgeText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
badgesRow: {
  flexDirection: 'row',
  gap: 8,
  flexWrap: 'wrap',
},

binghattiBadge: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
},

binghattiBadgeText: {
  color: 'white',
  fontSize: 12,
  fontWeight: '700',
},

openHouseBadge: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
},

openHouseBadgeText: {
  color: 'white',
  fontSize: 12,
  fontWeight: '700',
},
openHouseSection: {
  marginBottom: 16,
},

openHouseSectionBlur: {
  borderRadius: 12,
  overflow: 'hidden',
},

openHouseCard: {
  padding: 16,
  backgroundColor: 'rgba(0, 200, 83, 0.15)',
  borderWidth: 1,
  borderColor: 'rgba(0, 200, 83, 0.3)',
},

openHouseHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
},

openHouseIcon: {
  fontSize: 20,
},

openHouseTitle: {
  fontSize: 16,
  fontWeight: '700',
},

openHouseDetail: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
},

openHouseText: {
  fontSize: 14,
  flex: 1,
},
  
});
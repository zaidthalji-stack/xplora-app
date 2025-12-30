import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Bed, Bath, ChevronUp, MapPin } from 'lucide-react-native';
import { PropertyImageCarousel } from '@/components/PropertyImageCarousel';

interface CompactPropertyCardProps {
  property: any;
  onClose: () => void;
  onExpand: () => void; // Trigger to open full PropertyBottomSheet
  theme: any;
}

export const CompactPropertyCard: React.FC<CompactPropertyCardProps> = ({ 
  property, 
  onClose, 
  onExpand, // This will trigger the full sheet
  theme 
}) => {
  // Format price
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return price.toLocaleString('en-AE');
  };

  // Check transaction type
  const transactionType = property.Transaction_Type?.toLowerCase() || '';
  const isForSale = transactionType.includes('sale') || transactionType.includes('buy');

  return (
    <View style={[styles.compactCard, { backgroundColor: theme.card }]}>
      {/* Property Image Carousel - Smaller */}
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={onExpand}
        activeOpacity={0.9}
      >
        <PropertyImageCarousel
          propertyId={property.Property_ID}
          height={70}
          width={80}
          showIndicators={false}
          showControls={false}
          borderRadius={12}
          theme={theme}
          compact={true}
        />
        <View style={[styles.expandIndicator, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
          <ChevronUp size={12} color="white" />
        </View>
      </TouchableOpacity>

      {/* Compact Info */}
      <TouchableOpacity 
        style={styles.infoContainer}
        onPress={onExpand}
        activeOpacity={0.9}
      >
        <View style={styles.topRow}>
          <Text 
            style={[styles.propertyName, { color: theme.text }]} 
            numberOfLines={1}
          >
            {property.Building_Name || property.Property_Name || 'Property'}
          </Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X size={16} color={theme.tabIconDefault} />
          </TouchableOpacity>
        </View>

        <View style={styles.locationRow}>
          <MapPin size={10} color={theme.tabIconDefault} />
          <Text 
            style={[styles.location, { color: theme.tabIconDefault }]}
            numberOfLines={1}
          >
            {property.Location || 'Location'}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          {property.Bedrooms && (
            <View style={styles.detail}>
              <Bed size={12} color={theme.tabIconDefault} />
              <Text style={[styles.detailText, { color: theme.text }]}>
                {property.Bedrooms}
              </Text>
            </View>
          )}
          
          {property.Bathrooms && (
            <View style={styles.detail}>
              <Bath size={12} color={theme.tabIconDefault} />
              <Text style={[styles.detailText, { color: theme.text }]}>
                {property.Bathrooms}
              </Text>
            </View>
          )}

          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: theme.primary }]}>
              AED {formatPrice(property.Price)}
            </Text>
            {!isForSale && (
              <Text style={[styles.priceFrequency, { color: theme.tabIconDefault }]}>
                /yr
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  compactCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    height: 70,
  },
  imageContainer: {
    width: 80,
    height: '100%',
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  expandIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
    padding: 3,
  },
  infoContainer: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  propertyName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
    flex: 1,
    marginRight: 4,
  },
  closeButton: {
    padding: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  location: {
    fontSize: 10,
    fontFamily: 'PorscheDesign-Regular',
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detailText: {
    fontSize: 11,
    fontFamily: 'PorscheDesign-Medium',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 'auto',
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
  },
  priceFrequency: {
    fontSize: 9,
    fontFamily: 'PorscheDesign-Regular',
    marginLeft: 1,
  },
});
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { X, MapPin, Phone, Navigation } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { usePropertyContext } from '@/context/PropertyContext';

interface PropertyFloatingCardProps {
  property: any;
}

export function PropertyFloatingCard({ property }: PropertyFloatingCardProps) {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const { clearSelection } = usePropertyContext();

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `AED ${(price / 1000000).toFixed(2)}M`;
    }
    return `AED ${(price / 1000).toFixed(0)}K`;
  };

  return (
    <View style={styles.container}>
      {/* Close button */}
      <TouchableOpacity 
        style={[styles.closeButton, { backgroundColor: theme.background }]}
        onPress={clearSelection}
      >
        <X size={20} color={theme.text} />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        {/* Property Image - placeholder for now */}
        <View style={[styles.imageContainer, { backgroundColor: theme.border }]}>
          <Text style={[styles.imagePlaceholder, { color: theme.textSecondary }]}>
            Property Image
          </Text>
        </View>

        {/* Property Details */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>
            {property.Building_Name || 'Property Name'}
          </Text>

          <View style={styles.locationRow}>
            <MapPin size={16} color={theme.textSecondary} />
            <Text style={[styles.location, { color: theme.textSecondary }]}>
              {property.Location || property.District}
            </Text>
          </View>

          <Text style={[styles.price, { color: theme.primary }]}>
            {formatPrice(property.Price)}
          </Text>

          <View style={styles.detailsGrid}>
            {property.Bedrooms && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Bedrooms
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {property.Bedrooms}
                </Text>
              </View>
            )}

            {property.Bathrooms && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Bathrooms
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {property.Bathrooms}
                </Text>
              </View>
            )}

            {property['Property_Size_(sqft)'] && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Size
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {property['Property_Size_(sqft)']} sqft
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => {/* Navigate to property */}}
            >
              <Navigation size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Navigate</Text>
            </TouchableOpacity>

            {property.Agent_Phone && (
              <TouchableOpacity 
                style={[styles.secondaryButton, { borderColor: theme.border }]}
                onPress={() => {/* Call agent */}}
              >
                <Phone size={18} color={theme.text} />
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                  Call Agent
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Additional Details */}
          {property.Developer && (
            <View style={styles.infoSection}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Developer
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {property.Developer}
              </Text>
            </View>
          )}

          {property.Property_Type && (
            <View style={styles.infoSection}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Type
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {property.Property_Type}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    fontSize: 16,
    fontFamily: 'PorscheDesign-Regular',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  location: {
    fontSize: 14,
    fontFamily: 'PorscheDesign-Regular',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  detailItem: {
    flex: 1,
    minWidth: '30%',
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'PorscheDesign-Regular',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  infoSection: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'PorscheDesign-Regular',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'PorscheDesign-Medium',
  },
});
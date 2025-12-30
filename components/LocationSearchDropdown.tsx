import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MapPin, Home, Building2, Navigation } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

interface LocationSuggestion {
  id: string;
  type: 'location' | 'property' | 'place' | 'address' | 'poi';
  title: string;
  subtitle: string;
  location: string;
  coordinates?: [number, number];
  property?: any;
  placeType?: string;
}

interface Props {
  suggestions: LocationSuggestion[];
  onSelect: (suggestion: LocationSuggestion) => void;
  visible: boolean;
  isSearching?: boolean;
}

export function LocationSearchDropdown({ suggestions, onSelect, visible, isSearching }: Props) {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  if (!visible) return null;

  const getIcon = (suggestion: LocationSuggestion) => {
    const iconColor = theme.primary;
    const iconSize = 20;

    switch (suggestion.type) {
      case 'property':
        return <Building2 size={iconSize} color={iconColor} />;
      case 'location':
        return <Home size={iconSize} color={iconColor} />;
      case 'poi':
        return <MapPin size={iconSize} color={iconColor} />;
      case 'address':
        return <Navigation size={iconSize} color={iconColor} />;
      default:
        return <MapPin size={iconSize} color={iconColor} />;
    }
  };

  const getTypeLabel = (suggestion: LocationSuggestion) => {
    switch (suggestion.type) {
      case 'property':
        return 'Property';
      case 'location':
        return 'Area';
      case 'poi':
        return 'Place';
      case 'address':
        return 'Address';
      default:
        return 'Location';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <ScrollView 
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isSearching && (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.tabIconDefault }]}>
              Searching...
            </Text>
          </View>
        )}

        {!isSearching && suggestions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.tabIconDefault }]}>
              No results found
            </Text>
          </View>
        )}

        {!isSearching && suggestions.map((suggestion) => (
          <TouchableOpacity
            key={suggestion.id}
            style={[styles.suggestion, { borderBottomColor: theme.border }]}
            onPress={() => onSelect(suggestion)}
          >
            <View style={styles.iconContainer}>
              {getIcon(suggestion)}
            </View>
            
            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text 
                  style={[styles.title, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {suggestion.title}
                </Text>
                {suggestion.type === 'property' && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.badgeText}>Property</Text>
                  </View>
                )}
              </View>
              
              <Text 
                style={[styles.subtitle, { color: theme.tabIconDefault }]}
                numberOfLines={1}
              >
                {suggestion.subtitle}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 12,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollView: {
    maxHeight: 300,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'PorscheDesign-Regular',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'PorscheDesign-Regular',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'PorscheDesign-Regular',
  },
});
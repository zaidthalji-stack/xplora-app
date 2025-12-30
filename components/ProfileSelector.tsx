import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Car, PersonStanding, Bike } from 'lucide-react-native';
import type { RoutingProfile } from '@/hooks/useNavigation';

interface ProfileSelectorProps {
  currentProfile: RoutingProfile;
  onProfileChange: (profile: RoutingProfile) => void;
  theme: any;
}

/**
 * Profile selector for navigation
 * Shows 3 logical options: Drive (with traffic), Walk, Bike
 */
export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  currentProfile,
  onProfileChange,
  theme,
}) => {
  const profiles: Array<{
    value: RoutingProfile;
    icon: React.ReactNode;
    label: string;
    description: string;
  }> = [
    {
      value: 'mapbox/driving-traffic',
      icon: <Car size={20} />,
      label: 'Drive',
      description: 'Fastest route with real-time traffic'
    },
    {
      value: 'mapbox/walking',
      icon: <PersonStanding size={20} />,
      label: 'Walk',
      description: 'Pedestrian-friendly route'
    },
    {
      value: 'mapbox/cycling',
      icon: <Bike size={20} />,
      label: 'Bike',
      description: 'Bike-friendly route'
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        Travel Mode
      </Text>
      
      <View style={styles.profileGrid}>
        {profiles.map((profile) => {
          const isSelected = currentProfile === profile.value;
          
          return (
            <TouchableOpacity
              key={profile.value}
              style={[
                styles.profileButton,
                {
                  backgroundColor: isSelected ? theme.primary : theme.cardBackground,
                  borderColor: isSelected ? theme.primary : theme.border,
                }
              ]}
              onPress={() => onProfileChange(profile.value)}
            >
              <View style={[
                styles.iconContainer,
                { color: isSelected ? '#FFFFFF' : theme.text }
              ]}>
                {React.cloneElement(profile.icon as React.ReactElement, {
                  color: isSelected ? '#FFFFFF' : theme.text
                })}
              </View>
              
              <Text style={[
                styles.profileLabel,
                { color: isSelected ? '#FFFFFF' : theme.text }
              ]}>
                {profile.label}
              </Text>
              
              <Text style={[
                styles.profileDescription,
                { color: isSelected ? 'rgba(255, 255, 255, 0.8)' : theme.tabIconDefault }
              ]}>
                {profile.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  profileButton: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 8,
  },
  profileLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileDescription: {
    fontSize: 11,
    textAlign: 'center',
  },
});
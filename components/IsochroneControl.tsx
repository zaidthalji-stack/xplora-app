import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Clock, MapPin, X, Zap, Car, PersonStanding, Bike } from 'lucide-react-native';
import type { IsochroneProfile, ContourType } from '@/hooks/useIsochrone';

interface IsochroneControlProps {
  onFetch: (params: {
    profile: IsochroneProfile;
    contours: number[];
    contoursType: ContourType;
  }) => void;
  onClear: () => void;
  isLoading: boolean;
  hasResult: boolean;
  theme: any;
}

/**
 * Isochrone control panel
 * Allows user to visualize reachable areas
 */
export const IsochroneControl: React.FC<IsochroneControlProps> = ({
  onFetch,
  onClear,
  isLoading,
  hasResult,
  theme,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<IsochroneProfile>('mapbox/driving-traffic');
  const [contoursType, setContoursType] = useState<ContourType>('isochrone');
  const [selectedContours, setSelectedContours] = useState<number[]>([5, 10, 15]);

  const profiles: Array<{
    value: IsochroneProfile;
    icon: any;
    label: string;
  }> = [
    { value: 'mapbox/driving-traffic', icon: Zap, label: 'Traffic' },
    { value: 'mapbox/driving', icon: Car, label: 'Drive' },
    { value: 'mapbox/walking', icon: PersonStanding, label: 'Walk' },
    { value: 'mapbox/cycling', icon: Bike, label: 'Bike' },
  ];

  const timeOptions = [
    { label: '5, 10, 15 min', values: [5, 10, 15] },
    { label: '10, 20, 30 min', values: [10, 20, 30] },
    { label: '15, 30, 45 min', values: [15, 30, 45] },
  ];

  const distanceOptions = [
    { label: '1, 2, 3 km', values: [1000, 2000, 3000] },
    { label: '2, 5, 10 km', values: [2000, 5000, 10000] },
    { label: '5, 10, 15 km', values: [5000, 10000, 15000] },
  ];

  const handleFetch = () => {
    onFetch({
      profile: selectedProfile,
      contours: selectedContours,
      contoursType,
    });
    setShowModal(false);
  };

  return (
    <>
      {/* Floating Button */}
      <View style={styles.container}>
        {hasResult ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={onClear}
          >
            <X size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Clear Area</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={() => setShowModal(true)}
            disabled={isLoading}
          >
            <Clock size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {isLoading ? 'Loading...' : 'Show Reachable Area'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Configuration Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Show Reachable Area
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Type Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Measure By
              </Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: contoursType === 'isochrone' ? theme.primary : theme.cardBackground,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => {
                    setContoursType('isochrone');
                    setSelectedContours([5, 10, 15]);
                  }}
                >
                  <Clock size={18} color={contoursType === 'isochrone' ? '#FFFFFF' : theme.text} />
                  <Text style={[
                    styles.typeButtonText,
                    { color: contoursType === 'isochrone' ? '#FFFFFF' : theme.text }
                  ]}>
                    Time
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: contoursType === 'isodistance' ? theme.primary : theme.cardBackground,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => {
                    setContoursType('isodistance');
                    setSelectedContours([1000, 2000, 3000]);
                  }}
                >
                  <MapPin size={18} color={contoursType === 'isodistance' ? '#FFFFFF' : theme.text} />
                  <Text style={[
                    styles.typeButtonText,
                    { color: contoursType === 'isodistance' ? '#FFFFFF' : theme.text }
                  ]}>
                    Distance
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Profile Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Travel Mode
              </Text>
              <View style={styles.profileGrid}>
                {profiles.map((profile) => {
                  const Icon = profile.icon;
                  const isSelected = selectedProfile === profile.value;
                  return (
                    <TouchableOpacity
                      key={profile.value}
                      style={[
                        styles.profileButton,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.cardBackground,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedProfile(profile.value)}
                    >
                      <Icon size={20} color={isSelected ? '#FFFFFF' : theme.text} />
                      <Text style={[
                        styles.profileButtonText,
                        { color: isSelected ? '#FFFFFF' : theme.text }
                      ]}>
                        {profile.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Contour Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {contoursType === 'isochrone' ? 'Time Ranges' : 'Distance Ranges'}
              </Text>
              <View style={styles.contourButtons}>
                {(contoursType === 'isochrone' ? timeOptions : distanceOptions).map((option) => {
                  const isSelected = JSON.stringify(selectedContours) === JSON.stringify(option.values);
                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.contourButton,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.cardBackground,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setSelectedContours(option.values)}
                    >
                      <Text style={[
                        styles.contourButtonText,
                        { color: isSelected ? '#FFFFFF' : theme.text }
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.infoText, { color: theme.tabIconDefault }]}>
                {contoursType === 'isochrone'
                  ? 'Shows areas reachable within the selected time from your location'
                  : 'Shows areas reachable within the selected distance from your location'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.showButton, { backgroundColor: theme.primary }]}
                onPress={handleFetch}
              >
                <Text style={styles.showButtonText}>Show Area</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  profileButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contourButtons: {
    gap: 12,
  },
  contourButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  contourButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  showButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  showButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
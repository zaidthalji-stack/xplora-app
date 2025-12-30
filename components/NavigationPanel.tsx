import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, RefreshCw, Navigation, ChevronDown, ChevronUp } from 'lucide-react-native';
import { ProfileSelector } from '@/components/ProfileSelector';
import type { RoutingProfile } from '@/hooks/useNavigation';

interface NavigationPanelProps {
  isNavigating: boolean;
  currentInstruction: string;
  distanceToNextTurn: number;
  remainingDistance: number;
  remainingDuration: number;
  estimatedTimeOfArrival: Date | null;
  currentProfile: RoutingProfile;
  isOffRoute?: boolean;
  isRerouting?: boolean;
  alternativeRoutes?: any[];
  theme: any;
  onStop: () => void;
  onChangeProfile?: (profile: RoutingProfile) => void;
  onReroute?: () => void;
  onSwitchToAlternative?: (index: number) => void;
}

/**
 * 🎯 Compact Navigation Panel with Fixed Rerouting Banner
 */
export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  isNavigating,
  currentInstruction,
  distanceToNextTurn,
  remainingDistance,
  remainingDuration,
  estimatedTimeOfArrival,
  currentProfile,
  isOffRoute = false,
  isRerouting = false,
  alternativeRoutes = [],
  theme,
  onStop,
  onChangeProfile,
  onReroute,
  onSwitchToAlternative,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  if (!isNavigating) return null;
  if (!currentInstruction && !isRerouting) return null;

  const formatDistance = (meters: number): string => {
    if (!meters || isNaN(meters)) return '0 m';
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0 min';
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes} min`;
  };

  const formatTime = (date: Date | null): string => {
    if (!date || !(date instanceof Date)) return '--:--';
    try {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return '--:--';
    }
  };

  const getProfileIcon = (profile: RoutingProfile): string => {
    const icons = {
      'mapbox/driving-traffic': '🚗',
      'mapbox/driving': '🚙',
      'mapbox/walking': '🚶',
      'mapbox/cycling': '🚴',
    };
    return icons[profile] || '🚗';
  };

  const handleProfileChange = (newProfile: RoutingProfile) => {
    setShowProfileModal(false);
    if (typeof onChangeProfile === 'function') {
      onChangeProfile(newProfile);
    }
  };

  // 🎯 COMPACT MODE (default) - minimal space
  if (!expanded) {
    return (
      <>
        <View style={styles.compactContainer}>
          {/* Main Panel */}
          <TouchableOpacity
            style={[styles.compactPanel, { backgroundColor: theme.background }]}
            onPress={() => setExpanded(true)}
            activeOpacity={0.9}
          >
            {isRerouting ? (
              <View style={styles.compactContent}>
                <RefreshCw size={18} color={theme.primary} style={styles.reroutingIcon} />
                <Text style={[styles.compactInstruction, { color: theme.text }]} numberOfLines={1}>
                  Recalculating route...
                </Text>
              </View>
            ) : (
              <View style={styles.compactContent}>
                {/* Distance Badge */}
                <View style={[styles.distanceBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.distanceBadgeText}>
                    {formatDistance(distanceToNextTurn)}
                  </Text>
                </View>

                {/* Instruction */}
                <Text 
                  style={[styles.compactInstruction, { color: theme.text }]} 
                  numberOfLines={1}
                >
                  {currentInstruction}
                </Text>

                {/* Expand Icon */}
                <ChevronDown size={20} color={theme.tabIconDefault} />
              </View>
            )}

            {/* ETA Strip */}
            <View style={styles.etaStrip}>
              <Text style={[styles.etaText, { color: theme.text }]}>
                {formatTime(estimatedTimeOfArrival)}
              </Text>
              <Text style={[styles.etaSubtext, { color: theme.tabIconDefault }]}>
                {formatDistance(remainingDistance)} • {formatDuration(remainingDuration)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Close Button (outside panel) */}
          <TouchableOpacity 
            style={[styles.compactCloseButton, { backgroundColor: theme.cardBackground }]}
            onPress={onStop}
          >
            <X size={18} color={theme.text} />
          </TouchableOpacity>

          {/* 🎯 FIXED: Rerouting Banner - Below Main Panel */}
          {isOffRoute && !isRerouting && (
            <View style={[styles.reroutingBanner, { backgroundColor: '#FF9500' }]}>
              <RefreshCw size={14} color="white" style={styles.reroutingBannerIcon} />
              <Text style={styles.reroutingBannerText}>
                Off route • Recalculating...
              </Text>
            </View>
          )}
        </View>

        {/* Profile Modal */}
        <Modal
          visible={showProfileModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProfileModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowProfileModal(false)}
          >
            <View 
              style={[styles.modalContent, { backgroundColor: theme.background }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Change Travel Mode
                </Text>
                <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                  <X size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ProfileSelector
                currentProfile={currentProfile}
                onProfileChange={handleProfileChange}
                theme={theme}
              />

              <Text style={[styles.modalNote, { color: theme.tabIconDefault }]}>
                Route will be recalculated
              </Text>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  // 📋 EXPANDED MODE - full details
  return (
    <>
      <View style={styles.expandedContainer}>
        <View style={[styles.expandedPanel, { backgroundColor: theme.background }]}>
          {/* Header */}
          <TouchableOpacity 
            style={styles.expandedHeader}
            onPress={() => setExpanded(false)}
          >
            <ChevronUp size={20} color={theme.tabIconDefault} />
            <Text style={[styles.expandedHeaderText, { color: theme.tabIconDefault }]}>
              Tap to minimize
            </Text>
          </TouchableOpacity>

          {/* Main Instruction */}
          <View style={styles.expandedMainInstruction}>
            <Text style={[styles.expandedDistance, { color: theme.primary }]}>
              {formatDistance(distanceToNextTurn)}
            </Text>
            <Text style={[styles.expandedInstruction, { color: theme.text }]}>
              {currentInstruction}
            </Text>
          </View>

          {/* Trip Info */}
          <View style={styles.expandedTripInfo}>
            <View style={styles.tripInfoItem}>
              <Text style={[styles.tripInfoLabel, { color: theme.tabIconDefault }]}>
                ETA
              </Text>
              <Text style={[styles.tripInfoValue, { color: theme.text }]}>
                {formatTime(estimatedTimeOfArrival)}
              </Text>
            </View>

            <View style={styles.tripInfoDivider} />

            <View style={styles.tripInfoItem}>
              <Text style={[styles.tripInfoLabel, { color: theme.tabIconDefault }]}>
                Distance
              </Text>
              <Text style={[styles.tripInfoValue, { color: theme.text }]}>
                {formatDistance(remainingDistance)}
              </Text>
            </View>

            <View style={styles.tripInfoDivider} />

            <View style={styles.tripInfoItem}>
              <Text style={[styles.tripInfoLabel, { color: theme.tabIconDefault }]}>
                Time
              </Text>
              <Text style={[styles.tripInfoValue, { color: theme.text }]}>
                {formatDuration(remainingDuration)}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.expandedActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
              onPress={() => {
                if (typeof onChangeProfile === 'function') {
                  setShowProfileModal(true);
                }
              }}
            >
              <Text style={styles.actionButtonIcon}>{getProfileIcon(currentProfile)}</Text>
            </TouchableOpacity>

            {alternativeRoutes && alternativeRoutes.length > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
                onPress={() => {
                  if (typeof onSwitchToAlternative === 'function' && alternativeRoutes.length > 0) {
                    onSwitchToAlternative(0);
                  }
                }}
              >
                <Navigation size={18} color={theme.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
              onPress={() => {
                if (typeof onReroute === 'function') {
                  onReroute();
                }
              }}
            >
              <RefreshCw size={18} color={theme.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: '#FF3B30' }]}
              onPress={onStop}
            >
              <X size={18} color="white" />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🎯 FIXED: Rerouting Banner for Expanded Mode */}
        {isOffRoute && !isRerouting && (
          <View style={[styles.reroutingBanner, { backgroundColor: '#FF9500', marginTop: 8 }]}>
            <RefreshCw size={14} color="white" style={styles.reroutingBannerIcon} />
            <Text style={styles.reroutingBannerText}>
              Off route • Recalculating...
            </Text>
          </View>
        )}
      </View>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileModal(false)}
        >
          <View 
            style={[styles.modalContent, { backgroundColor: theme.background }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Change Travel Mode
              </Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ProfileSelector
              currentProfile={currentProfile}
              onProfileChange={handleProfileChange}
              theme={theme}
            />

            <Text style={[styles.modalNote, { color: theme.tabIconDefault }]}>
              Route will be recalculated
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // 🎯 COMPACT MODE
  compactContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 60,
    zIndex: 1000,
  },
  compactPanel: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  distanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  distanceBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  compactInstruction: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  etaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  etaText: {
    fontSize: 16,
    fontWeight: '700',
  },
  etaSubtext: {
    fontSize: 12,
  },
  compactCloseButton: {
    position: 'absolute',
    right: -50,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  reroutingIcon: {
    marginRight: 4,
  },

  // 🎯 FIXED: Rerouting Banner
  reroutingBanner: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  reroutingBannerIcon: {
    marginRight: 6,
  },
  reroutingBannerText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // 📋 EXPANDED MODE
  expandedContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 1000,
  },
  expandedPanel: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  expandedHeaderText: {
    fontSize: 12,
  },
  expandedMainInstruction: {
    marginBottom: 16,
  },
  expandedDistance: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 6,
  },
  expandedInstruction: {
    fontSize: 16,
    lineHeight: 22,
  },
  expandedTripInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  tripInfoItem: {
    alignItems: 'center',
  },
  tripInfoLabel: {
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tripInfoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  tripInfoDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  stopButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 22,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalNote: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
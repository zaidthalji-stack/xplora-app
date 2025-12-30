import React, { useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { PanelLeft, PanelLeftClose, X } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHAT_PANEL_WIDTH = 420;
const COLLAPSED_WIDTH = 60;

interface MapChatLayoutProps {
  mapContent: React.ReactNode;
  chatContent: React.ReactNode;
}

/**
 * MapChatLayout - Mapbox-style integrated layout
 * 
 * Web: Chat sidebar overlays the left side of the map
 * Native: Chat is a full-screen modal overlay
 */
export function MapChatLayout({ mapContent, chatContent }: MapChatLayoutProps) {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const [isChatOpen, setIsChatOpen] = useState(true);
  const chatWidth = useSharedValue(isChatOpen ? CHAT_PANEL_WIDTH : COLLAPSED_WIDTH);
  const [showChatModal, setShowChatModal] = useState(false);

  const toggleChat = () => {
    if (Platform.OS === 'web') {
      const newState = !isChatOpen;
      setIsChatOpen(newState);
      chatWidth.value = withSpring(newState ? CHAT_PANEL_WIDTH : COLLAPSED_WIDTH, {
        damping: 20,
        stiffness: 90,
      });
    } else {
      setShowChatModal(!showChatModal);
    }
  };

  const chatPanelStyle = useAnimatedStyle(() => {
    return {
      width: Platform.OS === 'web' ? chatWidth.value : '100%',
    };
  });

  // NATIVE: Full-screen overlay modal
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        {/* Map takes full screen */}
        <View style={styles.mapContainer}>{mapContent}</View>

        {/* Floating chat toggle button */}
        <TouchableOpacity
          style={[styles.nativeChatToggle, { backgroundColor: theme.primary }]}
          onPress={toggleChat}
        >
          <PanelLeft size={24} color="white" />
        </TouchableOpacity>

        {/* Chat Modal Overlay */}
        {showChatModal && (
          <Animated.View style={[styles.nativeChatModal, { backgroundColor: theme.background }]}>
            <View style={[styles.chatModalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.chatModalTitle, { color: theme.text }]}>Chat</Text>
              <TouchableOpacity onPress={toggleChat} style={styles.closeButton}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.chatModalContent}>{chatContent}</View>
          </Animated.View>
        )}
      </View>
    );
  }

  // WEB: Mapbox-style sidebar layout
  return (
    <View style={styles.container}>
      {/* Chat Panel - Left Side */}
      <Animated.View 
        style={[
          styles.webChatPanel,
          { backgroundColor: theme.background },
          chatPanelStyle
        ]}
      >
        {isChatOpen ? (
          <>
            {/* Chat Header */}
            <View style={[styles.webChatHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.webChatTitle, { color: theme.text }]}>AI Assistant</Text>
              <TouchableOpacity onPress={toggleChat}>
                <PanelLeftClose size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Chat Content */}
            <View style={styles.webChatContent}>{chatContent}</View>
          </>
        ) : (
          // Collapsed state - just show toggle button
          <View style={styles.collapsedPanel}>
            <TouchableOpacity 
              onPress={toggleChat}
              style={[styles.expandButton, { backgroundColor: theme.primary }]}
            >
              <PanelLeft size={24} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Map Container - Takes remaining space */}
      <View style={styles.webMapContainer}>{mapContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },

  // WEB STYLES
  webChatPanel: {
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.1)',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  webChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  webChatTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
  },
  webChatContent: {
    flex: 1,
  },
  webMapContainer: {
    flex: 1,
  },
  collapsedPanel: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  expandButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  // NATIVE STYLES
  mapContainer: {
    flex: 1,
  },
  nativeChatToggle: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  nativeChatModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  chatModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  chatModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PorscheDesign-Bold',
  },
  closeButton: {
    padding: 8,
  },
  chatModalContent: {
    flex: 1,
  },
});

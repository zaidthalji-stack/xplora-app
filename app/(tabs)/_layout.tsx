import React from 'react';
import { Tabs } from 'expo-router';
import { MapPin, MessageSquare, Settings } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useTheme, ThemeProvider } from '@/context/ThemeContext';
import { PropertyProvider } from '@/context/PropertyContext';
import { View, Text, StyleSheet, StatusBar, Platform, Image } from 'react-native';
import { isWeb } from '@/utils/platform';
import { WebOverlayLayout } from '@/components/Layout/WebOverlayLayout';

const BaitakTitle = () => {
  return (
    <View style={styles.titleContainer}>
      <View style={styles.logoWrapper}>
        <Image
          source={{ uri: 'https://srbbuxpndcpeanyzqxva.supabase.co/storage/v1/object/public/logo/logo2.png' }}
          style={styles.titleLogo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

function NativeTabLayout() {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <>
      <StatusBar 
        style={isDarkMode ? 'light' : 'dark'} 
        backgroundColor={theme.card}
      />
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.card,
            borderBottomWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            shadowColor: 'transparent',
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            color: theme.text,
          },
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
            shadowColor: 'transparent',
            elevation: 0,
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.tabIconDefault,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
            fontFamily: 'PorscheDesign-Medium',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: () => <BaitakTitle />,
            title: 'Chat',
            tabBarIcon: ({ color, size }) => (
              <MessageSquare size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            // 🗺️ CHANGED: Hide header for map screen (we have custom fixed header)
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MapPin size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerTitleStyle: {
              color: theme.text,
              fontFamily: 'PorscheDesign-SemiBold',
            },
            tabBarIcon: ({ color, size }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

function TabLayout() {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Force status bar style based on theme - WEB ONLY
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.card);
    }
  }, [isDarkMode, theme.card]);

  // 🎯 PLATFORM DETECTION: Render different layouts based on platform
  if (isWeb) {
    return <WebOverlayLayout />;
  }

  return <NativeTabLayout />;
}

// Wrap the TabLayout with providers
export default function RootLayout() {
  return (
    <ThemeProvider>
      <PropertyProvider>
        <TabLayout />
      </PropertyProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: -16,
  },
  logoWrapper: {
    backgroundColor: '#000000',
    minWidth: 280, // Increased to extend the black area further right
    height: 56,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingLeft: 16,
    paddingRight: 60,
  },
  titleLogo: {
    width: 200,
    height: 48,
  },
});
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MessageSquare, Settings, X, Menu } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

interface WebHeaderProps {
  onToggleChat: () => void;
  showChat: boolean;
}

export function WebHeader({ onToggleChat, showChat }: WebHeaderProps) {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const router = useRouter();

  return (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      {/* Logo with organic flowing shape */}
      <View style={styles.leftSection}>
        <View style={styles.logoWrapper}>
          <Image
            source={{ uri: 'https://srbbuxpndcpeanyzqxva.supabase.co/storage/v1/object/public/logo/logo2.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.rightSection}>
        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: theme.background }]}
          onPress={onToggleChat}
        >
          {showChat ? (
            <X size={20} color={theme.text} />
          ) : (
            <MessageSquare size={20} color={theme.text} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: theme.background }]}
          onPress={() => {/* Navigate to settings */}}
        >
          <Settings size={20} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 72,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrapper: {
    backgroundColor: '#000000',
    height: 72,
    minWidth: 500, // Set minimum width to extend the black area
    paddingLeft: 24,
    paddingRight: 80,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderTopRightRadius: 100, // Creates the organic curve
    borderBottomRightRadius: 100, // Creates the organic curve
    overflow: 'hidden',
  },
  logo: {
    height: 64,
    width: 240,
    marginLeft: 8,
  },
  rightSection: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 24,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
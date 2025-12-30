import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

// This component will wrap the existing ChatScreen 
// but render it in a sidebar layout for web

export function ChatSidebar() {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 
          We'll import and render the existing ChatScreen component here,
          but with modifications to remove the background gradient
          and adjust the layout for sidebar display.
          
          For now, this is a placeholder that you'll connect to your
          existing chat functionality.
        */}
        <View style={styles.chatContainer}>
          {/* Chat messages will go here */}
        </View>
      </ScrollView>

      {/* Input area at bottom */}
      <View style={[styles.inputContainer, { borderTopColor: theme.border }]}>
        {/* Chat input will go here */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  chatContainer: {
    flex: 1,
  },
  inputContainer: {
    borderTopWidth: 1,
    padding: 16,
  },
});
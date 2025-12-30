import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { Moon, Sun, Smartphone } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme, isSystemTheme, setIsSystemTheme } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const saveSettings = () => {
    Alert.alert('Success', 'Settings saved successfully!');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        
        <View style={styles.themeOption}>
          <View style={styles.themeOptionLeft}>
            <Smartphone size={24} color={theme.text} />
            <Text style={[styles.themeOptionText, { color: theme.text }]}>Use System Theme</Text>
          </View>
          <Switch
            value={isSystemTheme}
            onValueChange={setIsSystemTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={isSystemTheme ? theme.card : theme.card}
          />
        </View>

        <View style={[styles.themeOption, { opacity: isSystemTheme ? 0.5 : 1 }]}>
          <View style={styles.themeOptionLeft}>
            {isDarkMode ? (
              <Moon size={24} color={theme.text} />
            ) : (
              <Sun size={24} color={theme.text} />
            )}
            <Text style={[styles.themeOptionText, { color: theme.text }]}>
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            disabled={isSystemTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={isDarkMode ? theme.card : theme.card}
          />
        </View>
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: 'PorscheDesign-SemiBold',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeOptionText: {
    fontSize: 16,
    fontFamily: 'PorscheDesign-Regular',
  },
  input: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
});

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  isSystemTheme: boolean;
  setIsSystemTheme: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  isSystemTheme: true,
  setIsSystemTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [isSystemTheme, setIsSystemTheme] = useState(true);
  
  // Default to dark mode for web, follow system for mobile
  const getInitialTheme = () => {
    if (Platform.OS === 'web') {
      return true; // Always dark mode for web
    }
    return systemColorScheme === 'dark';
  };
  
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme());

  useEffect(() => {
    if (isSystemTheme && Platform.OS !== 'web') {
      setIsDarkMode(systemColorScheme === 'dark');
    } else if (Platform.OS === 'web') {
      // Force dark mode for web
      setIsDarkMode(true);
    }
  }, [systemColorScheme, isSystemTheme]);

  // Force dark mode on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsDarkMode(true);
      if (typeof document !== 'undefined') {
        document.documentElement.style.backgroundColor = '#000000';
        document.documentElement.style.color = '#E0E0E0';
        document.body.style.backgroundColor = '#000000';
        document.body.style.color = '#E0E0E0';
      }
    }
  }, []);

  const toggleTheme = () => {
    if (!isSystemTheme && Platform.OS !== 'web') {
      setIsDarkMode(prev => !prev);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, isSystemTheme, setIsSystemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
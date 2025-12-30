import { ColorSchemeName } from 'react-native';

export const Colors = {
  light: {
    primary: '#007AFF',
    background: '#f5f5f5',
    card: '#ffffff',
    text: '#333333',
    border: '#e0e0e0',
    notification: '#FF3B30',
    tabIconDefault: '#999999',
    tabIconSelected: '#007AFF',
  },
  dark: {
    primary: '#FF7E00',
    background: '#000000',
    card: '#1C1C1E',
    text: '#E0E0E0',
    border: '#38383A',
    notification: '#FF453A',
    tabIconDefault: '#A0A0A0',
    tabIconSelected: '#FF7E00',
  },
};

export const useThemeColor = (
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
  colorScheme: ColorSchemeName,
) => {
  return Colors[colorScheme === 'dark' ? 'dark' : 'light'][colorName];
};
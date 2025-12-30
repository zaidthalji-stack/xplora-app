import { Image, Platform } from 'react-native';

export interface DeveloperConfig {
  id: string;
  name: string;
  variations: string[];
}

export const DEVELOPER_CONFIGS: Record<string, DeveloperConfig> = {
  binghatti: {
    id: 'binghatti',
    name: 'Binghatti',
    variations: [
      'binghatti',
      'binghatti developers',
      'binghatti development',
      'binghatti group',
    ],
  },
};

export function normalizeDeveloperName(developerName: string | null | undefined): string {
  if (!developerName) return '';
  return developerName.toLowerCase().trim();
}

export function matchDeveloper(developerName: string | null | undefined): DeveloperConfig | null {
  const normalized = normalizeDeveloperName(developerName);
  if (!normalized) return null;

  for (const config of Object.values(DEVELOPER_CONFIGS)) {
    if (config.variations.some(variation => normalized.includes(variation))) {
      return config;
    }
  }

  return null;
}

export function getLogoSize(
  zoomLevel: number,
  aspectRatio: number = 1
): { width: number; height: number } {
  let baseHeight: number;

  if (zoomLevel < 10) {
    baseHeight = 15;
  } else if (zoomLevel < 14) {
    baseHeight = 20;
  } else if (zoomLevel < 16) {
    baseHeight = 25;
  } else {
    baseHeight = 30;
  }

  return {
    width: Math.round(baseHeight * aspectRatio),
    height: baseHeight
  };
}

export function isBinghattiProperty(property: any): boolean {
  return matchDeveloper(property?.Developer)?.id === 'binghatti';
}
import type { ThemeConfig } from '../types';

export const modernBoldTheme: ThemeConfig = {
  id: 'modern-bold',
  name: 'Modern & Bold',
  colors: {
    brand: {
      primary: '#19db8a',
      secondary: '#38b4ff',
      tertiary: '#ffa130',
      alternate: '#e0a3e7',
    },
    utility: {
      primaryText: '#14181b',
      secondaryText: '#576c36',
      primaryBackground: '#f1f4f8',
      secondaryBackground: '#ffffff',
    },
    accent: {
      accent1: '#4c19db8a',
      accent2: '#4438b4ff',
      accent3: '#44ffa130',
      accent4: '#b2ffffff',
    },
    semantic: {
      success: '#16b070',
      error: '#ff6973',
      warning: '#cc8a30',
      info: '#38b4ff',
    },
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#19db8a',
        secondary: '#38b4ff',
        tertiary: '#ffa130',
        alternate: '#2b32db',
      },
      utility: {
        primaryText: '#ffffff',
        secondaryText: '#95a1ac',
        primaryBackground: '#14181b',
        secondaryBackground: '#1a2429',
      },
      accent: {
        accent1: '#4c19db8a',
        accent2: '#4438b4ff',
        accent3: '#4cffa130',
        accent4: '#b214181b',
      },
      semantic: {
        success: '#16b070',
        error: '#ff6973',
        warning: '#cc6b30',
        info: '#38b4ff',
      },
    },
  },
};

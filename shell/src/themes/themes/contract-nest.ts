import type { ThemeConfig } from '../types';

export const contractNestTheme: ThemeConfig = {
  id: 'contract-nest',
  name: 'Contract Nest',
  colors: {
    brand: {
      primary: '#E53E3E',
      secondary: '#000000',
      tertiary: '#757575',
      alternate: '#F5F5F5',
    },
    utility: {
      primaryText: '#000000',
      secondaryText: '#525252',
      primaryBackground: '#FFFFFF',
      secondaryBackground: '#F5F5F5',
    },
    accent: {
      accent1: '#E53E3E',
      accent2: '#000000',
      accent3: '#BBBBBB',
      accent4: '#F0F0F0',
    },
    semantic: {
      success: '#2E7D32',
      error: '#E53E3E',
      warning: '#F57C00',
      info: '#0277BD',
    },
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#F56565',
        secondary: '#FFFFFF',
        tertiary: '#AAAAAA',
        alternate: '#1F1F1F',
      },
      utility: {
        primaryText: '#FFFFFF',
        secondaryText: '#BBBBBB',
        primaryBackground: '#000000',
        secondaryBackground: '#1F1F1F',
      },
      accent: {
        accent1: '#FF6B6B',
        accent2: '#FFFFFF',
        accent3: '#888888',
        accent4: '#333333',
      },
      semantic: {
        success: '#66BB6A',
        error: '#EF5350',
        warning: '#FFA726',
        info: '#42A5F5',
      },
    },
  },
};

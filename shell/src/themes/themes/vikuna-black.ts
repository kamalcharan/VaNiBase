import type { ThemeConfig } from '../types';

export const vikunaBlackTheme: ThemeConfig = {
  id: 'vikuna-black',
  name: 'Vikuna Black',
  colors: {
    brand: {
      primary: '#D4911E',
      secondary: '#1A1D26',
      tertiary: '#5A6178',
      alternate: '#F4F3F0',
    },
    utility: {
      primaryText: '#1A1D26',
      secondaryText: '#5A6178',
      primaryBackground: '#FAFAF8',
      secondaryBackground: '#F0EFEB',
    },
    accent: {
      accent1: '#D4911E',
      accent2: '#1A1D26',
      accent3: '#B0B5C5',
      accent4: '#E8E7E3',
    },
    semantic: {
      success: '#2ECC71',
      error: '#E74C3C',
      warning: '#F5A623',
      info: '#3498DB',
    },
  },
  darkMode: {
    colors: {
      brand: {
        primary: '#F5A623',
        secondary: '#E8E6E0',
        tertiary: '#3A3F52',
        alternate: '#1C2030',
      },
      utility: {
        primaryText: '#E8E6E0',
        secondaryText: '#7A8099',
        primaryBackground: '#0D0F14',
        secondaryBackground: '#13161D',
      },
      accent: {
        accent1: '#F5A623',
        accent2: '#E8E6E0',
        accent3: '#3A3F52',
        accent4: '#1C2030',
      },
      semantic: {
        success: '#2ECC71',
        error: '#E74C3C',
        warning: '#F5A623',
        info: '#3498DB',
      },
    },
  },
};

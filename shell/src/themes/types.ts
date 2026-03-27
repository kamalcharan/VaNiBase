/**
 * Theme type definitions — ported from ContractNest theme system.
 * Each theme provides brand/utility/accent/semantic color groups
 * for both light and dark modes.
 */

export interface ThemeColors {
  brand: {
    primary: string;      // Main action color (buttons, links, active states)
    secondary: string;    // Secondary actions, complementary
    tertiary: string;     // Tertiary accent
    alternate: string;    // Alternate/subtle backgrounds or accents
  };
  utility: {
    primaryText: string;        // Main body text
    secondaryText: string;      // Muted/secondary text
    primaryBackground: string;  // Page background
    secondaryBackground: string; // Card/panel/surface background
  };
  accent: {
    accent1: string;    // Transparent/subtle version of primary (often with alpha)
    accent2: string;    // Transparent/subtle version of secondary
    accent3: string;    // Transparent/subtle version of tertiary
    accent4: string;    // Subtle border or surface highlight
  };
  semantic: {
    success: string;
    error: string;
    warning: string;
    info: string;
  };
}

export interface ThemeConfig {
  id: string;           // URL-safe slug (e.g. 'vikuna-black')
  name: string;         // Display name (e.g. 'Vikuna Black')
  colors: ThemeColors;  // Light mode colors
  darkMode: {
    colors: ThemeColors; // Dark mode colors
  };
}

// Types
export type { ThemeConfig, ThemeColors } from './types';

// Registry
export { THEME_REGISTRY, DEFAULT_THEME_ID, getTheme, getThemeColors, listThemes, isValidTheme } from './registry';
export type { ThemeId } from './registry';

// CSS var mapper
export { mapThemeToCSSVars } from './css-var-mapper';

// Color utilities (for products that need direct color manipulation)
export { darkenColor, lightenColor, isLightColor, getContrastColor, hexToRgb, rgbToHex } from './color-utils';

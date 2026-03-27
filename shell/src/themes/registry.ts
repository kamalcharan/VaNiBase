import type { ThemeConfig, ThemeColors } from './types';

// Import all 12 themes
import { bharathavarshaTheme } from './themes/bharathavarsha';
import { classicElegantTheme } from './themes/classic-elegant';
import { contractNestTheme } from './themes/contract-nest';
import { modernBoldTheme } from './themes/modern-bold';
import { modernBusinessTheme } from './themes/modern-business';
import { professionalRedefinedTheme } from './themes/professional-redefined';
import { purpleToneTheme } from './themes/purple-tone';
import { sleekCoolTheme } from './themes/sleek-cool';
import { techAiTheme } from './themes/tech-ai';
import { techFutureTheme } from './themes/tech-future';
import { techySimpleTheme } from './themes/techy-simple';
import { vikunaBlackTheme } from './themes/vikuna-black';

/**
 * Theme registry — single source of truth for all available themes.
 * Keyed by theme id (slug).
 */
export const THEME_REGISTRY: Record<string, ThemeConfig> = {
  'bharathavarsha': bharathavarshaTheme,
  'classic-elegant': classicElegantTheme,
  'contract-nest': contractNestTheme,
  'modern-bold': modernBoldTheme,
  'modern-business': modernBusinessTheme,
  'professional-redefined': professionalRedefinedTheme,
  'purple-tone': purpleToneTheme,
  'sleek-cool': sleekCoolTheme,
  'tech-ai': techAiTheme,
  'tech-future': techFutureTheme,
  'techy-simple': techySimpleTheme,
  'vikuna-black': vikunaBlackTheme,
};

/** Default theme used when no preference is set. */
export const DEFAULT_THEME_ID = 'classic-elegant';

/** Type-safe theme ID. */
export type ThemeId = keyof typeof THEME_REGISTRY;

/** Get a theme config by id. Falls back to default if not found. */
export function getTheme(id: string): ThemeConfig {
  return THEME_REGISTRY[id] ?? THEME_REGISTRY[DEFAULT_THEME_ID];
}

/** Get resolved colors for a theme + mode. */
export function getThemeColors(id: string, isDark: boolean): ThemeColors {
  const theme = getTheme(id);
  return isDark ? theme.darkMode.colors : theme.colors;
}

/** List all themes as {id, name} for UI rendering. */
export function listThemes(): { id: string; name: string }[] {
  return Object.values(THEME_REGISTRY).map((t) => ({ id: t.id, name: t.name }));
}

/** Check if a theme id is valid. */
export function isValidTheme(id: string): boolean {
  return id in THEME_REGISTRY;
}

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  DEFAULT_THEME_ID,
  getTheme,
  listThemes,
  isValidTheme,
} from '../themes';
import { mapThemeToCSSVars } from '../themes/css-var-mapper';
import { useAuth } from '../context/auth-provider';

export type ColorMode = 'light' | 'dark';

interface ThemeContextValue {
  /** Current theme id */
  themeId: string;
  /** Set theme by id */
  setTheme: (id: string) => void;
  /** Current color mode */
  colorMode: ColorMode;
  /** Toggle between light and dark */
  toggleColorMode: () => void;
  /** All available themes for UI rendering */
  themes: { id: string; name: string }[];
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  setTheme: () => {},
  colorMode: 'light',
  toggleColorMode: () => {},
  themes: [],
});

export const useTheme = () => useContext(ThemeContext);

// Storage keys
const STORAGE_KEY_THEME = 'vani-theme-id';
const STORAGE_KEY_MODE = 'vani-color-mode';

/**
 * Apply CSS variables to the document root.
 * Called on every theme/mode change.
 */
function applyCSSVars(themeId: string, isDark: boolean): void {
  const theme = getTheme(themeId);
  const vars = mapThemeToCSSVars(theme, isDark);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  // Set data-theme for any CSS that needs it
  root.setAttribute('data-theme', themeId);

  // Toggle dark class for Tailwind dark mode
  root.classList.toggle('dark', isDark);
}

export function ThemeProvider({
  children,
  initialTheme,
  initialMode,
}: {
  children: ReactNode;
  initialTheme?: string;
  initialMode?: ColorMode;
}) {
  const [themeId, setThemeIdState] = useState<string>(initialTheme || DEFAULT_THEME_ID);
  const [colorMode, setColorMode] = useState<ColorMode>(initialMode || 'light');
  const allThemes = listThemes();
  const { tenant } = useAuth();

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as ColorMode | null;

      if (savedTheme && isValidTheme(savedTheme)) {
        setThemeIdState(savedTheme);
      }
      if (savedMode === 'light' || savedMode === 'dark') {
        setColorMode(savedMode);
      }
    } catch {
      // localStorage may not be available (SSR, incognito)
    }
  }, []);

  // Apply CSS vars whenever theme or mode changes
  useEffect(() => {
    applyCSSVars(themeId, colorMode === 'dark');

    try {
      localStorage.setItem(STORAGE_KEY_THEME, themeId);
      localStorage.setItem(STORAGE_KEY_MODE, colorMode);
    } catch {
      // Ignore storage errors
    }
  }, [themeId, colorMode]);

  // Priority: user.preferred_theme > tenant.theme_id > product default
  // Apply on login or when user/tenant data changes
  const { user } = useAuth();
  useEffect(() => {
    // User-level preference takes highest priority
    if (user?.preferred_theme && isValidTheme(user.preferred_theme)) {
      setThemeIdState(user.preferred_theme);
      return;
    }
    // Then tenant default
    if (tenant?.theme_id && isValidTheme(tenant.theme_id)) {
      try {
        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
        if (!savedTheme) {
          setThemeIdState(tenant.theme_id);
        }
      } catch {
        setThemeIdState(tenant.theme_id);
      }
    }
  }, [user?.preferred_theme, tenant?.theme_id]);

  const setTheme = useCallback((id: string) => {
    if (isValidTheme(id)) {
      setThemeIdState(id);
    }
  }, []);

  const toggleColorMode = useCallback(
    () => setColorMode((m) => (m === 'light' ? 'dark' : 'light')),
    [],
  );

  return (
    <ThemeContext.Provider
      value={{ themeId, setTheme, colorMode, toggleColorMode, themes: allThemes }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

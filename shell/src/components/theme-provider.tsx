'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export type ThemeName =
  | 'ocean-blue'
  | 'emerald-green'
  | 'sunset-amber'
  | 'royal-purple'
  | 'coral-reef'
  | 'slate-gray';

export type ColorMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  colorMode: ColorMode;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'ocean-blue',
  setTheme: () => {},
  colorMode: 'light',
  toggleColorMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const THEMES: { name: ThemeName; label: string }[] = [
  { name: 'ocean-blue', label: 'Ocean Blue' },
  { name: 'emerald-green', label: 'Emerald Green' },
  { name: 'sunset-amber', label: 'Sunset Amber' },
  { name: 'royal-purple', label: 'Royal Purple' },
  { name: 'coral-reef', label: 'Coral Reef' },
  { name: 'slate-gray', label: 'Slate Gray' },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('ocean-blue');
  const [colorMode, setColorMode] = useState<ColorMode>('light');

  useEffect(() => {
    const saved = localStorage.getItem('vani-theme') as ThemeName | null;
    const savedMode = localStorage.getItem('vani-color-mode') as ColorMode | null;
    if (saved) setThemeState(saved);
    if (savedMode) setColorMode(savedMode);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vani-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorMode === 'dark');
    localStorage.setItem('vani-color-mode', colorMode);
  }, [colorMode]);

  const setTheme = useCallback((t: ThemeName) => setThemeState(t), []);
  const toggleColorMode = useCallback(
    () => setColorMode((m) => (m === 'light' ? 'dark' : 'light')),
    []
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorMode, toggleColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

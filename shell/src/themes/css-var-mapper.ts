import type { ThemeConfig } from './types';
import { darkenColor, lightenColor, getContrastColor, hexToRgb } from './color-utils';

/**
 * Strip alpha prefix from 8-char hex, returning standard 6-char hex.
 * Handles #AARRGGBB → #RRGGBB, #RGB → #RRGGBB, and passes through #RRGGBB.
 * Falls back to the input if parsing fails.
 */
function normalizeHex(color: string): string {
  if (!color || typeof color !== 'string') return color;
  const c = color.startsWith('#') ? color.slice(1) : color;

  // 9-char (with #) or 8-char without — AARRGGBB, strip alpha
  if (c.length === 8) return '#' + c.slice(2);
  // Some source files have 7-char values (malformed) — try to use last 6
  if (c.length === 7) return '#' + c.slice(1);
  // 3-char short hex — expand
  if (c.length === 3) return '#' + c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  // Standard 6-char
  if (c.length === 6) return '#' + c;
  // Fallback: if we can still parse it, use the parsed result
  const rgb = hexToRgb(color);
  if (rgb) {
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
  }
  return color;
}

/**
 * Maps a structured ThemeConfig to flat CSS variable key-value pairs.
 * These are applied to document.documentElement.style by ThemeProvider.
 *
 * The output keys match what tailwind.config.ts and all VDF components expect:
 *   --color-bg, --color-fg, --color-surface, --color-primary, etc.
 */
export function mapThemeToCSSVars(
  theme: ThemeConfig,
  isDark: boolean,
): Record<string, string> {
  const colors = isDark ? theme.darkMode.colors : theme.colors;

  // Derive surface-hover: slightly shift the surface color
  const surfaceHover = isDark
    ? lightenColor(normalizeHex(colors.utility.secondaryBackground), 5)
    : darkenColor(normalizeHex(colors.utility.secondaryBackground), 3);

  // Derive primary-fg: contrast text for the primary color
  const primaryFg = getContrastColor(normalizeHex(colors.brand.primary));

  // Derive primary-hover: darken primary slightly
  const primaryHover = darkenColor(normalizeHex(colors.brand.primary), 10);

  // Build chart palette from brand + semantic colors
  const chart1 = normalizeHex(colors.brand.primary);
  const chart2 = normalizeHex(colors.brand.secondary);
  const chart3 = normalizeHex(colors.brand.tertiary);
  const chart4 = normalizeHex(colors.semantic.success);
  const chart5 = normalizeHex(colors.semantic.error);
  const chart6 = normalizeHex(colors.semantic.info);

  return {
    '--color-bg': normalizeHex(colors.utility.primaryBackground),
    '--color-fg': normalizeHex(colors.utility.primaryText),
    '--color-surface': normalizeHex(colors.utility.secondaryBackground),
    '--color-surface-hover': surfaceHover,
    '--color-border': normalizeHex(colors.accent.accent4),
    '--color-muted': normalizeHex(colors.utility.secondaryText),
    '--color-primary': normalizeHex(colors.brand.primary),
    '--color-primary-fg': primaryFg,
    '--color-primary-hover': primaryHover,
    '--color-secondary': normalizeHex(colors.brand.secondary),
    '--color-accent': normalizeHex(colors.brand.tertiary),
    '--color-success': normalizeHex(colors.semantic.success),
    '--color-warning': normalizeHex(colors.semantic.warning),
    '--color-danger': normalizeHex(colors.semantic.error),
    '--color-info': normalizeHex(colors.semantic.info),
    '--color-chart-1': chart1,
    '--color-chart-2': chart2,
    '--color-chart-3': chart3,
    '--color-chart-4': chart4,
    '--color-chart-5': chart5,
    '--color-chart-6': chart6,
  };
}

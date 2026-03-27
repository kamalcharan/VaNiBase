/**
 * Color utility functions for theme system.
 * Pure functions — no DOM access, safe for SSR.
 */

/** Parse hex color to {r, g, b}. Handles #RGB, #RRGGBB, and #AARRGGBB (strips alpha). Returns null on invalid input. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  let c = hex.startsWith('#') ? hex.slice(1) : hex;

  // 8-char hex with alpha prefix (AARRGGBB) — strip alpha
  if (c.length === 8) {
    c = c.slice(2);
  }

  // 3-char short hex — expand to 6
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }

  if (c.length !== 6) return null;

  const num = parseInt(c, 16);
  if (isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/** Convert RGB to hex string (#rrggbb). */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Darken a hex color by a percentage (0-100). */
export function darkenColor(color: string, percent: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const factor = 1 - percent / 100;
  return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

/** Lighten a hex color by a percentage (0-100). */
export function lightenColor(color: string, percent: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const factor = percent / 100;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * factor,
    rgb.g + (255 - rgb.g) * factor,
    rgb.b + (255 - rgb.b) * factor,
  );
}

/**
 * Check if a color is light using W3C AERT brightness formula.
 * Returns true if brightness > 128.
 */
export function isLightColor(color: string): boolean {
  const rgb = hexToRgb(color);
  if (!rgb) return true;
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128;
}

/** Return '#ffffff' or '#000000' for optimal contrast against the given background. */
export function getContrastColor(bgColor: string): string {
  return isLightColor(bgColor) ? '#000000' : '#ffffff';
}

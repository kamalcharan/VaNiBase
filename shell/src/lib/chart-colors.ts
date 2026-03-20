/**
 * Reads CSS custom properties for chart colors at runtime.
 * Chart.js needs actual color values, not var() references.
 */

export function getChartColors(count: number = 6): string[] {
  if (typeof window === 'undefined') {
    return ['#0ea5e9', '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
  }
  const style = getComputedStyle(document.documentElement);
  const colors: string[] = [];
  for (let i = 1; i <= count; i++) {
    colors.push(style.getPropertyValue(`--color-chart-${i}`).trim() || '#888');
  }
  return colors;
}

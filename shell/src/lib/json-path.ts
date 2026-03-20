/**
 * Simple JSONPath-like resolver for recipe data binding.
 * Supports dot notation: "portfolio.holdings" → data.portfolio.holdings
 * Supports root "$" prefix: "$.portfolio" → data.portfolio
 */

export function resolvePath(data: Record<string, unknown>, path: string): unknown {
  if (!path || !data) return data;

  const cleaned = path.startsWith('$.') ? path.slice(2) : path.startsWith('$') ? path.slice(1) : path;
  if (!cleaned) return data;

  const parts = cleaned.split('.');
  let current: unknown = data;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

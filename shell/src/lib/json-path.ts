/**
 * JSONPath-like resolver for recipe data binding.
 * Supports:
 *   - dot notation: "portfolio.holdings"
 *   - array brackets: "goals[0]", "goals[0].name"
 *   - root "$" prefix: "$.portfolio"
 *   - mixed: "data.goals[0].target_amount"
 */
export function resolvePath(data: Record<string, unknown>, path: string): unknown {
  if (!path || !data) return data;

  const cleaned = path.startsWith('$.') ? path.slice(2) : path.startsWith('$') ? path.slice(1) : path;
  if (!cleaned) return data;

  // Split on dots AND brackets: "goals[0].name" → ["goals", "0", "name"]
  const parts = cleaned.split(/[\.\[\]]/).filter(Boolean);

  let current: unknown = data;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(part);
      if (!isNaN(idx)) {
        current = current[idx];
        continue;
      }
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}
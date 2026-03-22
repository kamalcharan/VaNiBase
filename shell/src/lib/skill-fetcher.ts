import type { SkillEndpoint, ShellConfig } from './shell-config-types';

/**
 * Resolves a dot-notation path from an object.
 * e.g. getNestedValue({ a: { b: 1 } }, "a.b") → 1
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Calls a single skill endpoint and returns the response body.
 */
async function callSkill(
  endpoint: SkillEndpoint,
  apiUrl: string,
  headers: Record<string, string>,
): Promise<unknown> {
  const url = `${apiUrl}/api/v1/skills/${endpoint.skill}/${endpoint.function}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ params: endpoint.params ?? {} }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Skill ${endpoint.skill}/${endpoint.function} returned ${res.status}: ${text}`,
    );
  }
  return res.json();
}

/**
 * Builds auth headers from ShellConfig.
 */
export function buildAuthHeaders(config: ShellConfig): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.auth?.devToken) {
    const headerName = config.auth.headerName ?? 'Authorization';
    headers[headerName] = config.auth.devToken;
  }
  if (config.auth?.customHeaders) {           // ← add
    Object.assign(headers, config.auth.customHeaders);  // ← add
  }         
  return headers;
}

/**
 * Fetches data for a recipe by calling all its skill endpoints in parallel.
 * Results are merged into a single data object using responseMapping.
 */
export async function fetchRecipeData(
  skills: SkillEndpoint[],
  apiUrl: string,
  authHeaders: Record<string, string>,
): Promise<Record<string, unknown>> {
  if (skills.length === 0) return {};

  const results = await Promise.all(
    skills.map((endpoint) => callSkill(endpoint, apiUrl, authHeaders)),
  );

  const merged: Record<string, unknown> = {};

  skills.forEach((endpoint, idx) => {
    const result = results[idx];
    if (endpoint.responseMapping) {
      // Map specific response paths to data keys
      for (const [sourcePath, targetKey] of Object.entries(endpoint.responseMapping)) {
        merged[targetKey] = getNestedValue(result, sourcePath);
      }
    } else {
      // No mapping — merge entire response (must be an object)
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        Object.assign(merged, result);
      } else {
        // Non-object response: store under skill/function key
        merged[`${endpoint.skill}_${endpoint.function}`] = result;
      }
    }
  });

  return merged;
}

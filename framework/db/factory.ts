/**
 * DB Layer — Pool Factory (Registry)
 * Single entry point for database access. Products call initPools() at boot
 * and getPool() everywhere else. The registry is a module-level Map.
 */

import { parseDbConfigs } from './config.js';
import { WrappedPool } from './wrapped-pool.js';
import type { WrappedPoolInterface, HealthReport } from './types.js';

const registry = new Map<string, WrappedPool>();

/**
 * Initialize all pools from environment variables.
 * Call once at server boot, before any queries.
 * Safe to call multiple times — second call is a no-op.
 */
export async function initPools(): Promise<void> {
  if (registry.size > 0) {
    console.warn('[DB Factory] Pools already initialized, skipping');
    return;
  }

  const configs = parseDbConfigs();

  if (configs.length === 0) {
    console.log('[DB Factory] No database configured — running in stub mode');
    return;
  }

  for (const config of configs) {
    const pool = new WrappedPool(config);

    // Verify connectivity at boot
    const status = await pool.health();
    if (!status.healthy) {
      console.error(
        `[DB Factory] WARNING: Pool '${config.name}' failed health check: ${status.error}`
      );
      // Don't throw — allow server to start with degraded DB
    } else {
      console.log(
        `[DB Factory] Pool '${config.name}' healthy (${status.latencyMs}ms, ${status.databaseSize})`
      );
    }

    registry.set(config.name, pool);
  }
}

/**
 * Get a named pool. Defaults to 'primary'.
 * Throws if pool not found (descriptive error with available pool names).
 */
export function getPool(name: string = 'primary'): WrappedPoolInterface {
  const pool = registry.get(name);
  if (!pool) {
    const available = Array.from(registry.keys()).join(', ');
    throw new Error(
      `DB pool '${name}' not found. Available: [${available || 'none — call initPools() first'}]`
    );
  }
  return pool;
}

/**
 * Check if any pools have been initialized.
 * Used by context-builder to decide between real DB and stub DB.
 */
export function isPoolReady(): boolean {
  return registry.size > 0;
}

/**
 * Health check all pools. Used by /health/ready endpoint.
 */
export async function healthCheck(): Promise<HealthReport> {
  if (registry.size === 0) {
    return {
      status: 'unhealthy',
      pools: [],
      timestamp: new Date().toISOString(),
    };
  }

  const results = await Promise.all(
    Array.from(registry.values()).map((p) => p.health())
  );

  const allHealthy = results.every((r) => r.healthy);
  const anyHealthy = results.some((r) => r.healthy);

  return {
    status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
    pools: results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Graceful shutdown. Call on SIGTERM/SIGINT.
 */
export async function closeAll(): Promise<void> {
  for (const [, pool] of registry) {
    await pool.close();
  }
  registry.clear();
}

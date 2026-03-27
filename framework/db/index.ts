/**
 * DB Layer — Barrel Exports
 * Single import point for all database functionality.
 */

// Factory (primary API)
export { initPools, getPool, isPoolReady, healthCheck, closeAll } from './factory.js';

// Tenant-scoped DB (skill context layer)
export { createTenantScopedDB, createStubDB, updateWithVersion, StaleVersionError } from './tenant.js';

// Migration runner
export { runMigrations, migrationStatus } from './migrate.js';

// Health endpoint handler
export { dbHealthHandler } from './health.js';

// WrappedPool class (for advanced usage / product servers)
export { WrappedPool } from './wrapped-pool.js';

// Types
export type {
  DbPoolConfig,
  PoolHealthStatus,
  HealthReport,
  MigrationRecord,
  WrappedPoolInterface,
} from './types.js';

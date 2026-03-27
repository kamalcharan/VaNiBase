/**
 * DB Layer — TypeScript Interfaces
 * All types for the multi-database connection factory.
 */

import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/** Configuration for a single named pool, parsed from DB_<NAME>_* env vars. */
export interface DbPoolConfig {
  name: string;                    // 'primary', 'secondary', etc.
  connectionString: string;        // full postgres:// URL
  ssl: false | { rejectUnauthorized: boolean };
  maxConnections: number;          // default 20
  idleTimeoutMs: number;           // default 30000
  connectionTimeoutMs: number;     // default 5000
  statementTimeout: number;        // default 0 (no timeout)
}

/** Health status for a single pool. */
export interface PoolHealthStatus {
  name: string;
  healthy: boolean;
  latencyMs: number;
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
  databaseSize?: string;
  error?: string;
}

/** Aggregated health report across all pools. */
export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  pools: PoolHealthStatus[];
  timestamp: string;
}

/** Record from the vn_migrations tracking table. */
export interface MigrationRecord {
  id: number;
  filename: string;
  applied_at: string;
  checksum?: string;
  applied_by?: string;
  execution_ms?: number;
  notes?: string;
}

/** Public interface for WrappedPool — what consumers see. */
export interface WrappedPoolInterface {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  connect(): Promise<PoolClient>;
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
  health(): Promise<PoolHealthStatus>;
  close(): Promise<void>;
  readonly name: string;
  readonly raw: Pool;              // escape hatch for advanced usage
}

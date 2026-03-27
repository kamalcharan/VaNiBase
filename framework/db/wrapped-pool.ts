/**
 * DB Layer — WrappedPool Class
 * Wraps pg.Pool with transaction helper, health check, and named identity.
 * This is the low-level pool — tenant scoping is layered on top via tenant.ts.
 */

import pg from 'pg';
import type { DbPoolConfig, PoolHealthStatus, WrappedPoolInterface } from './types.js';

const { Pool } = pg;
type PoolClient = pg.PoolClient;
type QueryResultRow = pg.QueryResultRow;

export class WrappedPool implements WrappedPoolInterface {
  private pool: pg.Pool;
  private config: DbPoolConfig;

  constructor(config: DbPoolConfig) {
    this.config = config;
    this.pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMs,
      connectionTimeoutMillis: config.connectionTimeoutMs,
      statement_timeout: config.statementTimeout,
    });

    this.pool.on('error', (err) => {
      console.error(`[DB:${config.name}] Pool error:`, err.message);
    });

    console.log(
      `[DB:${config.name}] Pool created (max=${config.maxConnections}, ssl=${!!config.ssl})`
    );
  }

  /** Direct query — pool checks out and releases a client automatically. */
  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<pg.QueryResult<T>> {
    return this.pool.query(sql, params);
  }

  /** Checkout a client from the pool. Caller MUST release. */
  async connect(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /** Transaction wrapper with auto BEGIN/COMMIT/ROLLBACK. */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  /** Health check: runs a query, returns pool stats. */
  async health(): Promise<PoolHealthStatus> {
    const start = Date.now();
    try {
      const sizeResult = await this.pool.query(
        'SELECT pg_size_pretty(pg_database_size(current_database())) AS size'
      );
      return {
        name: this.config.name,
        healthy: true,
        latencyMs: Date.now() - start,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingRequests: this.pool.waitingCount,
        databaseSize: sizeResult.rows[0]?.size,
      };
    } catch (err) {
      return {
        name: this.config.name,
        healthy: false,
        latencyMs: Date.now() - start,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingRequests: this.pool.waitingCount,
        error: (err as Error).message,
      };
    }
  }

  /** Gracefully close this pool. */
  async close(): Promise<void> {
    await this.pool.end();
    console.log(`[DB:${this.config.name}] Pool closed`);
  }

  get name(): string {
    return this.config.name;
  }

  get raw(): pg.Pool {
    return this.pool;
  }
}

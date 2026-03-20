/**
 * Database Connection Pool — pg Pool with tenant-scoped connections
 * S-01: Connection pooling
 * S-02: Transaction support
 * S-03: FOR UPDATE / optimistic locking
 *
 * Every connection checks out from the pool, runs SET app.tenant_id,
 * then executes queries. This ensures RLS policies work correctly
 * even with connection pooling (PgBouncer).
 */

import pg from 'pg';
import type { TenantScopedDB } from '../../shared/types/index.js';
import { POOL_DEFAULTS, TABLES } from '../../shared/constants/index.js';
import type { DbParamsConfig } from '../config.js';

const { Pool } = pg;
type PoolClient = pg.PoolClient;

let pool: pg.Pool | null = null;

/**
 * Initialize the connection pool.
 * Prefer individual DB params (avoids URL-encoding issues with special-char passwords).
 * Falls back to DATABASE_URL connection string.
 */
export function initPool(databaseUrl: string, dbParams?: DbParamsConfig | null): pg.Pool {
  if (pool) return pool;

  const sslConfig = { rejectUnauthorized: false };
  const sharedOpts = {
    max: POOL_DEFAULTS.MAX_CONNECTIONS,
    idleTimeoutMillis: POOL_DEFAULTS.IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POOL_DEFAULTS.CONNECTION_TIMEOUT_MS,
    ssl: sslConfig,
  };

  if (dbParams) {
    // Individual params — password is passed as-is, no URL-encoding needed
    const poolConfig = {
      host: dbParams.host,
      port: dbParams.port,
      user: dbParams.user,
      password: dbParams.password,
      database: dbParams.database,
      ...sharedOpts,
    };
    const pw = poolConfig.password || '';
    const pwHint = pw.length > 2 ? `${pw[0]}..${pw[pw.length - 1]} (len=${pw.length})` : `(len=${pw.length})`;
    console.info(`[DB Pool] user=${JSON.stringify(poolConfig.user)} password=${pwHint} host=${poolConfig.host} port=${poolConfig.port} db=${poolConfig.database}`);
    pool = new Pool(poolConfig);
  } else {
    // Fallback: connection string
    // pg v8 treats sslmode=require as verify-full, which rejects Supabase's
    // self-signed certs. Strip it so our explicit ssl config takes effect.
    const cleanUrl = databaseUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
    pool = new Pool({ connectionString: cleanUrl, ...sharedOpts });
    console.info('[DB Pool] Using connection string');
  }

  pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected error on idle client:', err.message);
  });

  console.info(`[DB Pool] Initialized (max=${POOL_DEFAULTS.MAX_CONNECTIONS})`);
  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) throw new Error('DB pool not initialized — call initPool() first');
  return pool;
}

export function isPoolReady(): boolean {
  return pool !== null;
}

/**
 * Stub TenantScopedDB for dev/mock mode when no Postgres is available.
 * All queries return empty results; writes are no-ops.
 */
export function createStubDB(tenantId: string): TenantScopedDB {
  return {
    async query() { return []; },
    async queryOne() { return null; },
    async queryForUpdate() { return []; },
    async execute() { return { rowCount: 0 }; },
    async transaction<T>(fn: (tx: TenantScopedDB) => Promise<T>): Promise<T> {
      return fn(createStubDB(tenantId));
    },
  };
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.info('[DB Pool] Closed');
  }
}

/**
 * Check if the pool is healthy by running a simple query.
 */
export async function checkPoolHealth(): Promise<boolean> {
  try {
    const p = getPool();
    // Use simple query (no prepared statement) — compatible with Supabase transaction pooler
    const result = await p.query({ text: 'SELECT 1 AS ok', rowMode: 'array' });
    return result.rows.length > 0;
  } catch (err) {
    console.error('[DB Pool] Health check failed:', err);
    return false;
  }
}

/**
 * Convert Record<string, unknown> params to positional ($1, $2...) format.
 * Input SQL uses :paramName syntax. Returns { text, values }.
 */
function toPositional(
  sql: string,
  params: Record<string, unknown>
): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  let idx = 0;
  const text = sql.replace(/:(\w+)/g, (_match, name) => {
    idx++;
    values.push(params[name]);
    return `$${idx}`;
  });
  return { text, values };
}

/**
 * Build a TenantScopedDB from a raw PoolClient.
 * Every method sets tenant context before querying.
 */
function buildDBFromClient(client: PoolClient, tenantId: string): TenantScopedDB {
  const setTenantCtx = async () => {
    await client.query('SELECT set_tenant_context($1)', [tenantId]);
  };

  return {
    async query<T = Record<string, unknown>>(sql: string, params: Record<string, unknown>): Promise<T[]> {
      await setTenantCtx();
      const { text, values } = toPositional(sql, params);
      const result = await client.query(text, values);
      return result.rows as T[];
    },

    async queryOne<T = Record<string, unknown>>(sql: string, params: Record<string, unknown>): Promise<T | null> {
      await setTenantCtx();
      const { text, values } = toPositional(sql, params);
      const result = await client.query(text, values);
      return (result.rows[0] as T) ?? null;
    },

    async queryForUpdate<T = Record<string, unknown>>(sql: string, params: Record<string, unknown>): Promise<T[]> {
      await setTenantCtx();
      const forUpdateSql = sql.trimEnd().replace(/;?\s*$/, '') + ' FOR UPDATE';
      const { text, values } = toPositional(forUpdateSql, params);
      const result = await client.query(text, values);
      return result.rows as T[];
    },

    async execute(sql: string, params: Record<string, unknown>): Promise<{ rowCount: number }> {
      await setTenantCtx();
      const { text, values } = toPositional(sql, params);
      const result = await client.query(text, values);
      return { rowCount: result.rowCount ?? 0 };
    },

    async transaction<T>(fn: (tx: TenantScopedDB) => Promise<T>): Promise<T> {
      // Already inside a client — just wrap with BEGIN/COMMIT
      await client.query('BEGIN');
      try {
        const result = await fn(buildDBFromClient(client, tenantId));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    },
  };
}

/**
 * Create a TenantScopedDB that checks out a connection per operation.
 * For transactions, the connection is held for the duration of the tx.
 */
export function createTenantScopedDB(tenantId: string): TenantScopedDB {
  const p = getPool();

  const withClient = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await p.connect();
    try {
      await client.query('SELECT set_tenant_context($1)', [tenantId]);
      return await fn(client);
    } finally {
      client.release();
    }
  };

  return {
    async query<T = Record<string, unknown>>(sql: string, params: Record<string, unknown>): Promise<T[]> {
      return withClient(async (client) => {
        const { text, values } = toPositional(sql, params);
        const result = await client.query(text, values);
        return result.rows as T[];
      });
    },

    async queryOne<T = Record<string, unknown>>(sql: string, params: Record<string, unknown>): Promise<T | null> {
      return withClient(async (client) => {
        const { text, values } = toPositional(sql, params);
        const result = await client.query(text, values);
        return (result.rows[0] as T) ?? null;
      });
    },

    async queryForUpdate<T = Record<string, unknown>>(sql: string, params: Record<string, unknown>): Promise<T[]> {
      return withClient(async (client) => {
        const forUpdateSql = sql.trimEnd().replace(/;?\s*$/, '') + ' FOR UPDATE';
        const { text, values } = toPositional(forUpdateSql, params);
        const result = await client.query(text, values);
        return result.rows as T[];
      });
    },

    async execute(sql: string, params: Record<string, unknown>): Promise<{ rowCount: number }> {
      return withClient(async (client) => {
        const { text, values } = toPositional(sql, params);
        const result = await client.query(text, values);
        return { rowCount: result.rowCount ?? 0 };
      });
    },

    async transaction<T>(fn: (tx: TenantScopedDB) => Promise<T>): Promise<T> {
      const client = await p.connect();
      try {
        await client.query('SELECT set_tenant_context($1)', [tenantId]);
        await client.query('BEGIN');
        try {
          const tx = buildDBFromClient(client, tenantId);
          const result = await fn(tx);
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      } finally {
        client.release();
      }
    },
  };
}

/**
 * Optimistic locking helper.
 * Throws StaleVersionError if the row was modified since it was read.
 * Usage: await assertVersion(ctx.db, 'vn_holdings', holdingId, expectedVersion);
 */
export class StaleVersionError extends Error {
  constructor(table: string, id: string) {
    super(`Stale version: ${table} row ${id} was modified by another transaction`);
    this.name = 'StaleVersionError';
  }
}

export async function updateWithVersion(
  db: TenantScopedDB,
  table: string,
  id: string,
  expectedVersion: number,
  setClauses: string,
  params: Record<string, unknown>
): Promise<void> {
  const result = await db.execute(
    `UPDATE ${table} SET ${setClauses}, version = version + 1 WHERE id = :id AND version = :expectedVersion`,
    { ...params, id, expectedVersion }
  );
  if (result.rowCount === 0) {
    throw new StaleVersionError(table, id);
  }
}

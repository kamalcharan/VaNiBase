/**
 * DB Layer — Tenant-Scoped Database Access
 * Preserved from the original pool.ts. Provides:
 * - createTenantScopedDB(): builds TenantScopedDB from a WrappedPool
 * - createStubDB(): mock TenantScopedDB for dev/mock mode (no Postgres)
 * - toPositional(): converts :paramName → $N positional params
 * - updateWithVersion(): optimistic locking helper
 *
 * This layer sits ON TOP of WrappedPool. Skills interact with TenantScopedDB,
 * never with WrappedPool directly.
 */

import type pg from 'pg';
import type { TenantScopedDB } from '../../shared/types/index.js';
import type { WrappedPoolInterface } from './types.js';

type PoolClient = pg.PoolClient;

/**
 * Convert named params (:paramName) to positional ($1, $2...) format.
 * Regex matches :word but NOT ::text casts or standalone numbers like LIMIT 1.
 */
function toPositional(
  sql: string,
  params: Record<string, unknown>
): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  let idx = 0;
  const text = sql.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, (match) => {
    const name = match.slice(1); // strip leading ':'
    idx++;
    values.push(params[name]);
    return `$${idx}`;
  });
  return { text, values };
}

/**
 * Build a TenantScopedDB from a raw PoolClient (used inside transactions).
 * Every method sets tenant context before querying.
 */
function buildDBFromClient(client: PoolClient, tenantId: string): TenantScopedDB {
  const setTenantCtx = async () => {
    await client.query('SELECT set_tenant_context($1)', [tenantId]);
  };

  return {
    async query<T = Record<string, unknown>>(
      sql: string,
      params: Record<string, unknown>
    ): Promise<{ rows: T[] }> {
      await setTenantCtx();
      const { text, values } = toPositional(sql, params);
      const result = await client.query(text, values);
      return { rows: result.rows as T[] };
    },

    async queryOne<T = Record<string, unknown>>(
      sql: string,
      params: Record<string, unknown>
    ): Promise<T | null> {
      await setTenantCtx();
      const { text, values } = toPositional(sql, params);
      const result = await client.query(text, values);
      return (result.rows[0] as T) ?? null;
    },

    async queryForUpdate<T = Record<string, unknown>>(
      sql: string,
      params: Record<string, unknown>
    ): Promise<T[]> {
      await setTenantCtx();
      const forUpdateSql = sql.trimEnd().replace(/;?\s*$/, '') + ' FOR UPDATE';
      const { text, values } = toPositional(forUpdateSql, params);
      const result = await client.query(text, values);
      return result.rows as T[];
    },

    async execute(
      sql: string,
      params: Record<string, unknown>
    ): Promise<{ rowCount: number }> {
      await setTenantCtx();
      const { text, values } = toPositional(sql, params);
      const result = await client.query(text, values);
      return { rowCount: result.rowCount ?? 0 };
    },

    async transaction<T>(fn: (tx: TenantScopedDB) => Promise<T>): Promise<T> {
      // Already inside a client — nested transaction via SAVEPOINT
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
 * Stub TenantScopedDB for dev/mock mode when no Postgres is available.
 * All queries return empty results; writes are no-ops.
 */
export function createStubDB(tenantId: string): TenantScopedDB {
  return {
    async query() { return { rows: [] }; },
    async queryOne() { return null; },
    async queryForUpdate() { return []; },
    async execute() { return { rowCount: 0 }; },
    async transaction<T>(fn: (tx: TenantScopedDB) => Promise<T>): Promise<T> {
      return fn(createStubDB(tenantId));
    },
  };
}

/**
 * Create a TenantScopedDB that checks out a connection per operation.
 * For transactions, the connection is held for the duration of the tx.
 *
 * @param tenantId - UUID of the tenant (injected from JWT, never from LLM)
 * @param pool - A WrappedPool instance (from the factory)
 */
export function createTenantScopedDB(
  tenantId: string,
  pool: WrappedPoolInterface
): TenantScopedDB {
  const pgPool = pool.raw;

  const withClient = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pgPool.connect();
    try {
      await client.query('SELECT set_tenant_context($1)', [tenantId]);
      return await fn(client);
    } finally {
      client.release();
    }
  };

  return {
    async query<T = Record<string, unknown>>(
      sql: string,
      params: Record<string, unknown>
    ): Promise<{ rows: T[] }> {
      return withClient(async (client) => {
        const { text, values } = toPositional(sql, params);
        const result = await client.query(text, values);
        return { rows: result.rows as T[] };
      });
    },

    async queryOne<T = Record<string, unknown>>(
      sql: string,
      params: Record<string, unknown>
    ): Promise<T | null> {
      return withClient(async (client) => {
        const { text, values } = toPositional(sql, params);
        const result = await client.query(text, values);
        return (result.rows[0] as T) ?? null;
      });
    },

    async queryForUpdate<T = Record<string, unknown>>(
      sql: string,
      params: Record<string, unknown>
    ): Promise<T[]> {
      return withClient(async (client) => {
        const forUpdateSql = sql.trimEnd().replace(/;?\s*$/, '') + ' FOR UPDATE';
        const { text, values } = toPositional(forUpdateSql, params);
        const result = await client.query(text, values);
        return result.rows as T[];
      });
    },

    async execute(
      sql: string,
      params: Record<string, unknown>
    ): Promise<{ rowCount: number }> {
      return withClient(async (client) => {
        const { text, values } = toPositional(sql, params);
        const result = await client.query(text, values);
        return { rowCount: result.rowCount ?? 0 };
      });
    },

    async transaction<T>(fn: (tx: TenantScopedDB) => Promise<T>): Promise<T> {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT set_tenant_context($1)', [tenantId]);

        const tx = buildDBFromClient(client, tenantId);
        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

/**
 * Optimistic locking helper.
 * Throws StaleVersionError if the row was modified since it was read.
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

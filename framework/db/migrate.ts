/**
 * DB Layer — Migration Runner
 * Runs SQL migration files against a named pool.
 * Tracks applied migrations in the vn_migrations table.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getPool } from './factory.js';
import type { MigrationRecord } from './types.js';

const MIGRATIONS_TABLE = 'vn_migrations';

/**
 * Run all pending migrations from a directory against a named pool.
 * Migrations are applied in filename order (sort lexicographically).
 * Each migration runs inside a transaction.
 *
 * @param migrationsDir - Absolute path to the migrations/ directory
 * @param poolName - Which pool to run against (default: 'primary')
 * @returns Array of newly applied migration records
 */
export async function runMigrations(
  migrationsDir: string,
  poolName: string = 'primary'
): Promise<MigrationRecord[]> {
  const db = getPool(poolName);

  // Ensure migrations tracking table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      checksum    VARCHAR(64),
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_by  VARCHAR(100) DEFAULT 'system',
      execution_ms INTEGER,
      notes       TEXT
    )
  `);

  // Get already-applied migrations
  const { rows: applied } = await db.query<{ filename: string }>(
    `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  const appliedSet = new Set(applied.map((r) => r.filename));

  // Read migration files (sorted by filename = by timestamp/number)
  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    console.warn(`[Migrate:${poolName}] Migrations directory not found: ${migrationsDir}`);
    return [];
  }

  const newMigrations: MigrationRecord[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    const start = Date.now();

    console.log(`[Migrate:${poolName}] Applying: ${file}`);

    await db.transaction(async (client) => {
      await client.query(sql);
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (filename, execution_ms) VALUES ($1, $2)`,
        [file, Date.now() - start]
      );
    });

    const record: MigrationRecord = {
      id: 0,
      filename: file,
      applied_at: new Date().toISOString(),
      execution_ms: Date.now() - start,
    };
    newMigrations.push(record);
    console.log(`[Migrate:${poolName}] Applied: ${file} (${record.execution_ms}ms)`);
  }

  if (newMigrations.length === 0) {
    console.log(`[Migrate:${poolName}] All migrations up to date`);
  }

  return newMigrations;
}

/**
 * Get the list of applied migrations for a pool.
 */
export async function migrationStatus(
  poolName: string = 'primary'
): Promise<MigrationRecord[]> {
  const db = getPool(poolName);
  const { rows } = await db.query<MigrationRecord>(
    `SELECT * FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  return rows;
}

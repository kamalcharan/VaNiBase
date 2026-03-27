/**
 * DB Layer — Environment Configuration Reader
 * Scans process.env for DB_<NAME>_* variables, builds DbPoolConfig objects.
 * Supports SSL auto-detection and backward compat with DATABASE_URL.
 */

import type { DbPoolConfig } from './types.js';

/**
 * Discover all pool names from environment variables.
 * Looks for DB_<NAME> patterns (e.g., DB_PRIMARY, DB_SECONDARY).
 * Falls back to DATABASE_URL as DB_PRIMARY for backward compat.
 */
function discoverPoolNames(): string[] {
  const names = new Set<string>();

  for (const key of Object.keys(process.env)) {
    // Match DB_PRIMARY, DB_SECONDARY, etc. (not DB_PRIMARY_SSL, DB_PRIMARY_POOL_MAX)
    const match = key.match(/^DB_([A-Z][A-Z0-9]*)$/);
    if (match) names.add(match[1]);
  }

  // Backward compat: if DATABASE_URL exists and no DB_PRIMARY, add PRIMARY
  if (!names.has('PRIMARY') && process.env.DATABASE_URL) {
    names.add('PRIMARY');
  }

  return Array.from(names);
}

/**
 * Determine SSL config for a pool.
 * Priority: explicit DB_<NAME>_SSL > auto-detect from hostname.
 */
function resolveSSL(
  name: string,
  connStr: string
): false | { rejectUnauthorized: boolean } {
  const explicit = process.env[`DB_${name}_SSL`];

  if (explicit === 'false') return false;
  if (explicit === 'true') return { rejectUnauthorized: false };

  // Auto-detect from hostname
  try {
    const url = new URL(connStr);
    const host = url.hostname;

    // Supabase → SSL required
    if (host.includes('supabase.com') || host.includes('supabase.co')) {
      return { rejectUnauthorized: false };
    }

    // Private/local hosts → no SSL
    if (isPrivateHost(host)) return false;

    // Public hosts → SSL on by default
    return { rejectUnauthorized: false };
  } catch {
    // Can't parse URL — default to SSL on
    return { rejectUnauthorized: false };
  }
}

/** Check if a hostname is a private/local address. */
function isPrivateHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)
  );
}

/** Strip ?sslmode=... from connection string (pg v8 misinterprets it). */
function stripSslMode(connStr: string): string {
  return connStr.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
}

/** Read an integer env var with a default. */
function getEnvInt(key: string, def: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : def;
}

/**
 * Parse all DB_<NAME>_* env vars into an array of DbPoolConfig.
 * Returns empty array if no database configuration is found (allows mock mode).
 */
export function parseDbConfigs(): DbPoolConfig[] {
  const configs: DbPoolConfig[] = [];
  const poolNames = discoverPoolNames();

  for (const name of poolNames) {
    const connStr =
      process.env[`DB_${name}`] ||
      (name === 'PRIMARY' ? process.env.DATABASE_URL : undefined);

    if (!connStr) continue; // skip if no connection string

    configs.push({
      name: name.toLowerCase(),
      connectionString: stripSslMode(connStr),
      ssl: resolveSSL(name, connStr),
      maxConnections: getEnvInt(`DB_${name}_POOL_MAX`, 20),
      idleTimeoutMs: getEnvInt(`DB_${name}_POOL_IDLE_MS`, 30000),
      connectionTimeoutMs: getEnvInt(`DB_${name}_POOL_CONN_MS`, 5000),
      statementTimeout: getEnvInt(`DB_${name}_STMT_TIMEOUT`, 0),
    });
  }

  // Also support legacy individual DB params (DB_HOST, DB_USER, etc.)
  if (configs.length === 0 && process.env.DB_HOST) {
    const port = parseInt(process.env.DB_PORT || '5432', 10);
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'postgres';
    const host = process.env.DB_HOST;

    // Build connection string from individual params
    const encodedPassword = encodeURIComponent(password);
    const connStr = `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;

    configs.push({
      name: 'primary',
      connectionString: connStr,
      ssl: isPrivateHost(host) ? false : { rejectUnauthorized: false },
      maxConnections: getEnvInt('DB_PRIMARY_POOL_MAX', 20),
      idleTimeoutMs: getEnvInt('DB_PRIMARY_POOL_IDLE_MS', 30000),
      connectionTimeoutMs: getEnvInt('DB_PRIMARY_POOL_CONN_MS', 5000),
      statementTimeout: getEnvInt('DB_PRIMARY_STMT_TIMEOUT', 0),
    });
  }

  return configs;
}

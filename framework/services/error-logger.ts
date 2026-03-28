/**
 * Error Logger Service
 *
 * Logs errors to VN_error_log (production) or console (development).
 * The DB insert is wrapped in try/catch — logging must never throw.
 */

import { getPool, isPoolReady } from '../db/index.js';

export type Severity = 'error' | 'warning' | 'critical';

export interface ErrorLogEntry {
  tenant_id?: string;
  user_id?: string;
  error_code: string;
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  severity?: Severity;
  metadata?: Record<string, unknown>;
}

export async function logError(entry: ErrorLogEntry): Promise<void> {
  const severity = entry.severity || 'error';

  if (process.env.NODE_ENV === 'development') {
    const ts = new Date().toISOString();
    console.error(
      `[${ts}] [${severity.toUpperCase()}] ${entry.error_code}: ${entry.message}` +
      (entry.endpoint ? ` | ${entry.method ?? ''} ${entry.endpoint}` : '') +
      (entry.stack ? `\n${entry.stack}` : '')
    );
    return;
  }

  if (!isPoolReady()) {
    console.error(`[ErrorLogger] DB not available, falling back to console:`, entry.error_code, entry.message);
    return;
  }

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO VN_error_log (tenant_id, user_id, error_code, message, stack, endpoint, method, severity, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.tenant_id || null,
        entry.user_id || null,
        entry.error_code,
        entry.message,
        entry.stack || null,
        entry.endpoint || null,
        entry.method || null,
        severity,
        JSON.stringify(entry.metadata || {}),
      ]
    );
  } catch (dbErr) {
    console.error('[ErrorLogger] Failed to write to VN_error_log:', (dbErr as Error).message);
    console.error('[ErrorLogger] Original error:', entry.error_code, entry.message);
  }
}

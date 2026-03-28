/**
 * Auth Layer — Password Management Service
 *
 * Business logic for password change, forgot-password, and reset-password.
 * Tables: VN_users, VN_password_resets, VN_refresh_tokens
 */

import crypto from 'crypto';
import { getPool } from '../db/index.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { hashToken } from './tokens.js';
import { AuthenticationError, ValidationError, NotFoundError } from '../errors/index.js';

const RESET_TOKEN_EXPIRY_HOURS = 1;

function auditLog(
  tenantId: string | null,
  userId: string | null,
  category: string,
  action: string,
  opts: { ipAddress?: string; userAgent?: string; metadata?: Record<string, unknown> } = {},
): void {
  const pool = getPool();
  pool.query(
    `INSERT INTO VN_audit_log (tenant_id, user_id, category, action, ip_address, user_agent, status, metadata)
     VALUES ($1, $2, $3, $4, $5::inet, $6, 'success', $7)`,
    [
      tenantId, userId, category, action,
      opts.ipAddress || null, opts.userAgent || null,
      opts.metadata ? JSON.stringify(opts.metadata) : '{}',
    ],
  ).catch((err) => console.error('[AuditLog] Write failed:', (err as Error).message));
}

/**
 * Change password for an authenticated user.
 */
export async function changePassword(
  userId: string,
  tenantId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const pool = getPool();

  // Fetch current hash
  const { rows } = await pool.query(
    'SELECT password_hash FROM VN_users WHERE id = $1 AND tenant_id = $2',
    [userId, tenantId],
  );
  if (rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const valid = await verifyPassword(currentPassword, (rows[0] as { password_hash: string }).password_hash);
  if (!valid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  if (newPassword.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const newHash = await hashPassword(newPassword);
  await pool.query(
    'UPDATE VN_users SET password_hash = $1, updated_at = now() WHERE id = $2',
    [newHash, userId],
  );

  auditLog(tenantId, userId, 'auth', 'password_changed');
}

/**
 * Generate a password reset token for an email address.
 * Returns the raw token if user found, null if not (caller decides response).
 */
export async function forgotPassword(email: string): Promise<string | null> {
  const pool = getPool();
  const normalizedEmail = email.toLowerCase().trim();

  const { rows } = await pool.query(
    'SELECT id, tenant_id FROM VN_users WHERE email = $1 AND is_active = true',
    [normalizedEmail],
  );
  if (rows.length === 0) {
    return null;
  }

  const user = rows[0] as { id: string; tenant_id: string };
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  await pool.query(
    `INSERT INTO VN_password_resets (user_id, token_hash, expires_at, used)
     VALUES ($1, $2, $3, false)`,
    [user.id, tokenHash, expiresAt],
  );

  auditLog(user.tenant_id, user.id, 'auth', 'password_reset_requested');

  return rawToken;
}

/**
 * Reset password using a token. Updates password, marks token used, revokes all sessions.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const pool = getPool();
  const tokenHash = hashToken(token);

  // Look up reset token
  const { rows } = await pool.query(
    `SELECT pr.id, pr.user_id, pr.used, pr.expires_at, u.tenant_id
     FROM VN_password_resets pr
     JOIN VN_users u ON pr.user_id = u.id
     WHERE pr.token_hash = $1`,
    [tokenHash],
  );

  if (rows.length === 0) {
    throw new ValidationError('Invalid or expired reset token');
  }

  const reset = rows[0] as { id: string; user_id: string; used: boolean; expires_at: string; tenant_id: string };

  if (reset.used) {
    throw new ValidationError('Invalid or expired reset token');
  }

  if (new Date(reset.expires_at) < new Date()) {
    throw new ValidationError('Invalid or expired reset token');
  }

  if (newPassword.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const newHash = await hashPassword(newPassword);

  await pool.transaction(async (client) => {
    // Update password
    await client.query(
      'UPDATE VN_users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [newHash, reset.user_id],
    );

    // Mark token as used
    await client.query(
      'UPDATE VN_password_resets SET used = true WHERE id = $1',
      [reset.id],
    );

    // Revoke all active sessions (force re-login)
    await client.query(
      `UPDATE VN_refresh_tokens SET is_active = false, revoked_at = now(), revoked_reason = 'password_reset'
       WHERE user_id = $1 AND is_active = true`,
      [reset.user_id],
    );
  });

  auditLog(reset.tenant_id, reset.user_id, 'auth', 'password_reset_completed');
}

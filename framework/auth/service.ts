/**
 * Auth Service — Business logic for register, login, refresh, logout, me.
 * Aligned to 001_vn_foundation.sql + 002_vn_operational.sql schemas.
 *
 * Tables used:
 *   VN_tenants, VN_tenant_profiles, VN_users, VN_roles, VN_user_roles,
 *   VN_refresh_tokens, VN_subscriptions, VN_audit_log
 */

import { getPool } from '../db/index.js';
import { hashPassword, verifyPassword } from './passwords.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  ACCESS_TOKEN_SECONDS,
  REFRESH_TOKEN_SECONDS,
} from './tokens.js';
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  TokenPair,
  AuthUserResponse,
  AuthTenantResponse,
} from './types.js';
import type { SubscriptionTier } from '../../shared/types/index.js';

// ── Helpers ──

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** Map subscription plan_code to the SubscriptionTier enum for backward compat. */
function planToTier(planCode: string): SubscriptionTier {
  if (planCode === 'enterprise' || planCode === 'custom') return 'enterprise';
  if (planCode === 'pro' || planCode === 'professional') return 'professional';
  return 'starter';
}

/** Fetch role codes for a user. */
async function getUserRoles(userId: string): Promise<string[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT r.code FROM VN_user_roles ur
     JOIN VN_roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1 AND ur.revoked_at IS NULL`,
    [userId],
  );
  return rows.map((r) => (r as { code: string }).code);
}

/** Fetch tenant profile + subscription info. */
async function getTenantInfo(tenantId: string): Promise<AuthTenantResponse> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT t.id, t.slug, t.status,
            tp.name, tp.display_name,
            COALESCE(s.plan_code, 'free') AS plan_code
     FROM VN_tenants t
     JOIN VN_tenant_profiles tp ON tp.tenant_id = t.id
     LEFT JOIN VN_subscriptions s ON s.tenant_id = t.id AND s.is_current = true
     WHERE t.id = $1`,
    [tenantId],
  );
  if (rows.length === 0) throw Object.assign(new Error('Tenant not found'), { status: 404, code: 'TENANT_NOT_FOUND' });
  const r = rows[0];
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    display_name: r.display_name,
    plan_code: r.plan_code,
    status: r.status,
  };
}

/** Write to VN_audit_log (fire-and-forget). */
function auditLog(
  tenantId: string | null,
  userId: string | null,
  category: string,
  action: string,
  opts: {
    targetType?: string;
    targetId?: string;
    ipAddress?: string;
    userAgent?: string;
    status?: 'success' | 'failure';
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  } = {},
): void {
  const pool = getPool();
  pool.query(
    `INSERT INTO VN_audit_log (tenant_id, user_id, category, action, target_type, target_id, ip_address, user_agent, status, error_message, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8, $9, $10, $11)`,
    [
      tenantId, userId, category, action,
      opts.targetType || null, opts.targetId || null,
      opts.ipAddress || null, opts.userAgent || null,
      opts.status || 'success', opts.errorMessage || null,
      opts.metadata ? JSON.stringify(opts.metadata) : '{}',
    ],
  ).catch((err) => console.error('[AuditLog] Write failed:', (err as Error).message));
}

/** Store a refresh token hash in VN_refresh_tokens. */
async function storeRefreshToken(
  userId: string,
  tenantId: string,
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<void> {
  const pool = getPool();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_SECONDS * 1000).toISOString();
  await pool.query(
    `INSERT INTO VN_refresh_tokens (user_id, tenant_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5::inet, $6)`,
    [userId, tenantId, hashToken(refreshToken), userAgent || null, ipAddress || null, expiresAt],
  );
}

/** Issue an access + refresh token pair. */
async function issueTokens(
  userId: string,
  tenantId: string,
  roles: string[],
  planCode: string,
  email: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<TokenPair> {
  const tier = planToTier(planCode);

  const accessToken = signAccessToken({
    sub: userId,
    tenant_id: tenantId,
    roles,
    tier,
    email,
  });

  const refreshToken = signRefreshToken({
    sub: userId,
    tenant_id: tenantId,
    type: 'refresh',
  });

  await storeRefreshToken(userId, tenantId, refreshToken, userAgent, ipAddress);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TOKEN_SECONDS,
  };
}

// ── Public API ──

/**
 * Register a new tenant + user.
 * Creates: VN_tenants → VN_tenant_profiles → VN_users → VN_user_roles (owner)
 *          → VN_subscriptions (free) → VN_subscription_history
 */
export async function register(
  req: RegisterRequest,
  userAgent?: string,
  ipAddress?: string,
): Promise<AuthResponse> {
  const pool = getPool();
  const email = req.email.toLowerCase().trim();

  // Check if email exists in any tenant
  const { rows: existing } = await pool.query(
    'SELECT id FROM VN_users WHERE email = $1',
    [email],
  );
  if (existing.length > 0) {
    throw Object.assign(new Error('Email already registered'), { status: 409, code: 'AUTH_EMAIL_EXISTS' });
  }

  const passwordHash = await hashPassword(req.password);
  const tenantSlug = req.tenant_slug || slugify(req.tenant_name) + '-' + Date.now().toString(36);

  const result = await pool.transaction(async (client) => {
    // 1. Create tenant
    const tenantResult = await client.query(
      `INSERT INTO VN_tenants (slug, status, activated_at)
       VALUES ($1, 'active', now())
       RETURNING id, slug, status`,
      [tenantSlug],
    );
    const tenant = tenantResult.rows[0];

    // 2. Create tenant profile
    await client.query(
      `INSERT INTO VN_tenant_profiles (tenant_id, name, display_name)
       VALUES ($1, $2, $3)`,
      [tenant.id, req.tenant_name, req.tenant_name],
    );

    // 3. Create user
    const userResult = await client.query(
      `INSERT INTO VN_users (tenant_id, email, password_hash, name, is_active, is_email_verified)
       VALUES ($1, $2, $3, $4, true, false)
       RETURNING id, tenant_id, email, name`,
      [tenant.id, email, passwordHash, req.name],
    );
    const user = userResult.rows[0];

    // 4. Assign 'owner' role
    await client.query(
      `INSERT INTO VN_user_roles (user_id, role_id)
       VALUES ($1, '00000000-0000-0000-0000-000000000002')`,
      [user.id],
    );

    // 5. Create free subscription
    await client.query(
      `INSERT INTO VN_subscriptions (tenant_id, plan_code, plan_name, status, max_users, max_sessions)
       VALUES ($1, 'free', 'Free', 'active', 1, 1)`,
      [tenant.id],
    );

    return { user, tenant };
  });

  const { user, tenant } = result;
  const roles = ['owner'];

  // Issue tokens
  const tokens = await issueTokens(user.id, tenant.id, roles, 'free', user.email, userAgent, ipAddress);

  // Audit log
  auditLog(tenant.id, user.id, 'auth', 'register', {
    targetType: 'user', targetId: user.id, ipAddress, userAgent,
  });

  return {
    tokens,
    user: { id: user.id, tenant_id: user.tenant_id, email: user.email, name: user.name, roles },
    tenant: { id: tenant.id, slug: tenant.slug, name: req.tenant_name, display_name: req.tenant_name, plan_code: 'free', status: 'active' },
  };
}

/**
 * Login with email + password.
 * Checks: account active, not locked, password valid.
 * Tracks: failed attempts, lockout, last_login_at.
 */
export async function login(
  req: LoginRequest,
  userAgent?: string,
  ipAddress?: string,
): Promise<AuthResponse> {
  const pool = getPool();
  const email = req.email.toLowerCase().trim();

  // Fetch user + tenant
  const { rows } = await pool.query(
    `SELECT u.id, u.tenant_id, u.email, u.name, u.password_hash,
            u.is_active, u.failed_login_count, u.locked_until,
            t.status AS tenant_status
     FROM VN_users u
     JOIN VN_tenants t ON u.tenant_id = t.id
     WHERE u.email = $1`,
    [email],
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  }

  const user = rows[0];

  // Check account status
  if (!user.is_active) {
    throw Object.assign(new Error('Account is deactivated'), { status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  }

  if (user.tenant_status !== 'active') {
    throw Object.assign(new Error('Organization account is not active'), { status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  }

  // Check lockout
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    auditLog(user.tenant_id, user.id, 'security', 'login_blocked_locked', { ipAddress, userAgent, status: 'failure' });
    throw Object.assign(new Error('Account temporarily locked. Try again later.'), { status: 429, code: 'AUTH_ACCOUNT_LOCKED' });
  }

  // Verify password
  const valid = await verifyPassword(req.password, user.password_hash);
  if (!valid) {
    // Increment failed count, lock if >= 5
    const newCount = (user.failed_login_count || 0) + 1;
    const lockUntil = newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    await pool.query(
      'UPDATE VN_users SET failed_login_count = $1, locked_until = $2 WHERE id = $3',
      [newCount, lockUntil, user.id],
    );
    auditLog(user.tenant_id, user.id, 'auth', 'login_failed', { ipAddress, userAgent, status: 'failure', metadata: { attempt: newCount } });
    throw Object.assign(new Error('Invalid email or password'), { status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  }

  // Success — reset failed count, update last_login_at
  await pool.query(
    'UPDATE VN_users SET failed_login_count = 0, locked_until = NULL, last_login_at = now() WHERE id = $1',
    [user.id],
  );

  const roles = await getUserRoles(user.id);
  const tenantInfo = await getTenantInfo(user.tenant_id);

  const tokens = await issueTokens(user.id, user.tenant_id, roles, tenantInfo.plan_code, user.email, userAgent, ipAddress);

  auditLog(user.tenant_id, user.id, 'auth', 'login_success', { ipAddress, userAgent });

  return {
    tokens,
    user: { id: user.id, tenant_id: user.tenant_id, email: user.email, name: user.name, roles },
    tenant: tenantInfo,
  };
}

/**
 * Refresh tokens — validate, revoke old, issue new pair.
 */
export async function refresh(
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<TokenPair> {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const pool = getPool();

  // Find active token
  const { rows } = await pool.query(
    `SELECT id, user_id, tenant_id FROM VN_refresh_tokens
     WHERE token_hash = $1 AND is_active = true AND expires_at > now()`,
    [tokenHash],
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Refresh token revoked or expired'), { status: 401, code: 'AUTH_REFRESH_INVALID' });
  }

  const tokenRecord = rows[0];

  // Revoke old token
  await pool.query(
    `UPDATE VN_refresh_tokens SET is_active = false, revoked_at = now(), revoked_reason = 'session_replaced'
     WHERE id = $1`,
    [tokenRecord.id],
  );

  // Fetch user info for new access token
  const roles = await getUserRoles(payload.sub);
  const tenantInfo = await getTenantInfo(payload.tenant_id);

  const { rows: userRows } = await pool.query('SELECT email FROM VN_users WHERE id = $1', [payload.sub]);
  const email = userRows[0]?.email || '';

  // Update last_activity on the conceptual session
  const tokens = await issueTokens(payload.sub, payload.tenant_id, roles, tenantInfo.plan_code, email, userAgent, ipAddress);

  auditLog(payload.tenant_id, payload.sub, 'auth', 'token_refresh', { ipAddress, userAgent });

  return tokens;
}

/**
 * Logout — revoke the refresh token.
 */
export async function logout(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const pool = getPool();

  const { rows } = await pool.query(
    `UPDATE VN_refresh_tokens SET is_active = false, revoked_at = now(), revoked_reason = 'user_logout'
     WHERE token_hash = $1 AND is_active = true
     RETURNING user_id, tenant_id`,
    [tokenHash],
  );

  if (rows.length > 0) {
    auditLog(rows[0].tenant_id, rows[0].user_id, 'auth', 'logout', { ipAddress, userAgent });
  }
}

/**
 * Get current user profile + tenant info.
 */
export async function me(userId: string, tenantId: string): Promise<{ user: AuthUserResponse; tenant: AuthTenantResponse }> {
  const pool = getPool();

  const { rows } = await pool.query(
    'SELECT id, tenant_id, email, name FROM VN_users WHERE id = $1 AND tenant_id = $2',
    [userId, tenantId],
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('User not found'), { status: 404, code: 'AUTH_USER_NOT_FOUND' });
  }

  const user = rows[0];
  const roles = await getUserRoles(userId);
  const tenantInfo = await getTenantInfo(tenantId);

  return {
    user: { id: user.id, tenant_id: user.tenant_id, email: user.email, name: user.name, roles },
    tenant: tenantInfo,
  };
}

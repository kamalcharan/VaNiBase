/**
 * Auth Service — Business logic for register, login, refresh, logout, me.
 * Uses getPool() from DB factory — auth queries run on raw pool (pre-auth, no tenant context).
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
  AuthUser,
  AuthTenant,
} from './types.js';

/**
 * Generate a URL-safe slug from a tenant name.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Build a TokenPair for a user + tenant, and store the refresh token hash.
 */
async function issueTokens(
  userId: string,
  tenantId: string,
  role: string,
  tier: string,
  email: string,
  deviceInfo?: string,
  ipAddress?: string,
): Promise<TokenPair> {
  const accessToken = signAccessToken({
    sub: userId,
    tenant_id: tenantId,
    role,
    tier: tier as 'starter' | 'professional' | 'enterprise',
    email,
  });

  const refreshToken = signRefreshToken({
    sub: userId,
    tenant_id: tenantId,
    type: 'refresh',
  });

  // Store refresh token hash in DB
  const pool = getPool();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_SECONDS * 1000).toISOString();
  await pool.query(
    `INSERT INTO vn_refresh_tokens (user_id, tenant_id, token_hash, device_info, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5::inet, $6)`,
    [userId, tenantId, hashToken(refreshToken), deviceInfo || null, ipAddress || null, expiresAt],
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TOKEN_SECONDS,
  };
}

/**
 * Register a new user + tenant (or join existing tenant).
 */
export async function register(req: RegisterRequest, deviceInfo?: string, ipAddress?: string): Promise<AuthResponse> {
  const pool = getPool();

  // Check if email already exists
  const { rows: existing } = await pool.query(
    'SELECT id FROM vn_users WHERE email = $1',
    [req.email.toLowerCase()],
  );
  if (existing.length > 0) {
    throw Object.assign(new Error('Email already registered'), { status: 409, code: 'AUTH_EMAIL_EXISTS' });
  }

  // Hash password
  const passwordHash = await hashPassword(req.password);

  // Create tenant + user in a transaction
  const result = await pool.transaction(async (client) => {
    const tenantName = req.tenant_name || req.display_name;
    const tenantSlug = req.tenant_slug || slugify(tenantName) + '-' + Date.now().toString(36);

    // Create tenant
    const tenantResult = await client.query(
      `INSERT INTO vn_tenants (name, slug, tier, preferences, active)
       VALUES ($1, $2, 'starter', '{"theme":"ocean-blue","language":"en","timezone":"Asia/Kolkata","daily_briefing":false,"whatsapp_enabled":false,"custom":{}}'::jsonb, true)
       RETURNING id, name, slug, tier`,
      [tenantName, tenantSlug],
    );
    const tenant = tenantResult.rows[0];

    // Create user
    const userResult = await client.query(
      `INSERT INTO vn_users (id, tenant_id, email, display_name, role, password_hash, active)
       VALUES (uuid_generate_v4(), $1, $2, $3, 'owner', $4, true)
       RETURNING id, tenant_id, email, display_name, role`,
      [tenant.id, req.email.toLowerCase(), req.display_name, passwordHash],
    );
    const user = userResult.rows[0];

    return { user, tenant };
  });

  const { user, tenant } = result;

  // Issue tokens
  const tokens = await issueTokens(
    user.id, tenant.id, user.role, tenant.tier, user.email, deviceInfo, ipAddress,
  );

  return {
    tokens,
    user: {
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      tier: tenant.tier,
    },
  };
}

/**
 * Login with email + password.
 */
export async function login(req: LoginRequest, deviceInfo?: string, ipAddress?: string): Promise<AuthResponse> {
  const pool = getPool();

  // Fetch user + tenant in one query
  const { rows } = await pool.query(
    `SELECT u.id, u.tenant_id, u.email, u.display_name, u.role, u.password_hash,
            t.name AS tenant_name, t.slug AS tenant_slug, t.tier AS tenant_tier
     FROM vn_users u
     JOIN vn_tenants t ON u.tenant_id = t.id
     WHERE u.email = $1 AND u.active = true AND t.active = true`,
    [req.email.toLowerCase()],
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  }

  const row = rows[0];

  if (!row.password_hash) {
    throw Object.assign(new Error('Account uses external auth — password login not available'), { status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  }

  const valid = await verifyPassword(req.password, row.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  }

  // Update last_login_at
  await pool.query('UPDATE vn_users SET last_login_at = now() WHERE id = $1', [row.id]);

  // Issue tokens
  const tokens = await issueTokens(
    row.id, row.tenant_id, row.role, row.tenant_tier, row.email, deviceInfo, ipAddress,
  );

  return {
    tokens,
    user: {
      id: row.id,
      tenant_id: row.tenant_id,
      email: row.email,
      display_name: row.display_name,
      role: row.role,
    },
    tenant: {
      id: row.tenant_id,
      name: row.tenant_name,
      slug: row.tenant_slug,
      tier: row.tenant_tier,
    },
  };
}

/**
 * Refresh tokens — validate refresh token, revoke it, issue new pair.
 */
export async function refresh(refreshToken: string, deviceInfo?: string, ipAddress?: string): Promise<TokenPair> {
  // Verify JWT signature + expiry
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const pool = getPool();

  // Check token exists and is not revoked
  const { rows } = await pool.query(
    `SELECT id, user_id, tenant_id FROM vn_refresh_tokens
     WHERE token_hash = $1 AND revoked = false AND expires_at > now()`,
    [tokenHash],
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Refresh token revoked or expired'), { status: 401, code: 'AUTH_REFRESH_INVALID' });
  }

  const tokenRecord = rows[0];

  // Revoke the old refresh token (rotation)
  await pool.query(
    'UPDATE vn_refresh_tokens SET revoked = true, revoked_at = now() WHERE id = $1',
    [tokenRecord.id],
  );

  // Fetch user info for new access token
  const { rows: userRows } = await pool.query(
    `SELECT u.role, u.email, t.tier
     FROM vn_users u JOIN vn_tenants t ON u.tenant_id = t.id
     WHERE u.id = $1`,
    [payload.sub],
  );

  if (userRows.length === 0) {
    throw Object.assign(new Error('User not found'), { status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  }

  const user = userRows[0];

  // Issue new pair
  return issueTokens(
    payload.sub, payload.tenant_id, user.role, user.tier, user.email, deviceInfo, ipAddress,
  );
}

/**
 * Logout — revoke the refresh token.
 */
export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const pool = getPool();

  await pool.query(
    'UPDATE vn_refresh_tokens SET revoked = true, revoked_at = now() WHERE token_hash = $1',
    [tokenHash],
  );
}

/**
 * Get current user profile from JWT claims.
 */
export async function me(userId: string, tenantId: string): Promise<{ user: AuthUser; tenant: AuthTenant }> {
  const pool = getPool();

  const { rows } = await pool.query(
    `SELECT u.id, u.tenant_id, u.email, u.display_name, u.role,
            t.name AS tenant_name, t.slug AS tenant_slug, t.tier AS tenant_tier
     FROM vn_users u
     JOIN vn_tenants t ON u.tenant_id = t.id
     WHERE u.id = $1 AND u.tenant_id = $2`,
    [userId, tenantId],
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('User not found'), { status: 404, code: 'AUTH_USER_NOT_FOUND' });
  }

  const row = rows[0];
  return {
    user: {
      id: row.id,
      tenant_id: row.tenant_id,
      email: row.email,
      display_name: row.display_name,
      role: row.role,
    },
    tenant: {
      id: row.tenant_id,
      name: row.tenant_name,
      slug: row.tenant_slug,
      tier: row.tenant_tier,
    },
  };
}

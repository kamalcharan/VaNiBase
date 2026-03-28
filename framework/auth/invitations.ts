/**
 * Auth Layer — Invitation Service
 *
 * Business logic for team member invitations:
 *   - createInvitations (batch invite)
 *   - acceptInvitation (new user or existing user from another tenant)
 *   - listInvitations (admin view)
 *   - revokeInvitation
 *
 * Tables: VN_invitations, VN_users, VN_user_roles
 */

import crypto from 'crypto';
import { getPool } from '../db/index.js';
import { hashPassword } from './passwords.js';
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  ACCESS_TOKEN_SECONDS,
  REFRESH_TOKEN_SECONDS,
} from './tokens.js';
import type { TokenPair } from './types.js';
import type { SubscriptionTier } from '../../shared/types/index.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../errors/index.js';

const INVITATION_EXPIRY_DAYS = 7;

// ── Helpers ──

function planToTier(planCode: string): SubscriptionTier {
  if (planCode === 'enterprise' || planCode === 'custom') return 'enterprise';
  if (planCode === 'pro' || planCode === 'professional') return 'professional';
  return 'starter';
}

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
  const accessToken = signAccessToken({ sub: userId, tenant_id: tenantId, roles, tier, email });
  const refreshToken = signRefreshToken({ sub: userId, tenant_id: tenantId, type: 'refresh' });
  await storeRefreshToken(userId, tenantId, refreshToken, userAgent, ipAddress);
  return { access_token: accessToken, refresh_token: refreshToken, expires_in: ACCESS_TOKEN_SECONDS };
}

function auditLog(
  tenantId: string | null,
  userId: string | null,
  category: string,
  action: string,
  opts: { targetType?: string; targetId?: string; ipAddress?: string; userAgent?: string; metadata?: Record<string, unknown> } = {},
): void {
  const pool = getPool();
  pool.query(
    `INSERT INTO VN_audit_log (tenant_id, user_id, category, action, target_type, target_id, ip_address, user_agent, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8, 'success', $9)`,
    [
      tenantId, userId, category, action,
      opts.targetType || null, opts.targetId || null,
      opts.ipAddress || null, opts.userAgent || null,
      opts.metadata ? JSON.stringify(opts.metadata) : '{}',
    ],
  ).catch((err) => console.error('[AuditLog] Write failed:', (err as Error).message));
}

// ── Public API ──

export interface InvitationInput {
  email: string;
  role_id?: string;
}

export interface InvitationResult {
  email: string;
  status: 'invited' | 'already_member' | 'already_invited';
  token?: string;
}

/**
 * Create batch invitations for a tenant.
 */
export async function createInvitations(
  tenantId: string,
  invitedBy: string,
  invitations: InvitationInput[],
): Promise<InvitationResult[]> {
  const pool = getPool();
  const results: InvitationResult[] = [];

  for (const inv of invitations) {
    const email = inv.email.toLowerCase().trim();
    const roleId = inv.role_id || 'user';

    // Check if already a member in this tenant
    const { rows: existingUsers } = await pool.query(
      'SELECT id FROM VN_users WHERE tenant_id = $1 AND email = $2',
      [tenantId, email],
    );
    if (existingUsers.length > 0) {
      results.push({ email, status: 'already_member' });
      continue;
    }

    // Check if a pending invitation already exists
    const { rows: existingInvites } = await pool.query(
      `SELECT id FROM VN_invitations
       WHERE tenant_id = $1 AND email = $2 AND status = 'pending' AND expires_at > now()`,
      [tenantId, email],
    );
    if (existingInvites.length > 0) {
      results.push({ email, status: 'already_invited' });
      continue;
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO VN_invitations (tenant_id, invited_by, email, role_id, token_hash, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
      [tenantId, invitedBy, email, roleId, tokenHash, expiresAt],
    );

    results.push({ email, status: 'invited', token: rawToken });
  }

  return results;
}

/**
 * Accept an invitation — Flow A (new user, no Bearer) or Flow B (existing user, Bearer).
 */
export async function acceptInvitation(
  token: string,
  opts: {
    /** Flow A fields */
    full_name?: string;
    password?: string;
    phone?: string;
    /** Flow B — authenticated user info from Bearer */
    existingUserId?: string;
    existingTenantId?: string;
  },
  userAgent?: string,
  ipAddress?: string,
): Promise<Record<string, unknown>> {
  const pool = getPool();
  const tokenHash = hashToken(token);

  // Look up invitation
  const { rows: invRows } = await pool.query(
    `SELECT id, tenant_id, email, role_id, status, expires_at
     FROM VN_invitations WHERE token_hash = $1`,
    [tokenHash],
  );

  if (invRows.length === 0) {
    throw new NotFoundError('Invitation not found or invalid token');
  }

  const invitation = invRows[0] as {
    id: string; tenant_id: string; email: string;
    role_id: string; status: string; expires_at: string;
  };

  if (invitation.status !== 'pending') {
    throw new ValidationError(`Invitation has already been ${invitation.status}`);
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw new ValidationError('Invitation has expired');
  }

  const isFlowB = !!opts.existingUserId;

  if (isFlowB) {
    // Flow B — Existing user joining a new tenant
    return await pool.transaction(async (client) => {
      // Get existing user's info
      const { rows: existingRows } = await client.query(
        'SELECT name, password_hash, avatar_url FROM VN_users WHERE id = $1',
        [opts.existingUserId],
      );
      if (existingRows.length === 0) {
        throw new NotFoundError('Authenticated user not found');
      }
      const existingUser = existingRows[0] as { name: string; password_hash: string; avatar_url: string | null };

      // Create new VN_users row in the inviting tenant
      const { rows: newUserRows } = await client.query(
        `INSERT INTO VN_users (tenant_id, email, password_hash, name, avatar_url, is_active, is_email_verified)
         VALUES ($1, $2, $3, $4, $5, true, true)
         RETURNING id`,
        [invitation.tenant_id, invitation.email, existingUser.password_hash, existingUser.name, existingUser.avatar_url],
      );
      const newUserId = (newUserRows[0] as { id: string }).id;

      // Assign role
      const { rows: roleRows } = await client.query(
        `SELECT id FROM VN_roles WHERE code = $1 AND (tenant_id IS NULL OR tenant_id = $2) LIMIT 1`,
        [invitation.role_id, invitation.tenant_id],
      );
      if (roleRows.length > 0) {
        await client.query(
          'INSERT INTO VN_user_roles (user_id, role_id) VALUES ($1, $2)',
          [newUserId, (roleRows[0] as { id: string }).id],
        );
      }

      // Mark invitation accepted
      await client.query(
        `UPDATE VN_invitations SET status = 'accepted', accepted_at = now() WHERE id = $1`,
        [invitation.id],
      );

      // Get tenant name for response
      const { rows: tenantRows } = await client.query(
        'SELECT name FROM VN_tenant_profiles WHERE tenant_id = $1',
        [invitation.tenant_id],
      );
      const tenantName = (tenantRows[0] as { name: string } | undefined)?.name || '';

      auditLog(invitation.tenant_id, newUserId, 'user', 'invitation_accepted', {
        ipAddress, userAgent, metadata: { flow: 'existing_user', original_user_id: opts.existingUserId },
      });

      return { accepted: true, tenant_id: invitation.tenant_id, tenant_name: tenantName };
    });
  }

  // Flow A — New user
  if (!opts.full_name || !opts.password) {
    throw new ValidationError('full_name and password are required for new users');
  }

  if (opts.password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const passwordHash = await hashPassword(opts.password);

  const result = await pool.transaction(async (client) => {
    // Create user
    const { rows: userRows } = await client.query(
      `INSERT INTO VN_users (tenant_id, email, password_hash, name, is_active, is_email_verified)
       VALUES ($1, $2, $3, $4, true, true)
       RETURNING id, tenant_id, email, name`,
      [invitation.tenant_id, invitation.email, passwordHash, opts.full_name],
    );
    const user = userRows[0] as { id: string; tenant_id: string; email: string; name: string };

    // Assign role
    const { rows: roleRows } = await client.query(
      `SELECT id FROM VN_roles WHERE code = $1 AND (tenant_id IS NULL OR tenant_id = $2) LIMIT 1`,
      [invitation.role_id, invitation.tenant_id],
    );
    if (roleRows.length > 0) {
      await client.query(
        'INSERT INTO VN_user_roles (user_id, role_id) VALUES ($1, $2)',
        [user.id, (roleRows[0] as { id: string }).id],
      );
    }

    // Mark invitation accepted
    await client.query(
      `UPDATE VN_invitations SET status = 'accepted', accepted_at = now() WHERE id = $1`,
      [invitation.id],
    );

    return user;
  });

  // Issue tokens
  const roles = await getUserRoles(result.id);
  const subRow = await pool.query(
    `SELECT COALESCE(s.plan_code, 'free') AS plan_code
     FROM VN_tenants t
     LEFT JOIN VN_subscriptions s ON s.tenant_id = t.id AND s.is_current = true
     WHERE t.id = $1`,
    [invitation.tenant_id],
  );
  const planCode = (subRow.rows[0] as { plan_code: string } | undefined)?.plan_code || 'free';

  const tokens = await issueTokens(result.id, invitation.tenant_id, roles, planCode, result.email, userAgent, ipAddress);

  auditLog(invitation.tenant_id, result.id, 'user', 'invitation_accepted', {
    ipAddress, userAgent, metadata: { flow: 'new_user' },
  });

  return {
    user: { id: result.id, email: result.email, full_name: result.name, role_id: invitation.role_id },
    token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
  };
}

/**
 * List all invitations for a tenant.
 */
export async function listInvitations(tenantId: string): Promise<Record<string, unknown>[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT i.id, i.email, i.role_id, i.status, i.created_at, i.expires_at,
            u.name AS invited_by_name
     FROM VN_invitations i
     JOIN VN_users u ON i.invited_by = u.id
     WHERE i.tenant_id = $1
     ORDER BY i.created_at DESC`,
    [tenantId],
  );
  return rows as Record<string, unknown>[];
}

/**
 * Revoke a pending invitation.
 */
export async function revokeInvitation(
  invitationId: string,
  tenantId: string,
): Promise<void> {
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE VN_invitations SET status = 'revoked'
     WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
     RETURNING id`,
    [invitationId, tenantId],
  );
  if (rows.length === 0) {
    throw new NotFoundError('Invitation not found or not pending');
  }
}

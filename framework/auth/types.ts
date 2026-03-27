/**
 * Auth Layer — TypeScript Interfaces
 * Aligned to 001_vn_foundation.sql + 002_vn_operational.sql schemas.
 */

import type { SubscriptionTier } from '../../shared/types/index.js';

// ── Request types ──

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;                   // VN_users.name
  tenant_name: string;            // VN_tenant_profiles.name
  tenant_slug?: string;           // VN_tenants.slug (auto-generated if omitted)
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

// ── Response types ──

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;             // Access token TTL in seconds
}

export interface AuthUserResponse {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  roles: string[];                // Role codes: ['owner'], ['admin', 'advisor']
}

export interface AuthTenantResponse {
  id: string;
  slug: string;
  name: string;                   // From VN_tenant_profiles
  display_name: string | null;
  plan_code: string;              // From VN_subscriptions
  status: string;                 // VN_tenants.status
}

export interface AuthResponse {
  tokens: TokenPair;
  user: AuthUserResponse;
  tenant: AuthTenantResponse;
}

// ── JWT payloads ──

export interface AccessTokenPayload {
  sub: string;                    // user_id
  tenant_id: string;
  roles: string[];                // Role codes
  tier: SubscriptionTier;         // Mapped from plan_code for backward compat
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;                    // user_id
  tenant_id: string;
  type: 'refresh';
}

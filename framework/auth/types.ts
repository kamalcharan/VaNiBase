/**
 * Auth Layer — TypeScript Interfaces
 */

import type { SubscriptionTier } from '../../shared/types/index.js';

// ── Request types ──

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
  tenant_name?: string;           // If omitted, creates tenant from display_name
  tenant_slug?: string;           // If omitted, auto-generated from tenant_name
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

export interface AuthUser {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
  role: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  tier: SubscriptionTier;
}

export interface AuthResponse {
  tokens: TokenPair;
  user: AuthUser;
  tenant: AuthTenant;
}

// ── JWT payload (matches shared/types JWTPayload) ──

export interface AccessTokenPayload {
  sub: string;                    // user_id
  tenant_id: string;
  role: string;
  tier: SubscriptionTier;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;                    // user_id
  tenant_id: string;
  type: 'refresh';
}

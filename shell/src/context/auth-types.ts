/**
 * Auth type definitions for the shell auth context.
 * These mirror the auth API response shapes from framework/auth/types.ts
 * but are kept separate (shell is a standalone Next.js app).
 */

export interface AuthUser {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  roles: string[];
  avatar_url?: string | null;
  preferences?: Record<string, unknown>;
}

export interface AuthTenant {
  id: string;
  slug: string;
  name: string;
  display_name: string | null;
  status: string;
  onboarding_complete?: boolean;
  theme_id?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  subscription: {
    plan_code: string;
    max_sessions: number;
    max_users: number;
    features: string[];
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  tokens: AuthTokens;
  user: AuthUser;
  tenant: AuthTenant;
}

export interface SessionLimitResponse {
  code: 'SESSION_LIMIT';
  message: string;
  active_sessions: ActiveSession[];
  max_sessions: number;
}

export interface ActiveSession {
  session_id: string;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  ip_address: string | null;
  last_activity_at: string;
  created_at: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface MeResponse {
  user: AuthUser;
  tenant: AuthTenant;
}

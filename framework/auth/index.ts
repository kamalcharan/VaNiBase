/**
 * Auth Layer — Barrel Exports
 */

// Service (primary API)
export { register, login, refresh, logout, me, verifyCredentials, revokeSessions, updatePreferences } from './service.js';

// Passwords
export { hashPassword, verifyPassword } from './passwords.js';

// Tokens
export {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  ACCESS_TOKEN_SECONDS,
  REFRESH_TOKEN_SECONDS,
} from './tokens.js';

// Invitations
export { createInvitations, acceptInvitation, listInvitations, revokeInvitation } from './invitations.js';
export type { InvitationInput, InvitationResult } from './invitations.js';

// Types
export type {
  RegisterRequest,
  LoginRequest,
  RefreshRequest,
  TokenPair,
  AuthUserResponse,
  AuthTenantResponse,
  AuthResponse,
  AccessTokenPayload,
  RefreshTokenPayload,
  SessionLimitResponse,
  UpdatePreferencesRequest,
} from './types.js';

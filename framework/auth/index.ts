/**
 * Auth Layer — Barrel Exports
 */

// Service (primary API)
export { register, login, refresh, logout, me } from './service.js';

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
} from './types.js';

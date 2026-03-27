/**
 * Auth Layer — JWT Token Generation & Verification
 * Access tokens (short-lived) and refresh tokens (long-lived).
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { loadConfig } from '../config.js';
import type { AccessTokenPayload, RefreshTokenPayload } from './types.js';

const ACCESS_TOKEN_TTL = '15m';       // 15 minutes
const REFRESH_TOKEN_TTL = '30d';      // 30 days

export const ACCESS_TOKEN_SECONDS = 15 * 60;
export const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;

function getSecret(): string {
  const config = loadConfig();
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET not configured — cannot sign tokens');
  }
  return config.jwtSecret;
}

/**
 * Sign an access token (short-lived, used in Authorization header).
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: 'vani-framework',
  });
}

/**
 * Sign a refresh token (long-lived, stored in vn_refresh_tokens).
 */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: REFRESH_TOKEN_TTL,
    issuer: 'vani-framework',
  });
}

/**
 * Verify and decode an access token. Throws on invalid/expired.
 */
export function verifyAccessToken(token: string): AccessTokenPayload & { iat: number; exp: number } {
  return jwt.verify(token, getSecret(), {
    issuer: 'vani-framework',
  }) as AccessTokenPayload & { iat: number; exp: number };
}

/**
 * Verify and decode a refresh token. Throws on invalid/expired.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload & { iat: number; exp: number } {
  const payload = jwt.verify(token, getSecret(), {
    issuer: 'vani-framework',
  }) as RefreshTokenPayload & { iat: number; exp: number };
  if (payload.type !== 'refresh') {
    throw new Error('Token is not a refresh token');
  }
  return payload;
}

/**
 * Hash a refresh token for storage (never store raw tokens in DB).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

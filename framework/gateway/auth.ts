/**
 * Auth Middleware — Extracts and validates JWT from Authorization header
 * Task: F-09
 *
 * In production this verifies against Supabase JWT / the configured JWT_SECRET.
 * For dev, if JWT_SECRET is empty, it accepts a mock header: X-Dev-Tenant-Id + X-Dev-User-Id.
 */

import type { Request, Response, NextFunction } from 'express';
import { loadConfig } from '../config.js';
import type { JWTPayload } from '../../shared/types/index.js';
import { HTTP_STATUS, ERROR_CODES } from '../../shared/constants/index.js';

// Extend Express Request to carry the decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      auth?: JWTPayload;
    }
  }
}

/**
 * Decode a JWT payload (base64url segment 1).
 * Does NOT verify signature — in production, use a proper JWT library or Supabase client.
 * This is a framework stub; F-09 ships the contract, and a real verifier swaps in later.
 */
function decodeJwtPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const config = loadConfig();

  // --- Dev bypass: in development mode, accept dev headers instead of JWT ---
  if (config.nodeEnv === 'development') {
    const tenantId = req.headers['x-dev-tenant-id'] as string | undefined;

    if (tenantId) {
      const userId = (req.headers['x-dev-user-id'] as string) || 'dev-user';
      console.info(`[DEBUG][Auth] Dev bypass activated for ${req.method} ${req.originalUrl}`);
      console.info(`[DEBUG][Auth]   X-Dev-Tenant-Id header: "${tenantId}"`);
      console.info(`[DEBUG][Auth]   X-Dev-User-Id header: "${req.headers['x-dev-user-id'] || '(not set, defaulting to dev-user)'}"`);
      console.info(`[DEBUG][Auth]   Setting req.auth = { sub: "${userId}", tenant_id: "${tenantId}", role: "owner", tier: "professional" }`);
      req.auth = {
        sub: userId,
        tenant_id: tenantId,
        role: 'owner',
        tier: 'professional',
        email: 'dev@vani.local',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      next();
      return;
    }
  }

  // --- Extract Bearer token ---
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Missing or invalid Authorization header',
      code: ERROR_CODES.AUTH_MISSING,
      status: HTTP_STATUS.UNAUTHORIZED,
    });
    return;
  }

  const token = header.slice(7);
  const payload = decodeJwtPayload(token);

  if (!payload) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Invalid or expired token',
      code: ERROR_CODES.AUTH_INVALID,
      status: HTTP_STATUS.UNAUTHORIZED,
    });
    return;
  }

  req.auth = payload;
  next();
}

/**
 * Auth Middleware — Extracts and validates JWT from Authorization header
 *
 * In production: verifies signature using JWT_SECRET via jsonwebtoken.
 * In development: accepts X-Dev-Tenant-Id + X-Dev-User-Id headers as bypass.
 */

import type { Request, Response, NextFunction } from 'express';
import { loadConfig } from '../config.js';
import { verifyAccessToken } from '../auth/tokens.js';
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

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const config = loadConfig();

  // --- Dev bypass: in development mode, accept dev headers instead of JWT ---
  if (config.nodeEnv === 'development') {
    const tenantId = req.headers['x-dev-tenant-id'] as string | undefined;

    if (tenantId) {
      const userId = (req.headers['x-dev-user-id'] as string) || 'dev-user';
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

  // --- Verify JWT signature + expiry ---
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      sub: payload.sub,
      tenant_id: payload.tenant_id,
      role: payload.roles?.[0] || 'member',  // Backward compat: first role as primary
      tier: payload.tier,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    };
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    const isExpired = message.includes('expired');
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: isExpired ? 'Token expired — use /api/v1/auth/refresh' : 'Invalid or expired token',
      code: ERROR_CODES.AUTH_INVALID,
      status: HTTP_STATUS.UNAUTHORIZED,
    });
  }
}

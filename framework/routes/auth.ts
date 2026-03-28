/**
 * Auth Routes — /api/v1/auth/*
 *
 * POST /api/v1/auth/register         — Create tenant + user, return JWT pair
 * POST /api/v1/auth/login            — Validate credentials, return JWT pair (or 409 session limit)
 * POST /api/v1/auth/refresh          — Rotate refresh token, return new pair
 * POST /api/v1/auth/logout           — Revoke refresh token
 * POST /api/v1/auth/sessions/revoke  — Revoke specific sessions (password-based or Bearer)
 * PATCH /api/v1/auth/preferences     — Update user preferences (Bearer required)
 * GET   /api/v1/auth/me              — Return current user profile (Bearer required)
 * POST  /api/v1/auth/invite          — Send batch invitations (owner/admin only)
 * POST  /api/v1/auth/invite/accept   — Accept an invitation (public or Bearer)
 * GET   /api/v1/auth/invitations     — List tenant invitations (owner/admin only)
 * DELETE /api/v1/auth/invitations/:id — Revoke a pending invitation (owner/admin only)
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  register, login, refresh, logout, me,
  verifyCredentials, revokeSessions, updatePreferences,
  createInvitations, acceptInvitation, listInvitations, revokeInvitation,
} from '../auth/index.js';
import { authMiddleware } from '../gateway/auth.js';
import { HTTP_STATUS } from '../../shared/constants/index.js';
import { ValidationError, ForbiddenError } from '../errors/index.js';

export function createAuthRouter(): Router {
  const router = Router();

  // ── POST /register ──
  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, tenant_name, tenant_slug } = req.body || {};

      if (!email || !password || !name || !tenant_name) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Missing required fields: email, password, name, tenant_name',
          code: 'INVALID_REQUEST', status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      if (password.length < 8) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Password must be at least 8 characters',
          code: 'INVALID_REQUEST', status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      const userAgent = req.headers['user-agent'] as string | undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress;

      const result = await register(
        { email, password, name, tenant_name, tenant_slug },
        userAgent, ipAddress,
      );

      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (err) {
      next(err);
    }
  });

  // ── POST /login ──
  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Missing required fields: email, password',
          code: 'INVALID_REQUEST', status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      const userAgent = req.headers['user-agent'] as string | undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress;

      const result = await login({ email, password }, userAgent, ipAddress);

      // Check for session limit response
      if ('code' in result && result.code === 'SESSION_LIMIT') {
        res.status(409).json(result);
        return;
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // ── POST /refresh ──
  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body || {};

      if (!refresh_token) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Missing required field: refresh_token',
          code: 'INVALID_REQUEST', status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      const userAgent = req.headers['user-agent'] as string | undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress;

      const tokens = await refresh(refresh_token, userAgent, ipAddress);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  });

  // ── POST /logout ──
  router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body || {};

      if (!refresh_token) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Missing required field: refresh_token',
          code: 'INVALID_REQUEST', status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      await logout(refresh_token);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /sessions/revoke (Public — verified by email+password OR Bearer token) ──
  router.post('/sessions/revoke', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, session_ids } = req.body || {};

      if (!Array.isArray(session_ids) || session_ids.length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'session_ids array required', code: 'INVALID_REQUEST', status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      let userId: string;

      // Try Bearer token first
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          // Reuse authMiddleware logic inline
          const { verifyAccessToken } = await import('../auth/tokens.js');
          const payload = verifyAccessToken(authHeader.slice(7));
          userId = payload.sub;
        } catch {
          res.status(HTTP_STATUS.UNAUTHORIZED).json({
            error: 'Invalid token', code: 'AUTH_INVALID', status: HTTP_STATUS.UNAUTHORIZED,
          });
          return;
        }
      } else if (email && password) {
        // Fallback: verify via email+password
        const user = await verifyCredentials(email, password);
        if (!user) {
          res.status(HTTP_STATUS.UNAUTHORIZED).json({
            error: 'Invalid credentials', code: 'AUTH_INVALID_CREDENTIALS', status: HTTP_STATUS.UNAUTHORIZED,
          });
          return;
        }
        userId = user.id;
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Provide email+password or Authorization Bearer token',
          code: 'INVALID_REQUEST', status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      const result = await revokeSessions(userId, session_ids);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // ── PATCH /preferences (Protected — Bearer token required) ──
  router.patch('/preferences', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { theme_override, color_mode, language } = req.body || {};

      if (color_mode && !['light', 'dark', 'system'].includes(color_mode)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'color_mode must be light, dark, or system',
          code: 'INVALID_REQUEST', status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      const prefs: Record<string, unknown> = {};
      if (theme_override !== undefined) prefs.theme_override = theme_override;
      if (color_mode !== undefined) prefs.color_mode = color_mode;
      if (language !== undefined) prefs.language = language;

      const preferences = await updatePreferences(req.auth!.sub, prefs);
      res.json({ success: true, preferences });
    } catch (err) {
      next(err);
    }
  });

  // ── GET /me (Protected — Bearer token required) ──
  router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const result = await me(auth.sub, auth.tenant_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // ── POST /invite (Protected — owner/admin only) ──
  router.post('/invite', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;

      if (!['owner', 'admin'].includes(auth.role)) {
        throw new ForbiddenError('Only owner or admin can invite team members');
      }

      const { invitations } = req.body || {};
      if (!Array.isArray(invitations) || invitations.length === 0) {
        throw new ValidationError('invitations array is required and must not be empty');
      }

      for (const inv of invitations) {
        if (!inv.email || typeof inv.email !== 'string') {
          throw new ValidationError('Each invitation must include a valid email');
        }
      }

      const results = await createInvitations(auth.tenant_id, auth.sub, invitations);
      res.status(HTTP_STATUS.CREATED).json({ invitations: results });
    } catch (err) {
      next(err);
    }
  });

  // ── POST /invite/accept (Public or Bearer) ──
  router.post('/invite/accept', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, full_name, password, phone } = req.body || {};

      if (!token || typeof token !== 'string') {
        throw new ValidationError('token is required');
      }

      const userAgent = req.headers['user-agent'] as string | undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress;

      // Check if the user is authenticated (Flow B)
      let existingUserId: string | undefined;
      let existingTenantId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const { verifyAccessToken } = await import('../auth/tokens.js');
          const payload = verifyAccessToken(authHeader.slice(7));
          existingUserId = payload.sub;
          existingTenantId = payload.tenant_id;
        } catch {
          // Invalid token — treat as Flow A
        }
      }

      const result = await acceptInvitation(
        token,
        { full_name, password, phone, existingUserId, existingTenantId },
        userAgent,
        ipAddress,
      );

      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (err) {
      next(err);
    }
  });

  // ── GET /invitations (Protected — owner/admin only) ──
  router.get('/invitations', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;

      if (!['owner', 'admin'].includes(auth.role)) {
        throw new ForbiddenError('Only owner or admin can view invitations');
      }

      const invitations = await listInvitations(auth.tenant_id);
      res.json({ invitations });
    } catch (err) {
      next(err);
    }
  });

  // ── DELETE /invitations/:id (Protected — owner/admin only) ──
  router.delete('/invitations/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;

      if (!['owner', 'admin'].includes(auth.role)) {
        throw new ForbiddenError('Only owner or admin can revoke invitations');
      }

      await revokeInvitation(req.params.id, auth.tenant_id);
      res.json({ revoked: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/**
 * Auth Routes — /api/v1/auth/*
 *
 * POST /api/v1/auth/register  — Create tenant + user, return JWT pair
 * POST /api/v1/auth/login     — Validate credentials, return JWT pair
 * POST /api/v1/auth/refresh   — Rotate refresh token, return new pair
 * POST /api/v1/auth/logout    — Revoke refresh token
 * GET  /api/v1/auth/me        — Return current user profile (protected)
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { register, login, refresh, logout, me } from '../auth/index.js';
import { HTTP_STATUS } from '../../shared/constants/index.js';

export function createAuthRouter(): Router {
  const router = Router();

  // ── POST /register ──
  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, tenant_name, tenant_slug } = req.body || {};

      if (!email || !password || !name || !tenant_name) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Missing required fields: email, password, name, tenant_name',
          code: 'INVALID_REQUEST',
          status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      if (password.length < 8) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Password must be at least 8 characters',
          code: 'INVALID_REQUEST',
          status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      const userAgent = req.headers['user-agent'] as string | undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress;

      const result = await register(
        { email, password, name, tenant_name, tenant_slug },
        userAgent,
        ipAddress,
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
          code: 'INVALID_REQUEST',
          status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      const deviceInfo = req.headers['user-agent'] as string | undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress;

      const result = await login({ email, password }, deviceInfo, ipAddress);
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
          code: 'INVALID_REQUEST',
          status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      const deviceInfo = req.headers['user-agent'] as string | undefined;
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress;

      const tokens = await refresh(refresh_token, deviceInfo, ipAddress);
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
          code: 'INVALID_REQUEST',
          status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      await logout(refresh_token);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/**
 * Protected /me endpoint — mounted inside the protectedRouter (after auth middleware).
 */
export function createMeRouter(): Router {
  const router = Router();

  router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;
      const result = await me(auth.sub, auth.tenant_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

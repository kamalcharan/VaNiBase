/**
 * Tenant Routes — /api/v1/tenant/*
 *
 * PATCH /api/v1/tenant/profile — Update tenant profile (owner/admin only)
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { updateTenantProfile } from '../tenant/profile.js';
import { ForbiddenError } from '../errors/index.js';

export function createTenantRouter(): Router {
  const router = Router();

  // ── PATCH /profile (Protected — owner/admin only) ──
  router.patch('/profile', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;

      if (!['owner', 'admin'].includes(auth.role)) {
        throw new ForbiddenError('Only owner or admin can update tenant profile');
      }

      const { name, logo_url, theme_id } = req.body || {};

      const profile = await updateTenantProfile(auth.tenant_id, { name, logo_url, theme_id });
      res.json(profile);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

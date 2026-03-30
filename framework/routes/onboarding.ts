/**
 * Onboarding Routes — /api/v1/onboarding/*
 *
 * GET   /api/v1/onboarding/status — Get onboarding status (owner only)
 * PATCH /api/v1/onboarding/step   — Mark a step as completed (owner only)
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getOnboardingStatus, updateOnboardingStep } from '../onboarding/service.js';
import { ValidationError, ForbiddenError } from '../errors/index.js';

export function createOnboardingRouter(): Router {
  const router = Router();

  // ── GET /status (Protected — owner only) ──
  router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;

      if (auth.role !== 'owner') {
        throw new ForbiddenError('Only the tenant owner can access onboarding status');
      }

      const status = await getOnboardingStatus(auth.tenant_id);
      res.json(status);
    } catch (err) {
      next(err);
    }
  });

  // ── PATCH /step (Protected — owner only) ──
  router.patch('/step', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.auth!;

      if (auth.role !== 'owner') {
        throw new ForbiddenError('Only the tenant owner can update onboarding steps');
      }

      const { step_id, status, metadata } = req.body || {};

      if (!step_id || typeof step_id !== 'string') {
        throw new ValidationError('step_id is required');
      }

      if (status !== 'completed') {
        throw new ValidationError('status must be "completed"');
      }

      const step = await updateOnboardingStep(auth.tenant_id, step_id, metadata, auth.sub);
      res.json(step);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

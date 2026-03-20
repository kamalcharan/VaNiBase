/**
 * Chat Route — /api/v1/chat
 * Task: F-16 — Wires the full pipeline
 *
 * POST /api/v1/chat
 * Headers: Authorization: Bearer <jwt>  (or X-Dev-Tenant-Id + X-Dev-User-Id in dev)
 * Body: { message: string, entity_id?: string, channel?: Channel, recipe_override?: string }
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Orchestrator } from '../orchestrator.js';
import { HTTP_STATUS, ERROR_CODES } from '../../shared/constants/index.js';

export function createChatRouter(orchestrator: Orchestrator): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const { message } = req.body || {};
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Request body must include a non-empty "message" string',
          code: 'INVALID_REQUEST',
          status: HTTP_STATUS.BAD_REQUEST,
        });
        return;
      }

      const response = await orchestrator.handleChat(req);
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

// Backward-compatible stub router for when orchestrator isn't initialized yet
export const chatRouter = Router();
chatRouter.post('/', (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Orchestrator not initialized. Use createChatRouter() instead.',
    code: ERROR_CODES.VANI_ENGINE_ERROR,
    status: 501,
  });
});

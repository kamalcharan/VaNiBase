/**
 * Skills Route — /api/v1/skills/:skillName/:functionName
 * Direct skill execution endpoint that bypasses VaNi/LLM.
 *
 * POST /api/v1/skills/client-skill/get_clients
 * Headers: Authorization or X-Dev-Tenant-Id
 * Body: { "params": { ... } }
 *
 * Returns the SkillResult (success, data, recipe, error).
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Orchestrator } from '../orchestrator.js';
import type { SkillCall } from '../../shared/types/index.js';
import { executeSkill } from '../skill-executor/executor.js';
import { buildSkillContext } from '../context-builder/index.js';
import { HTTP_STATUS } from '../../shared/constants/index.js';

export function createSkillsRouter(orchestrator: Orchestrator): Router {
  const router = Router();

  router.post('/skills/:skillName/:functionName', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skillName, functionName } = req.params;
      const params = req.body?.params ?? {};

      // Build context from authenticated request (same as chat endpoint)
      const noopEscalate = async (prompt: string) => `Escalation not available in direct skill mode: ${prompt}`;
      const ctx = buildSkillContext(
        req,
        noopEscalate,
        orchestrator.memoryStore
      );

      // Build the skill call
      const call: SkillCall = {
        skill: skillName,
        function: functionName,
        params,
      };

      // Execute directly via the skill executor
      const result = await executeSkill(call, ctx, orchestrator.skillRegistry);

      if (!result.success) {
        const status = result.error?.includes('not found') ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
        res.status(status).json(result);
        return;
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

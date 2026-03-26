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

import type { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Orchestrator } from '../orchestrator.js';
import type { SkillCall } from '../../shared/types/index.js';
import { executeSkill } from '../skill-executor/executor.js';
import { buildSkillContext } from '../context-builder/index.js';
import { HTTP_STATUS } from '../../shared/constants/index.js';

/**
 * Register the direct skill execution route on the given router.
 * Mounted on the protectedRouter so auth/tenant/rate-limit middleware apply.
 */
export function registerSkillsRoute(router: Router, orchestrator: Orchestrator): void {
  router.post('/skills/:skillName/:functionName', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skillName = req.params.skillName as string;
      const functionName = req.params.functionName as string;
      const params = req.body?.params ?? {};

      console.info(`[DEBUG][SkillsRoute] POST /skills/${skillName}/${functionName}`);
      console.info(`[DEBUG][SkillsRoute]   req.auth present: ${!!req.auth}`);
      console.info(`[DEBUG][SkillsRoute]   req.auth.tenant_id: "${req.auth?.tenant_id}"`);
      console.info(`[DEBUG][SkillsRoute]   req.auth.sub (userId): "${req.auth?.sub}"`);
      console.info(`[DEBUG][SkillsRoute]   params: ${JSON.stringify(params)}`);

      // Build context from authenticated request (same as chat endpoint)
      console.info(`[DEBUG][SkillsRoute] Calling buildSkillContext...`);
      const noopEscalate = async (prompt: string) => `Escalation not available in direct skill mode: ${prompt}`;
      let ctx;
      try {
        ctx = buildSkillContext(
          req,
          noopEscalate,
          orchestrator.memoryStore
        );
        console.info(`[DEBUG][SkillsRoute] buildSkillContext succeeded: tenantId="${ctx.tenantId}" userId="${ctx.userId}"`);
      } catch (ctxErr) {
        const msg = ctxErr instanceof Error ? ctxErr.message : String(ctxErr);
        console.error(`[DEBUG][SkillsRoute] buildSkillContext FAILED: ${msg}`);
        throw ctxErr;
      }

      // Build the skill call
      const call: SkillCall = {
        skill: skillName,
        function: functionName,
        params,
      };

      // Execute directly via the skill executor
      console.info(`[DEBUG][SkillsRoute] Calling executeSkill...`);
      const result = await executeSkill(call, ctx, orchestrator.skillRegistry);
      console.info(`[DEBUG][SkillsRoute] executeSkill returned: success=${result.success} recipe="${result.recipe}" error="${result.error || 'none'}"`);

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
}

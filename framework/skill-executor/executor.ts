/**
 * Skill Executor — Runs a skill function within a SkillContext
 * S-02: Auto-wraps each skill call in a transaction
 * S-07: Writes to vn_skill_execution_log, tracks Prometheus metrics
 */

import type {
  SkillContext,
  SkillCall,
  SkillResult,
} from '../../shared/types/index.js';
import type { SkillRegistryImpl } from './registry.js';
import { TIER_LEVELS, ERROR_CODES, TABLES } from '../../shared/constants/index.js';
import { skillExecutionDuration, skillExecutionTotal, skillErrorTotal } from '../middleware/metrics.js';

export type SkillHandler = (
  ctx: SkillContext,
  params: Record<string, unknown>
) => Promise<SkillResult>;

const handlers = new Map<string, SkillHandler>();

export function registerHandler(skillName: string, functionName: string, handler: SkillHandler): void {
  handlers.set(`${skillName}.${functionName}`, handler);
}

/**
 * Execute a single skill call.
 * Automatically wraps in a DB transaction and logs to vn_skill_execution_log.
 */
export async function executeSkill(
  call: SkillCall,
  ctx: SkillContext,
  registry: SkillRegistryImpl
): Promise<SkillResult> {
  const start = Date.now();
  const qualifiedName = `${call.skill}.${call.function}`;

  // 1. Verify skill exists in registry
  const fnDef = registry.getFunction(call.skill, call.function);
  if (!fnDef) {
    return {
      success: false,
      recipe: '',
      data: {},
      error: `Skill function not found: ${qualifiedName}`,
    };
  }

  // 2. Check tier access
  const skill = registry.skills.get(call.skill);
  if (skill) {
    const requiredLevel = TIER_LEVELS[skill.tier] ?? 0;
    const userLevel = TIER_LEVELS[ctx.tier] ?? 0;
    if (userLevel < requiredLevel) {
      return {
        success: false,
        recipe: '',
        data: {},
        error: `${ERROR_CODES.TIER_INSUFFICIENT}: ${ctx.tier} cannot access ${call.skill} (requires ${skill.tier})`,
      };
    }
  }

  // 3. Look up handler
  const handler = handlers.get(qualifiedName);
  if (!handler) {
    return {
      success: false,
      recipe: '',
      data: {},
      error: `No handler registered for ${qualifiedName}`,
    };
  }

  // 4. Execute inside a transaction
  let result: SkillResult;
  try {
    result = await ctx.db.transaction(async (_tx) => {
      // The handler uses ctx.db which is already within the transaction scope
      return await handler(ctx, call.params);
    });

    const elapsed = Date.now() - start;
    console.info(`[SkillExecutor] ${qualifiedName} → ok (${elapsed}ms)`);

    // Prometheus metrics
    skillExecutionDuration.observe({ skill: call.skill, function: call.function, success: 'true' }, elapsed / 1000);
    skillExecutionTotal.inc({ skill: call.skill, function: call.function, success: 'true' });

    // Write to execution log (fire-and-forget, don't block the response)
    logExecution(ctx, call, result, elapsed).catch((err) =>
      console.error('[SkillExecutor] Failed to write execution log:', err.message)
    );

    return result;
  } catch (err) {
    const elapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[SkillExecutor] ${qualifiedName} threw after ${elapsed}ms: ${message}`);

    // Prometheus metrics
    skillExecutionDuration.observe({ skill: call.skill, function: call.function, success: 'false' }, elapsed / 1000);
    skillExecutionTotal.inc({ skill: call.skill, function: call.function, success: 'false' });
    skillErrorTotal.inc({ skill: call.skill, function: call.function });

    result = {
      success: false,
      recipe: fnDef.default_recipe || '',
      data: {},
      error: `${ERROR_CODES.SKILL_EXECUTION_FAILED}: ${message}`,
    };

    logExecution(ctx, call, result, elapsed).catch((logErr) =>
      console.error('[SkillExecutor] Failed to write execution log:', logErr.message)
    );

    return result;
  }
}

/**
 * Write to vn_skill_execution_log for audit trail.
 */
async function logExecution(
  ctx: SkillContext,
  call: SkillCall,
  result: SkillResult,
  executionMs: number
): Promise<void> {
  await ctx.db.execute(
    `INSERT INTO ${TABLES.SKILL_EXECUTION_LOG}
     (tenant_id, user_id, skill_name, function_name, params, result_success, result_recipe, error_message, execution_ms)
     VALUES (:tenantId, :userId, :skillName, :functionName, :params, :success, :recipe, :error, :executionMs)`,
    {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      skillName: call.skill,
      functionName: call.function,
      params: JSON.stringify(call.params),
      success: result.success,
      recipe: result.recipe || null,
      error: result.error || null,
      executionMs,
    }
  );
}

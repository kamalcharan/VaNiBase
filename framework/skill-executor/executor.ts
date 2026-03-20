/**
 * Skill Executor — Runs a skill function within a SkillContext
 * Task: F-11
 *
 * Skills are loaded as modules with a standard handler signature.
 * The executor:
 * 1. Looks up the skill + function in the registry
 * 2. Checks tier access
 * 3. Invokes the handler with (context, params)
 * 4. Returns a SkillResult
 */

import type {
  SkillContext,
  SkillCall,
  SkillResult,
  SubscriptionTier,
} from '../../shared/types/index.js';
import type { SkillRegistryImpl } from './registry.js';
import { TIER_LEVELS, ERROR_CODES } from '../../shared/constants/index.js';

/**
 * A skill handler function — this is what product authors implement.
 * Each skill module exports a map of function_name → SkillHandler.
 */
export type SkillHandler = (
  ctx: SkillContext,
  params: Record<string, unknown>
) => Promise<SkillResult>;

/** In-memory map of skill.function → handler */
const handlers = new Map<string, SkillHandler>();

export function registerHandler(skillName: string, functionName: string, handler: SkillHandler): void {
  handlers.set(`${skillName}.${functionName}`, handler);
}

/**
 * Execute a single skill call.
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

  // 3. Look up and invoke the handler
  const handler = handlers.get(qualifiedName);
  if (!handler) {
    return {
      success: false,
      recipe: '',
      data: {},
      error: `No handler registered for ${qualifiedName}`,
    };
  }

  try {
    const result = await handler(ctx, call.params);
    const elapsed = Date.now() - start;
    console.info(`[SkillExecutor] ${qualifiedName} → ${result.success ? 'ok' : 'fail'} (${elapsed}ms)`);
    return result;
  } catch (err) {
    const elapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[SkillExecutor] ${qualifiedName} threw after ${elapsed}ms: ${message}`);
    return {
      success: false,
      recipe: fnDef.default_recipe || '',
      data: {},
      error: `${ERROR_CODES.SKILL_EXECUTION_FAILED}: ${message}`,
    };
  }
}

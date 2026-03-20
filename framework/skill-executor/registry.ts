/**
 * Skill Registry — In-memory registry of all available skills
 * Task: F-11
 *
 * Product authors register skills at startup. The registry:
 * - Stores SkillDefinitions keyed by name
 * - Filters skills by subscription tier
 * - Builds LFM2-compatible tool definitions for the VaNi engine
 */

import type {
  SkillDefinition,
  SkillFunctionDef,
  SkillRegistry,
  SubscriptionTier,
  LFM2ToolDef,
} from '../../shared/types/index.js';
import { TIER_LEVELS } from '../../shared/constants/index.js';

export class SkillRegistryImpl implements SkillRegistry {
  skills: Map<string, SkillDefinition> = new Map();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.name, skill);
    console.info(`[SkillRegistry] Registered: ${skill.name} v${skill.version}`);
  }

  getSkillsForTier(tier: SubscriptionTier): SkillDefinition[] {
    const tierLevel = TIER_LEVELS[tier] ?? 0;
    return Array.from(this.skills.values()).filter(
      (s) => (TIER_LEVELS[s.tier] ?? 0) <= tierLevel
    );
  }

  getFunction(skillName: string, functionName: string): SkillFunctionDef | null {
    const skill = this.skills.get(skillName);
    if (!skill) return null;
    return skill.functions.find((f) => f.name === functionName) ?? null;
  }

  /**
   * Build tool definitions in the OpenAI-compatible format that vLLM/LFM2 expects.
   * Each skill function becomes one tool, named "skillName.functionName".
   */
  buildToolDefinitions(tier: SubscriptionTier): LFM2ToolDef[] {
    const skills = this.getSkillsForTier(tier);
    const tools: LFM2ToolDef[] = [];

    for (const skill of skills) {
      for (const fn of skill.functions) {
        const properties: Record<string, { type: string; description: string; enum?: string[] }> = {};
        const required: string[] = [];

        for (const param of fn.parameters) {
          properties[param.name] = {
            type: param.type === 'string[]' || param.type === 'number[]' ? 'array' : param.type,
            description: param.description,
          };
          if (param.required) {
            required.push(param.name);
          }
        }

        tools.push({
          type: 'function',
          function: {
            name: `${skill.name}.${fn.name}`,
            description: fn.description,
            parameters: {
              type: 'object',
              properties,
              required,
            },
          },
        });
      }
    }

    return tools;
  }
}

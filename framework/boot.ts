/**
 * Boot Loader — Registers skills, recipes, and job handlers at startup.
 *
 * This is the integration point where product-specific skills and recipes
 * get wired into the framework. In a real product, this file would be
 * generated or hand-written to load KI-Prime skills, etc.
 *
 * For now, it loads the demo skill and demo recipe for E2E testing.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Orchestrator } from './orchestrator.js';
import { registerHandler } from './skill-executor/index.js';
import type { SkillDefinition, Recipe } from '../shared/types/index.js';

// --- Demo Skill Handlers ---
import { getGreeting } from '../skills/demo-skill/functions/get-greeting.js';
import { getStats } from '../skills/demo-skill/functions/get-stats.js';

/**
 * Register all skills, recipes, and job handlers.
 */
export function boot(orchestrator: Orchestrator): void {
  console.info('[Boot] Loading skills and recipes...');

  // =============================================
  // 1. REGISTER DEMO SKILL
  // =============================================
  const demoSkill: SkillDefinition = {
    name: 'demo-skill',
    version: '0.1.0',
    description: 'Demo skill for E2E pipeline testing',
    tier: 'starter',
    default_recipe: 'demo-dashboard',
    functions: [
      {
        name: 'get_greeting',
        description: 'Returns a personalized greeting with the tenant name',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true,
            description: 'Name of person to greet',
          },
        ],
        returns: 'Greeting message with tenant info',
        default_recipe: 'demo-dashboard',
      },
      {
        name: 'get_stats',
        description: 'Returns framework runtime stats like uptime and system info',
        parameters: [],
        returns: 'System stats (uptime, skill count, memory)',
        default_recipe: 'demo-dashboard',
      },
    ],
  };

  orchestrator.skillRegistry.register(demoSkill);
  registerHandler('demo-skill', 'get_greeting', getGreeting);
  registerHandler('demo-skill', 'get_stats', getStats);

  // =============================================
  // 2. REGISTER DEMO RECIPE
  // =============================================
  try {
    const recipePath = resolve(process.cwd(), 'recipes/demo-dashboard.json');
    const recipeJson = readFileSync(recipePath, 'utf-8');
    const recipe: Recipe = JSON.parse(recipeJson);
    orchestrator.recipeRegistry.register(recipe);
  } catch (err) {
    console.warn('[Boot] Could not load demo-dashboard recipe:', (err as Error).message);
  }

  // =============================================
  // 3. SUMMARY
  // =============================================
  const skillCount = orchestrator.skillRegistry.skills.size;
  const recipeCount = orchestrator.recipeRegistry.recipes.size;
  console.info(`[Boot] Ready — ${skillCount} skill(s), ${recipeCount} recipe(s)`);
}

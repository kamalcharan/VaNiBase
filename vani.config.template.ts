/**
 * VaNi Product Framework — Product Configuration Template
 * 
 * Task: F-06 | Every product built on VaNi defines this file.
 * Copy to your product root and customize all values.
 * 
 * The framework reads this at startup to configure:
 * - Skill filtering by tier
 * - VaNi mode (full/explain/off)
 * - Tenancy model (operator/subscriber)
 * - Available channels and themes
 */

import type { VaniProductConfig } from './shared/types';

const config: VaniProductConfig = {
  product: {
    name: 'My Product',
    slug: 'my-product',
    description: 'A product built on the VaNi Product Framework',
    entityType: 'entity',        // Primary entity: 'client', 'contract', 'market', etc.
    entityLabel: 'Entity',       // Display label in UI
    version: '1.0.0',
  },

  vani: {
    mode: 'full',                // 'full' | 'explain' | 'off'
    systemPrompt: `You are VaNi, an AI assistant for [Product Name].
Your role is to understand user intent, invoke the right skills, and present results clearly.
You NEVER calculate values yourself — always use skill functions for computations.
You NEVER generate UI markup — return the recipe name and let the shell render.
If you're unsure, ask the user to clarify. If a request is too complex, signal for escalation.`,
    defaultRecipe: 'home-dashboard',
    escalationThreshold: 0.6,    // Below this confidence → Claude API
  },

  tenancy: {
    model: 'operator',           // 'operator' (manages entities) | 'subscriber' (is the entity)
  },

  tiers: {
    starter: {
      skills: ['*'],             // Which skills are available. '*' = all, or list names.
      maxEntities: 100,
      vaniInteractionsPerDay: 50,
      claudeEscalationsPerDay: 0,
      features: {
        dailyBriefing: false,
        whatsappAgent: false,
        brandedReports: false,
      },
    },
    professional: {
      skills: ['*'],
      maxEntities: 500,
      vaniInteractionsPerDay: 200,
      claudeEscalationsPerDay: 5,
      features: {
        dailyBriefing: true,
        whatsappAgent: true,
        brandedReports: true,
      },
    },
    enterprise: {
      skills: ['*'],
      maxEntities: Infinity,
      vaniInteractionsPerDay: Infinity,
      claudeEscalationsPerDay: 20,
      features: {
        dailyBriefing: true,
        whatsappAgent: true,
        brandedReports: true,
      },
    },
  },

  channels: ['web', 'api'],

  themes: [
    'ocean-blue',
    'emerald-green',
    'sunset-amber',
    'royal-purple',
    'coral-reef',
    'slate-gray',
  ],

  database: {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    skillDbUrl: process.env.DATABASE_URL || '',
  },
};

export default config;

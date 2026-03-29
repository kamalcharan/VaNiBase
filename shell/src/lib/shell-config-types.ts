import type { ComponentType, ReactNode } from 'react';
import type { OnboardingStepDef } from '../../../shared/onboarding-steps.js';

// Re-export for convenience
export type { OnboardingStepDef };

// ── Config interfaces (shared between server and client) ──

export interface SkillEndpoint {
  /** Skill name, e.g. "client-skill" */
  skill: string;
  /** Function name, e.g. "getDashboard" */
  function: string;
  /** Static params to POST in the request body */
  params?: Record<string, unknown>;
  /**
   * Maps response paths to recipe data keys.
   * e.g. { "result.clients": "clients" } places response.result.clients at data.clients
   * If omitted, the entire response body is merged into recipe data.
   */
  responseMapping?: Record<string, string>;
}

export interface RecipeConfig {
  /** Recipe name — must match a recipe definition from GET /api/v1/recipes/:name */
  recipe: string;
  /** Sidebar display label */
  label: string;
  /** Optional icon identifier */
  icon?: string;
  /** URL route path, e.g. "/dashboard" or "/clients" */
  route: string;
  /** Skill endpoint(s) to call to populate this recipe's data */
  skills: SkillEndpoint[];
  /** Optional auto-refresh interval in seconds */
  refreshInterval?: number;
  /** Entity type this recipe displays (e.g., 'client', 'contract').
   *  When set, this recipe can be a detail page for entity drill-down. */
  entityType?: string;
  /** URL/skill param name for the entity ID (e.g., 'client_id').
   *  RecipePage injects the entity ID from the URL as this param in skill calls. */
  entityParam?: string;
}

export interface EntityConfig {
  /** Entity type identifier (e.g., 'client', 'contract', 'market') */
  type: string;
  /** The recipe route used as the detail page (e.g., '/client-360') */
  detailRoute: string;
  /** The param name used in skill calls (e.g., 'client_id') */
  paramName: string;
  /** Display label for the entity (e.g., 'Client', 'Contract') */
  label: string;
  /** The field in data-table row data that contains the entity ID (e.g., 'id', 'client_code') */
  idField?: string;
}

export interface ShellConfig {
  product: {
    name: string;
    tagline?: string;
  };
  /** Override for NEXT_PUBLIC_API_URL */
  apiUrl?: string;
  auth?: {
    /** Dev JWT token for local development */
    devToken?: string;
    /** Header name, defaults to "Authorization" */
    headerName?: string;
    /** Custom headers for dev bypass (X-Dev-Tenant-Id, etc.) */
    customHeaders?: Record<string, string>;
  };
  theme?: {
    /** Default theme id for this product (e.g. 'vikuna-black') */
    default?: string;
    /** If set, only these themes appear in the sidebar picker */
    available?: string[];
  };
  recipes: RecipeConfig[];
  /** Entity type definitions for drill-down navigation.
   *  data-table uses this to know where to navigate on row click. */
  entities?: EntityConfig[];
  /** Onboarding wizard step definitions.
   *  Only mandatory steps are tracked in VN_tenant_onboarding. */
  onboarding?: {
    steps: OnboardingStepDef[];
  };
  /** Custom page overrides — products can replace default pages with their own */
  pages?: {
    login?: ComponentType;
    register?: ComponentType;
    forgotPassword?: ComponentType;
    resetPassword?: ComponentType;
    inviteAccept?: ComponentType;
    settings?: ComponentType;
    landing?: ComponentType;
  };
  /** Map of onboarding step component names to React components.
   *  Products register their step form components here. Key = step.component string. */
  onboardingRegistry?: Record<string, ComponentType<{ onComplete: () => void; onSkip?: () => void }>>;
  /** Product-level context providers to wrap around the app.
   *  First provider in array = outermost wrapper. */
  providers?: ComponentType<{ children: ReactNode }>[];
}

// ── Default config (framework demo) ──

import { DEFAULT_ONBOARDING_STEPS } from '../../../shared/onboarding-steps.js';

export const DEFAULT_SHELL_CONFIG: ShellConfig = {
  product: {
    name: 'VaNi',
    tagline: 'Product Framework',
  },
  recipes: [],
  onboarding: {
    steps: DEFAULT_ONBOARDING_STEPS,
  },
  providers: [],
};

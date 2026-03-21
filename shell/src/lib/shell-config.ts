'use client';

import { createContext, useContext, type ReactNode } from 'react';
import React from 'react';

// ── Config interfaces ──

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
    customHeaders?: Record<string, string>; 
    /** Header name, defaults to "Authorization" */
    /** headerName?: string; */
  };
  recipes: RecipeConfig[];
}

// ── Default config (framework demo) ──

export const DEFAULT_SHELL_CONFIG: ShellConfig = {
  product: {
    name: 'VaNi',
    tagline: 'Product Framework',
  },
  recipes: [],
};

// ── React context ──

const ShellConfigContext = createContext<ShellConfig>(DEFAULT_SHELL_CONFIG);

export function ShellConfigProvider({
  config,
  children,
}: {
  config: ShellConfig;
  children: ReactNode;
}) {
  return React.createElement(ShellConfigContext.Provider, { value: config }, children);
}

export function useShellConfig(): ShellConfig {
  return useContext(ShellConfigContext);
}

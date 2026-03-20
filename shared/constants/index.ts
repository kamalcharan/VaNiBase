/**
 * VaNi Product Framework — Shared Constants
 */

// --- HTTP Status Codes ---
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// --- Subscription Tiers (ordered by level) ---
export const TIER_LEVELS: Record<string, number> = {
  starter: 0,
  professional: 1,
  enterprise: 2,
};

// --- Channel Defaults ---
export const DEFAULT_CHANNEL = 'web' as const;

// --- VaNi Engine ---
export const VANI_DEFAULTS = {
  MAX_TOKENS: 2048,
  TEMPERATURE: 0.3,
  ESCALATION_THRESHOLD: 0.6,
  HISTORY_LIMIT: 20,
  EMBEDDING_DIMENSION: 384,
} as const;

// --- API Paths ---
export const API_PATHS = {
  HEALTH: '/health',
  CHAT: '/api/v1/chat',
  SKILLS: '/api/v1/skills',
  RECIPES: '/api/v1/recipes',
  TENANTS: '/api/v1/tenants',
} as const;

// --- Error Codes ---
export const ERROR_CODES = {
  AUTH_MISSING: 'AUTH_MISSING',
  AUTH_INVALID: 'AUTH_INVALID',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TIER_INSUFFICIENT: 'TIER_INSUFFICIENT',
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  SKILL_EXECUTION_FAILED: 'SKILL_EXECUTION_FAILED',
  VANI_ENGINE_ERROR: 'VANI_ENGINE_ERROR',
  ESCALATION_FAILED: 'ESCALATION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

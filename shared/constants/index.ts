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

// --- Database Tables (vn_ prefix) ---
export const TABLES = {
  TENANTS: 'vn_tenants',
  USERS: 'vn_users',
  CONVERSATIONS: 'vn_conversations',
  CONVERSATION_TURNS: 'vn_conversation_turns',
  MEMORY_EMBEDDINGS: 'vn_memory_embeddings',
  SKILL_EXECUTION_LOG: 'vn_skill_execution_log',
  ESCALATION_LOG: 'vn_escalation_log',
  SCHEDULED_JOBS: 'vn_scheduled_jobs',
} as const;

// --- Rate Limits (per tier, per day) ---
export const RATE_LIMITS = {
  starter: { vaniInteractions: 50, claudeEscalations: 0 },
  professional: { vaniInteractions: 200, claudeEscalations: 5 },
  enterprise: { vaniInteractions: Infinity, claudeEscalations: 20 },
} as const;

// --- Connection Pool ---
export const POOL_DEFAULTS = {
  MAX_CONNECTIONS: 20,
  IDLE_TIMEOUT_MS: 30_000,
  CONNECTION_TIMEOUT_MS: 5_000,
} as const;

// --- Job Types ---
export const JOB_TYPES = {
  DAILY_BRIEFING: 'daily_briefing',
  REPORT_GENERATION: 'report_generation',
  BULK_ALERT: 'bulk_alert',
  NAV_FETCH: 'nav_fetch',
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

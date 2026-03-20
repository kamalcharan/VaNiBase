/**
 * Context Builder — Assembles a SkillContext from the authenticated request
 * Task: F-10
 *
 * This is the single point where all per-request context is gathered:
 * - Tenant ID and user ID from JWT (NEVER from the LLM)
 * - Tier for skill gating
 * - A tenant-scoped DB client
 * - A memory store instance
 * - An escalation callback
 */

import type { Request } from 'express';
import type {
  SkillContext,
  TenantScopedDB,
  MemoryStore,
  Channel,
  ChatRequest,
} from '../../shared/types/index.js';
import { DEFAULT_CHANNEL } from '../../shared/constants/index.js';

/**
 * Stub TenantScopedDB — will be backed by a real Postgres pool later.
 * The key design point: every query is automatically scoped to the tenant
 * via SET app.tenant_id before executing.
 */
function createScopedDB(_tenantId: string): TenantScopedDB {
  return {
    async query<T = Record<string, unknown>>(
      _sql: string,
      _params: Record<string, unknown>
    ): Promise<T[]> {
      // Stub: will be implemented with pg Pool
      return [];
    },
    async queryOne<T = Record<string, unknown>>(
      _sql: string,
      _params: Record<string, unknown>
    ): Promise<T | null> {
      return null;
    },
    async execute(
      _sql: string,
      _params: Record<string, unknown>
    ): Promise<{ rowCount: number }> {
      return { rowCount: 0 };
    },
  };
}

/**
 * Stub MemoryStore — will be backed by conversation_turns + pgvector later.
 */
function createMemoryStore(): MemoryStore {
  return {
    async getHistory(_tenantId, _entityId, _limit) {
      return [];
    },
    async saveTurn(_turn) {
      // no-op stub
    },
    async search(_tenantId, _query, _limit) {
      return [];
    },
  };
}

/**
 * Build a SkillContext from an authenticated Express request.
 * The req.auth payload is guaranteed to exist (authMiddleware runs first).
 */
export function buildSkillContext(
  req: Request,
  escalateFn: (prompt: string) => Promise<string>
): SkillContext {
  const auth = req.auth!;
  const body = req.body as ChatRequest;

  return {
    tenantId: auth.tenant_id,
    userId: auth.sub,
    tier: auth.tier,
    db: createScopedDB(auth.tenant_id),
    memory: createMemoryStore(),
    escalate: escalateFn,
    entityId: body.entity_id,
    entityType: undefined, // set from product config at runtime
    channel: (body.channel as Channel) || DEFAULT_CHANNEL,
  };
}

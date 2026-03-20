/**
 * Context Builder — Assembles a SkillContext from the authenticated request
 * Updated for scalability: real DB pool, enqueue, memory store
 */

import type { Request } from 'express';
import type {
  SkillContext,
  MemoryStore,
  Channel,
  ChatRequest,
} from '../../shared/types/index.js';
import { DEFAULT_CHANNEL } from '../../shared/constants/index.js';
import { createTenantScopedDB } from '../db/index.js';
import { enqueueJob } from '../queue/index.js';

/**
 * Build a SkillContext from an authenticated Express request.
 */
export function buildSkillContext(
  req: Request,
  escalateFn: (prompt: string) => Promise<string>,
  memoryStore: MemoryStore
): SkillContext {
  const auth = req.auth!;
  const body = req.body as ChatRequest;

  return {
    tenantId: auth.tenant_id,
    userId: auth.sub,
    tier: auth.tier,
    db: createTenantScopedDB(auth.tenant_id),
    memory: memoryStore,
    escalate: escalateFn,
    enqueue: async (jobType: string, payload: Record<string, unknown>) => {
      return enqueueJob(jobType, {
        ...payload,
        _tenantId: auth.tenant_id,
        _userId: auth.sub,
      });
    },
    entityId: body.entity_id,
    entityType: undefined,
    channel: (body.channel as Channel) || DEFAULT_CHANNEL,
  };
}

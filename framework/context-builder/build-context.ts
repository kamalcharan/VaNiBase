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
import { isPoolReady, createTenantScopedDB, createStubDB } from '../db/index.js';
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

  const poolReady = isPoolReady();
  console.info(`[DEBUG][ContextBuilder] Building SkillContext from auth payload:`);
  console.info(`[DEBUG][ContextBuilder]   tenant_id = "${auth.tenant_id}" (type: ${typeof auth.tenant_id})`);
  console.info(`[DEBUG][ContextBuilder]   user_id   = "${auth.sub}" (type: ${typeof auth.sub})`);
  console.info(`[DEBUG][ContextBuilder]   tier      = "${auth.tier}"`);
  console.info(`[DEBUG][ContextBuilder]   pool_ready = ${poolReady} → using ${poolReady ? 'createTenantScopedDB' : 'createStubDB'}`);

  const db = poolReady ? createTenantScopedDB(auth.tenant_id) : createStubDB(auth.tenant_id);
  console.info(`[DEBUG][ContextBuilder] SkillContext built successfully. DB will call set_tenant_context("${auth.tenant_id}") on each query.`);

  return {
    tenantId: auth.tenant_id,
    userId: auth.sub,
    tier: auth.tier,
    db,
    memory: memoryStore,
    escalate: escalateFn,
    enqueue: async (jobType: string, payload: Record<string, unknown>) => {
      try {
        return await enqueueJob(jobType, {
          ...payload,
          _tenantId: auth.tenant_id,
          _userId: auth.sub,
        });
      } catch {
        console.warn(`[SkillContext] enqueue(${jobType}) failed — queue not available`);
        return 'unavailable';
      }
    },
    entityId: body.entity_id,
    entityType: undefined,
    channel: (body.channel as Channel) || DEFAULT_CHANNEL,
  };
}

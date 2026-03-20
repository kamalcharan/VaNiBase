/**
 * Orchestrator — The main pipeline that wires all layers together
 * Updated for scalability: real DB, rate limiting, escalation tracking, metrics
 */

import type { Request } from 'express';
import type {
  ChatRequest,
  ChatResponse,
  VaniRequest,
  LFM2Message,
  ConversationTurn,
  Channel,
} from '../shared/types/index.js';
import { VaniEngine, MockVaniEngine } from './vani-engine/index.js';
import { EscalationHandler } from './escalation/index.js';
import { SkillRegistryImpl, executeSkill } from './skill-executor/index.js';
import { RecipeRegistryImpl } from './recipes/index.js';
import { MemoryStoreImpl } from './memory/index.js';
import { buildSkillContext } from './context-builder/index.js';
import { loadConfig } from './config.js';
import { DEFAULT_CHANNEL } from '../shared/constants/index.js';
import {
  incrementVaniCounter,
  incrementEscalationCounter,
  canEscalate,
} from './middleware/rate-limiter.js';
import { escalationTotal } from './middleware/metrics.js';

export class Orchestrator {
  readonly skillRegistry: SkillRegistryImpl;
  readonly recipeRegistry: RecipeRegistryImpl;
  readonly memoryStore: MemoryStoreImpl;
  private vaniEngine: VaniEngine | MockVaniEngine;
  private escalationHandler: EscalationHandler;
  private systemPrompt: string;
  readonly mockMode: boolean;

  constructor(opts?: { systemPrompt?: string }) {
    const config = loadConfig();

    this.skillRegistry = new SkillRegistryImpl();
    this.recipeRegistry = new RecipeRegistryImpl();
    this.memoryStore = new MemoryStoreImpl();

    // Use mock engine when vLLM is unavailable
    this.mockMode = !config.vllmEndpoint || config.vllmEndpoint === 'mock' || process.env.VANI_MOCK === 'true';
    if (this.mockMode) {
      console.info('[Orchestrator] Mock VaNi mode — keyword-based intent classification');
      this.vaniEngine = new MockVaniEngine();
    } else {
      this.vaniEngine = new VaniEngine({
        endpoint: config.vllmEndpoint,
        model: config.vllmModel,
      });
    }

    this.escalationHandler = new EscalationHandler({
      claudeApiKey: config.claudeApiKey,
      claudeModel: config.claudeModel,
    });
    this.systemPrompt = opts?.systemPrompt || 'You are VaNi, an AI assistant.';
  }

  async handleChat(req: Request): Promise<ChatResponse> {
    const auth = req.auth!;
    const body = req.body as ChatRequest;
    const channel = (body.channel || DEFAULT_CHANNEL) as Channel;

    // Track VaNi interaction count (fail-open if Redis unavailable)
    try { await incrementVaniCounter(auth.tenant_id); } catch { /* Redis may be down in dev */ }

    // Build escalation callback, then SkillContext
    const escalateFn = this.escalationHandler.createEscalateFn(this.systemPrompt);
    const ctx = buildSkillContext(req, escalateFn, this.memoryStore);

    // Fetch conversation history (graceful if DB unavailable)
    let historyMessages: LFM2Message[] = [];
    try {
      const history = await this.memoryStore.getHistory(auth.tenant_id, body.entity_id ?? null, 10);
      historyMessages = history.map((t) => ({
        role: t.role as 'user' | 'assistant',
        content: t.content,
      }));
    } catch {
      // DB may not be available in dev/mock mode
    }

    // Build tool definitions for this tier
    const tools = this.skillRegistry.buildToolDefinitions(auth.tier);

    // Call VaNi engine
    const vaniRequest: VaniRequest = {
      message: body.message,
      tenant_id: auth.tenant_id,
      user_id: auth.sub,
      entity_id: body.entity_id,
      channel,
      mode: 'full',
    };

    const vaniResponse = await this.vaniEngine.chat(
      vaniRequest,
      this.systemPrompt,
      historyMessages,
      tools
    );

    // Execute skill calls
    for (const call of vaniResponse.skill_calls) {
      const result = await executeSkill(call, ctx, this.skillRegistry);
      vaniResponse.skill_results.push(result);
    }

    // Check for escalation
    let reply = vaniResponse.reply;
    let escalated = false;

    if (vaniResponse.confidence < this.vaniEngine.escalationThreshold) {
      const allowed = await canEscalate(auth.tenant_id, auth.tier);
      if (allowed) {
        try {
          const escalationResult = await this.escalationHandler.escalate(
            this.systemPrompt,
            body.message,
            historyMessages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }))
          );
          reply = escalationResult.reply;
          escalated = true;
          await incrementEscalationCounter(auth.tenant_id);
          escalationTotal.inc({ tenant_id: auth.tenant_id });
          console.info(
            `[Orchestrator] Escalated to Claude (confidence: ${vaniResponse.confidence}, latency: ${escalationResult.latencyMs}ms)`
          );
        } catch (err) {
          console.error('[Orchestrator] Escalation failed:', err);
        }
      } else {
        console.info(`[Orchestrator] Escalation blocked — ${auth.tier} tier limit reached for tenant ${auth.tenant_id}`);
      }
    }

    // Determine recipe
    const recipe =
      body.recipe_override ||
      vaniResponse.skill_results.find((r) => r.recipe)?.recipe ||
      vaniResponse.recipe;

    // Merge data
    const mergedData: Record<string, unknown> = {};
    for (const result of vaniResponse.skill_results) {
      if (result.success) {
        Object.assign(mergedData, result.data);
      }
    }

    // Save conversation turns
    const userTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      tenant_id: auth.tenant_id,
      entity_id: body.entity_id ?? null,
      role: 'user',
      content: body.message,
      channel,
      timestamp: new Date().toISOString(),
    };

    const assistantTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      tenant_id: auth.tenant_id,
      entity_id: body.entity_id ?? null,
      role: 'assistant',
      content: reply,
      skill_calls: vaniResponse.skill_calls,
      recipe_used: recipe,
      channel,
      timestamp: new Date().toISOString(),
    };

    // Persist turns (graceful if DB unavailable)
    try {
      await this.memoryStore.saveTurn(userTurn);
      await this.memoryStore.saveTurn(assistantTurn);
    } catch (err) {
      console.error('[Orchestrator] Failed to save conversation turns:', (err as Error).message);
    }

    return {
      reply,
      recipe,
      data: Object.keys(mergedData).length > 0 ? mergedData : undefined,
      skill_calls: vaniResponse.skill_calls.map((c) => ({
        skill: c.skill,
        function: c.function,
      })),
      escalated,
    };
  }
}

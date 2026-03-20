/**
 * Orchestrator — The main pipeline that wires all layers together
 * Task: F-16
 *
 * Flow:
 *   1. User message arrives at /api/v1/chat
 *   2. Gateway (auth + tenant context) has already run
 *   3. Context builder creates SkillContext
 *   4. VaNi engine classifies intent and returns tool calls
 *   5. Skill executor runs each tool call
 *   6. If confidence < threshold → escalation to Claude
 *   7. Memory store saves the conversation turn
 *   8. Response returned with recipe + data for the shell
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
import { VaniEngine } from './vani-engine/index.js';
import { EscalationHandler } from './escalation/index.js';
import { SkillRegistryImpl, executeSkill } from './skill-executor/index.js';
import { RecipeRegistryImpl } from './recipes/index.js';
import { MemoryStoreImpl } from './memory/index.js';
import { buildSkillContext } from './context-builder/index.js';
import { loadConfig } from './config.js';
import { DEFAULT_CHANNEL } from '../shared/constants/index.js';

export class Orchestrator {
  readonly skillRegistry: SkillRegistryImpl;
  readonly recipeRegistry: RecipeRegistryImpl;
  private vaniEngine: VaniEngine;
  private escalationHandler: EscalationHandler;
  private memoryStore: MemoryStoreImpl;
  private systemPrompt: string;

  constructor(opts?: { systemPrompt?: string }) {
    const config = loadConfig();

    this.skillRegistry = new SkillRegistryImpl();
    this.recipeRegistry = new RecipeRegistryImpl();
    this.memoryStore = new MemoryStoreImpl();
    this.vaniEngine = new VaniEngine({
      endpoint: config.vllmEndpoint,
      model: config.vllmModel,
    });
    this.escalationHandler = new EscalationHandler({
      claudeApiKey: config.claudeApiKey,
      claudeModel: config.claudeModel,
    });
    this.systemPrompt = opts?.systemPrompt || 'You are VaNi, an AI assistant.';
  }

  /**
   * Process a chat request end-to-end.
   */
  async handleChat(req: Request): Promise<ChatResponse> {
    const auth = req.auth!;
    const body = req.body as ChatRequest;
    const channel = (body.channel || DEFAULT_CHANNEL) as Channel;

    // Build escalation callback, then SkillContext
    const escalateFn = this.escalationHandler.createEscalateFn(this.systemPrompt);
    const ctx = buildSkillContext(req, escalateFn);

    // Fetch conversation history for context
    const history = await this.memoryStore.getHistory(auth.tenant_id, body.entity_id ?? null, 10);
    const historyMessages: LFM2Message[] = history.map((t) => ({
      role: t.role as 'user' | 'assistant',
      content: t.content,
    }));

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
        console.info(
          `[Orchestrator] Escalated to Claude (confidence: ${vaniResponse.confidence}, latency: ${escalationResult.latencyMs}ms)`
        );
      } catch (err) {
        console.error('[Orchestrator] Escalation failed:', err);
        // Fall back to VaNi's response even if low confidence
      }
    }

    // Determine recipe from skill results or override
    const recipe =
      body.recipe_override ||
      vaniResponse.skill_results.find((r) => r.recipe)?.recipe ||
      vaniResponse.recipe;

    // Merge data from all successful skill results
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

    await this.memoryStore.saveTurn(userTurn);
    await this.memoryStore.saveTurn(assistantTurn);

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

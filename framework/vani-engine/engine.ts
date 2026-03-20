/**
 * VaNi Engine — Sends prompts to LFM2 via vLLM's OpenAI-compatible API
 * Task: F-12
 *
 * Responsibilities:
 * - Build the LFM2 message array (system prompt + history + user message)
 * - Attach tool definitions from the SkillRegistry
 * - Call vLLM /v1/chat/completions
 * - Parse tool_calls from the response
 * - Return structured VaniResponse with confidence assessment
 */

import type {
  VaniRequest,
  VaniResponse,
  LFM2ToolDef,
  LFM2Message,
  LFM2ToolCall,
  SkillCall,
} from '../../shared/types/index.js';
import type { VaniEngineConfig } from '../../shared/types/index.js';
import { VANI_DEFAULTS } from '../../shared/constants/index.js';

interface ChatCompletionChoice {
  message: {
    role: string;
    content: string | null;
    tool_calls?: LFM2ToolCall[];
  };
  finish_reason: string;
}

interface ChatCompletionResponse {
  choices: ChatCompletionChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class VaniEngine {
  private config: VaniEngineConfig;

  constructor(config: Partial<VaniEngineConfig> & { endpoint: string }) {
    this.config = {
      endpoint: config.endpoint,
      model: config.model || 'liquidai/lfm2-2.6b',
      maxTokens: config.maxTokens || VANI_DEFAULTS.MAX_TOKENS,
      temperature: config.temperature || VANI_DEFAULTS.TEMPERATURE,
      escalationThreshold: config.escalationThreshold || VANI_DEFAULTS.ESCALATION_THRESHOLD,
    };
  }

  /**
   * Send a chat request to the vLLM server and parse the response.
   */
  async chat(
    request: VaniRequest,
    systemPrompt: string,
    history: LFM2Message[],
    tools: LFM2ToolDef[]
  ): Promise<VaniResponse> {
    const messages: LFM2Message[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: request.message },
    ];

    const body = {
      model: this.config.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };

    const response = await fetch(`${this.config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`vLLM request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('vLLM returned no choices');
    }

    // Parse tool calls
    const skillCalls = this.parseToolCalls(choice.message.tool_calls);

    // Assess confidence heuristically
    const confidence = this.assessConfidence(choice);

    return {
      reply: choice.message.content || '',
      skill_calls: skillCalls,
      skill_results: [], // Filled in by the orchestrator after executing skills
      escalated: false,
      confidence,
    };
  }

  /**
   * Convert LFM2 tool_calls into our SkillCall format.
   * Tool names are "skillName.functionName".
   */
  private parseToolCalls(toolCalls?: LFM2ToolCall[]): SkillCall[] {
    if (!toolCalls) return [];

    return toolCalls.map((tc) => {
      const [skill, fn] = tc.function.name.split('.', 2);
      let params: Record<string, unknown> = {};
      try {
        params = JSON.parse(tc.function.arguments);
      } catch {
        console.error(`[VaniEngine] Failed to parse tool call arguments for ${tc.function.name}`);
      }
      return {
        skill: skill || tc.function.name,
        function: fn || '',
        params,
      };
    });
  }

  /**
   * Simple confidence heuristic:
   * - If tool calls present → higher confidence (model knows what to do)
   * - If finish_reason is 'stop' with content → medium confidence
   * - Otherwise lower confidence
   */
  private assessConfidence(choice: ChatCompletionChoice): number {
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      return 0.85;
    }
    if (choice.finish_reason === 'stop' && choice.message.content) {
      return 0.7;
    }
    return 0.4;
  }

  get escalationThreshold(): number {
    return this.config.escalationThreshold;
  }
}

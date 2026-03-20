/**
 * Mock VaNi Engine — Keyword-based intent classification
 * Used when VLLM_ENDPOINT is 'mock' or unset.
 * Parses user messages for keywords and returns mock tool calls.
 */

import type {
  VaniRequest,
  VaniResponse,
  LFM2ToolDef,
  LFM2Message,
} from '../../shared/types/index.js';

export class MockVaniEngine {
  readonly escalationThreshold = 0.6;

  async chat(
    request: VaniRequest,
    _systemPrompt: string,
    _history: LFM2Message[],
    tools: LFM2ToolDef[]
  ): Promise<VaniResponse> {
    const msg = request.message.toLowerCase().trim();
    const skillCalls = this.classifyIntent(msg, tools);

    if (skillCalls.length > 0) {
      return {
        reply: '',
        skill_calls: skillCalls,
        skill_results: [],
        escalated: false,
        confidence: 0.85,
      };
    }

    // No match — return a generic reply with medium confidence
    return {
      reply: `I understood your message: "${request.message}". In production, VaNi (LFM2) would classify your intent and call the appropriate skill. Currently running in mock mode.`,
      skill_calls: [],
      skill_results: [],
      escalated: false,
      confidence: 0.7,
    };
  }

  private classifyIntent(
    msg: string,
    tools: LFM2ToolDef[]
  ): { skill: string; function: string; params: Record<string, unknown> }[] {
    // Greeting patterns
    if (/\b(hello|hi|hey|greet|namaste|good\s*(morning|afternoon|evening))\b/.test(msg)) {
      const hasGreeting = tools.some(t => t.function.name === 'demo-skill.get_greeting');
      if (hasGreeting) {
        // Extract a name if present after greeting word
        const nameMatch = msg.match(/(?:hello|hi|hey|greet(?:ing)?)\s+(\w+)/i);
        const name = nameMatch ? nameMatch[1] : 'there';
        return [{
          skill: 'demo-skill',
          function: 'get_greeting',
          params: { name },
        }];
      }
    }

    // Stats patterns
    if (/\b(stats|status|uptime|health|system|info|dashboard)\b/.test(msg)) {
      const hasStats = tools.some(t => t.function.name === 'demo-skill.get_stats');
      if (hasStats) {
        return [{
          skill: 'demo-skill',
          function: 'get_stats',
          params: {},
        }];
      }
    }

    // Generic: try to match any tool by keyword in its description
    for (const tool of tools) {
      const keywords = tool.function.description.toLowerCase().split(/\s+/);
      const matchCount = keywords.filter(kw => kw.length > 3 && msg.includes(kw)).length;
      if (matchCount >= 2) {
        const [skill, fn] = tool.function.name.split('.', 2);
        return [{ skill, function: fn, params: {} }];
      }
    }

    return [];
  }
}

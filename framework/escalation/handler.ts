/**
 * Escalation Handler — Falls back to Claude API when VaNi confidence is low
 * Task: F-13
 *
 * When VaNi's confidence is below the escalation threshold, we call Claude
 * to handle the request. This uses Anthropic's Messages API.
 */

import type { FrameworkConfig } from '../config.js';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export class EscalationHandler {
  private apiKey: string;
  private model: string;

  constructor(config: Pick<FrameworkConfig, 'claudeApiKey' | 'claudeModel'>) {
    this.apiKey = config.claudeApiKey;
    this.model = config.claudeModel;
  }

  /**
   * Escalate a prompt to Claude. Returns the assistant's text response.
   */
  async escalate(
    systemPrompt: string,
    userMessage: string,
    history: ClaudeMessage[] = []
  ): Promise<{ reply: string; inputTokens: number; outputTokens: number; latencyMs: number }> {
    if (!this.apiKey) {
      throw new Error('CLAUDE_API_KEY not configured — cannot escalate');
    }

    const start = Date.now();

    const messages = [
      ...history,
      { role: 'user' as const, content: userMessage },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Claude API error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as ClaudeResponse;
    const reply = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    return {
      reply,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      latencyMs,
    };
  }

  /**
   * Create the escalate callback for SkillContext.
   * This is a curried function that captures the system prompt.
   */
  createEscalateFn(systemPrompt: string): (prompt: string) => Promise<string> {
    return async (prompt: string) => {
      const result = await this.escalate(systemPrompt, prompt);
      return result.reply;
    };
  }
}

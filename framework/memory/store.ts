/**
 * Memory Store — Conversation history + pgvector semantic search
 * Task: F-14
 *
 * This implementation provides an in-memory store for development.
 * In production, it will be backed by the conversation_turns and
 * memory_embeddings tables with pgvector for semantic search.
 */

import type {
  MemoryStore,
  ConversationTurn,
} from '../../shared/types/index.js';
import { VANI_DEFAULTS } from '../../shared/constants/index.js';

export class MemoryStoreImpl implements MemoryStore {
  /** In-memory store keyed by "tenantId:entityId" */
  private turns: Map<string, ConversationTurn[]> = new Map();

  private key(tenantId: string, entityId: string | null): string {
    return `${tenantId}:${entityId || '_global'}`;
  }

  async getHistory(
    tenantId: string,
    entityId: string | null,
    limit: number = VANI_DEFAULTS.HISTORY_LIMIT
  ): Promise<ConversationTurn[]> {
    const k = this.key(tenantId, entityId);
    const all = this.turns.get(k) || [];
    return all.slice(-limit);
  }

  async saveTurn(turn: ConversationTurn): Promise<void> {
    const k = this.key(turn.tenant_id, turn.entity_id);
    const existing = this.turns.get(k) || [];
    existing.push(turn);
    this.turns.set(k, existing);
  }

  /**
   * Simple keyword search (in-memory fallback).
   * In production, this uses pgvector cosine similarity on embeddings.
   */
  async search(
    tenantId: string,
    query: string,
    limit: number = 5
  ): Promise<ConversationTurn[]> {
    const results: ConversationTurn[] = [];
    const queryLower = query.toLowerCase();

    for (const [key, turns] of this.turns.entries()) {
      if (!key.startsWith(tenantId)) continue;
      for (const turn of turns) {
        if (turn.content.toLowerCase().includes(queryLower)) {
          results.push(turn);
        }
      }
    }

    return results
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }
}

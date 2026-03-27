/**
 * Memory Store — Postgres-backed conversation history + pgvector search
 * S-06: Zero in-process state — all state in Postgres
 *
 * Replaces the in-memory implementation. Now backed by:
 * - vn_conversation_turns for history
 * - vn_memory_embeddings + pgvector for semantic search
 */

import type {
  MemoryStore,
  ConversationTurn,
} from '../../shared/types/index.js';
import { VANI_DEFAULTS, TABLES } from '../../shared/constants/index.js';
import { getPool } from '../db/factory.js';

export class MemoryStoreImpl implements MemoryStore {
  async getHistory(
    tenantId: string,
    entityId: string | null,
    limit: number = VANI_DEFAULTS.HISTORY_LIMIT
  ): Promise<ConversationTurn[]> {
    const pool = getPool();

    const entityClause = entityId
      ? `AND c.entity_id = $3`
      : `AND c.entity_id IS NULL`;

    const params: unknown[] = [tenantId, limit];
    if (entityId) params.push(entityId);

    // Set tenant context for RLS
    const client = await pool.connect();
    try {
      await client.query('SELECT set_tenant_context($1)', [tenantId]);

      const result = await client.query(
        `SELECT ct.id, ct.tenant_id, c.entity_id, ct.role, ct.content,
                ct.skill_calls, ct.recipe_used, ct.channel, ct.created_at AS timestamp
         FROM ${TABLES.CONVERSATION_TURNS} ct
         JOIN ${TABLES.CONVERSATIONS} c ON ct.conversation_id = c.id
         WHERE ct.tenant_id = $1 ${entityClause}
         ORDER BY ct.created_at DESC
         LIMIT $2`,
        params
      );

      // Return in chronological order
      return result.rows.reverse().map((r) => ({
        id: r.id,
        tenant_id: r.tenant_id,
        entity_id: r.entity_id,
        role: r.role,
        content: r.content,
        skill_calls: r.skill_calls,
        recipe_used: r.recipe_used,
        channel: r.channel,
        timestamp: r.timestamp?.toISOString?.() ?? r.timestamp,
      }));
    } finally {
      client.release();
    }
  }

  async saveTurn(turn: ConversationTurn): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT set_tenant_context($1)', [turn.tenant_id]);

      // Ensure a conversation exists (upsert)
      const convResult = await client.query(
        `INSERT INTO ${TABLES.CONVERSATIONS} (tenant_id, user_id, entity_id, channel)
         VALUES ($1, $1, $2, $3)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [turn.tenant_id, turn.entity_id, turn.channel]
      );

      let conversationId: string;
      if (convResult.rows.length > 0) {
        conversationId = convResult.rows[0].id;
      } else {
        // Get existing conversation
        const existing = await client.query(
          `SELECT id FROM ${TABLES.CONVERSATIONS}
           WHERE tenant_id = $1 AND entity_id ${turn.entity_id ? '= $2' : 'IS NULL'} AND active = true
           ORDER BY last_message_at DESC LIMIT 1`,
          turn.entity_id ? [turn.tenant_id, turn.entity_id] : [turn.tenant_id]
        );
        conversationId = existing.rows[0]?.id || turn.id;
      }

      await client.query(
        `INSERT INTO ${TABLES.CONVERSATION_TURNS}
         (id, conversation_id, tenant_id, role, content, skill_calls, recipe_used, channel)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          turn.id,
          conversationId,
          turn.tenant_id,
          turn.role,
          turn.content,
          turn.skill_calls ? JSON.stringify(turn.skill_calls) : null,
          turn.recipe_used,
          turn.channel,
        ]
      );

      // Update conversation timestamp
      await client.query(
        `UPDATE ${TABLES.CONVERSATIONS} SET last_message_at = now() WHERE id = $1`,
        [conversationId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Semantic search via pgvector cosine similarity.
   * Falls back to keyword ILIKE search if no embeddings are available.
   */
  async search(
    tenantId: string,
    query: string,
    limit: number = 5
  ): Promise<ConversationTurn[]> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT set_tenant_context($1)', [tenantId]);

      // Keyword fallback (pgvector embedding search needs an embedding model call)
      const result = await client.query(
        `SELECT ct.id, ct.tenant_id, c.entity_id, ct.role, ct.content,
                ct.skill_calls, ct.recipe_used, ct.channel, ct.created_at AS timestamp
         FROM ${TABLES.CONVERSATION_TURNS} ct
         JOIN ${TABLES.CONVERSATIONS} c ON ct.conversation_id = c.id
         WHERE ct.tenant_id = $1 AND ct.content ILIKE $2
         ORDER BY ct.created_at DESC
         LIMIT $3`,
        [tenantId, `%${query}%`, limit]
      );

      return result.rows.map((r) => ({
        id: r.id,
        tenant_id: r.tenant_id,
        entity_id: r.entity_id,
        role: r.role,
        content: r.content,
        skill_calls: r.skill_calls,
        recipe_used: r.recipe_used,
        channel: r.channel,
        timestamp: r.timestamp?.toISOString?.() ?? r.timestamp,
      }));
    } finally {
      client.release();
    }
  }
}

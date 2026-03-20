-- ============================================================
-- VaNi Product Framework — Base Migrations
-- Task: F-04 | These tables are shared across ALL products.
-- Product-specific tables go in the product's migrations/ dir.
-- ============================================================

-- ============================================================
-- MIGRATION 001: FRAMEWORK CORE TABLES
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";       -- pgvector for memory

-- -----------------------------------------------------------
-- TENANTS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,               -- URL-safe identifier
    tier            TEXT NOT NULL DEFAULT 'starter'
                        CHECK (tier IN ('starter', 'professional', 'enterprise')),
    preferences     JSONB NOT NULL DEFAULT '{}'::jsonb,  -- TenantPreferences
    active          BOOLEAN NOT NULL DEFAULT true,
    supabase_org_id TEXT,                                -- Link to Supabase auth
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(active) WHERE active = true;

-- -----------------------------------------------------------
-- USERS (framework-level, mirrors Supabase auth)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY,                    -- Same as Supabase auth.users.id
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'member'
                        CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    active          BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email);

-- -----------------------------------------------------------
-- CONVERSATIONS (conversation sessions)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_id       TEXT,                                -- Product-specific entity (client_id, contract_id, etc.)
    entity_type     TEXT,                                -- From product config
    channel         TEXT NOT NULL DEFAULT 'web'
                        CHECK (channel IN ('web', 'whatsapp', 'mobile', 'api')),
    active          BOOLEAN NOT NULL DEFAULT true,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_tenant_entity ON conversations(tenant_id, entity_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_active ON conversations(active) WHERE active = true;

-- -----------------------------------------------------------
-- CONVERSATION TURNS (individual messages)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_turns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    skill_calls     JSONB,                               -- Array of SkillCall objects
    skill_results   JSONB,                               -- Array of SkillResult objects
    recipe_used     TEXT,                                 -- Recipe rendered for this turn
    channel         TEXT NOT NULL DEFAULT 'web',
    confidence      REAL,                                -- VaNi confidence score 0-1
    escalated       BOOLEAN NOT NULL DEFAULT false,
    token_count     INTEGER,                             -- LLM tokens consumed
    latency_ms      INTEGER,                             -- Total response time
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_turns_conversation ON conversation_turns(conversation_id);
CREATE INDEX idx_turns_tenant ON conversation_turns(tenant_id);
CREATE INDEX idx_turns_tenant_created ON conversation_turns(tenant_id, created_at DESC);

-- -----------------------------------------------------------
-- MEMORY EMBEDDINGS (pgvector for semantic search)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_embeddings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id       TEXT,                                -- Optional entity scope
    turn_id         UUID REFERENCES conversation_turns(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,                       -- The text that was embedded
    embedding       vector(384) NOT NULL,                -- MiniLM embedding dimension
    metadata        JSONB DEFAULT '{}'::jsonb,           -- Skill calls, recipe, etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for fast ANN search, scoped by tenant
CREATE INDEX idx_memory_embedding_hnsw ON memory_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_memory_tenant ON memory_embeddings(tenant_id);
CREATE INDEX idx_memory_tenant_entity ON memory_embeddings(tenant_id, entity_id);

-- -----------------------------------------------------------
-- SKILL EXECUTION LOG (audit trail)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_execution_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    conversation_id UUID REFERENCES conversations(id),
    skill_name      TEXT NOT NULL,
    function_name   TEXT NOT NULL,
    params          JSONB NOT NULL,                      -- Input params (sanitized)
    result_success  BOOLEAN NOT NULL,
    result_recipe   TEXT,
    error_message   TEXT,
    execution_ms    INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skill_log_tenant ON skill_execution_log(tenant_id);
CREATE INDEX idx_skill_log_skill ON skill_execution_log(skill_name, function_name);
CREATE INDEX idx_skill_log_created ON skill_execution_log(created_at DESC);

-- -----------------------------------------------------------
-- ESCALATION LOG
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS escalation_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id),
    reason          TEXT NOT NULL,                       -- Why VaNi escalated
    vani_confidence REAL NOT NULL,                       -- VaNi's confidence when escalated
    claude_model    TEXT NOT NULL,                       -- e.g., 'claude-sonnet-4-20250514'
    prompt_tokens   INTEGER,
    completion_tokens INTEGER,
    latency_ms      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_escalation_tenant ON escalation_log(tenant_id);

-- -----------------------------------------------------------
-- SCHEDULED JOBS (BullMQ tracking)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_type        TEXT NOT NULL,                       -- e.g., 'daily_briefing', 'nav_fetch'
    schedule_cron   TEXT NOT NULL,                       -- Cron expression
    last_run_at     TIMESTAMPTZ,
    next_run_at     TIMESTAMPTZ,
    config          JSONB DEFAULT '{}'::jsonb,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_tenant ON scheduled_jobs(tenant_id);
CREATE INDEX idx_jobs_next_run ON scheduled_jobs(next_run_at) WHERE active = true;


-- ============================================================
-- MIGRATION 002: ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: tenant can only see their own data
-- The app sets current_setting('app.tenant_id') on each connection

-- Tenants: only see own tenant record
CREATE POLICY tenant_isolation ON tenants
    FOR ALL USING (id::text = current_setting('app.tenant_id', true));

-- Users: only see users in own tenant
CREATE POLICY user_tenant_isolation ON users
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Conversations: only see own tenant's conversations
CREATE POLICY conversation_tenant_isolation ON conversations
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Conversation turns: only see own tenant's turns
CREATE POLICY turn_tenant_isolation ON conversation_turns
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Memory: only see own tenant's embeddings
CREATE POLICY memory_tenant_isolation ON memory_embeddings
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Skill log: only see own tenant's execution log
CREATE POLICY skill_log_tenant_isolation ON skill_execution_log
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Escalation log: only see own tenant's escalations
CREATE POLICY escalation_tenant_isolation ON escalation_log
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Scheduled jobs: only see own tenant's jobs
CREATE POLICY jobs_tenant_isolation ON scheduled_jobs
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));


-- ============================================================
-- MIGRATION 003: HELPER FUNCTIONS
-- ============================================================

-- Function to set tenant context for RLS
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.tenant_id', p_tenant_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

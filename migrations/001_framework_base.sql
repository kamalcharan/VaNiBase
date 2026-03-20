-- ============================================================
-- VaNi Product Framework — Base Migrations (VN_ prefix)
-- All framework tables prefixed with VN_
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- -----------------------------------------------------------
-- VN_TENANTS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vn_tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    tier            TEXT NOT NULL DEFAULT 'starter'
                        CHECK (tier IN ('starter', 'professional', 'enterprise')),
    preferences     JSONB NOT NULL DEFAULT '{}'::jsonb,
    active          BOOLEAN NOT NULL DEFAULT true,
    supabase_org_id TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vn_tenants_slug ON vn_tenants(slug);
CREATE INDEX idx_vn_tenants_active ON vn_tenants(active) WHERE active = true;

-- -----------------------------------------------------------
-- VN_USERS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vn_users (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES vn_tenants(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'member'
                        CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    active          BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vn_users_tenant ON vn_users(tenant_id);
CREATE INDEX idx_vn_users_email ON vn_users(email);
CREATE UNIQUE INDEX idx_vn_users_tenant_email ON vn_users(tenant_id, email);

-- -----------------------------------------------------------
-- VN_CONVERSATIONS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vn_conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES vn_tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES vn_users(id) ON DELETE CASCADE,
    entity_id       TEXT,
    entity_type     TEXT,
    channel         TEXT NOT NULL DEFAULT 'web'
                        CHECK (channel IN ('web', 'whatsapp', 'mobile', 'api')),
    active          BOOLEAN NOT NULL DEFAULT true,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vn_conversations_tenant ON vn_conversations(tenant_id);
CREATE INDEX idx_vn_conversations_tenant_entity ON vn_conversations(tenant_id, entity_id);
CREATE INDEX idx_vn_conversations_user ON vn_conversations(user_id);

-- -----------------------------------------------------------
-- VN_CONVERSATION_TURNS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vn_conversation_turns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES vn_conversations(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES vn_tenants(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    skill_calls     JSONB,
    skill_results   JSONB,
    recipe_used     TEXT,
    channel         TEXT NOT NULL DEFAULT 'web',
    confidence      REAL,
    escalated       BOOLEAN NOT NULL DEFAULT false,
    token_count     INTEGER,
    latency_ms      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vn_turns_conversation ON vn_conversation_turns(conversation_id);
CREATE INDEX idx_vn_turns_tenant ON vn_conversation_turns(tenant_id);
CREATE INDEX idx_vn_turns_tenant_created ON vn_conversation_turns(tenant_id, created_at DESC);

-- -----------------------------------------------------------
-- VN_MEMORY_EMBEDDINGS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vn_memory_embeddings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES vn_tenants(id) ON DELETE CASCADE,
    entity_id       TEXT,
    turn_id         UUID REFERENCES vn_conversation_turns(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    embedding       vector(384) NOT NULL,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vn_memory_hnsw ON vn_memory_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_vn_memory_tenant ON vn_memory_embeddings(tenant_id);
CREATE INDEX idx_vn_memory_tenant_entity ON vn_memory_embeddings(tenant_id, entity_id);

-- -----------------------------------------------------------
-- VN_SKILL_EXECUTION_LOG
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vn_skill_execution_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES vn_tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    conversation_id UUID REFERENCES vn_conversations(id),
    skill_name      TEXT NOT NULL,
    function_name   TEXT NOT NULL,
    params          JSONB NOT NULL,
    result_success  BOOLEAN NOT NULL,
    result_recipe   TEXT,
    error_message   TEXT,
    execution_ms    INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vn_skill_log_tenant ON vn_skill_execution_log(tenant_id);
CREATE INDEX idx_vn_skill_log_skill ON vn_skill_execution_log(skill_name, function_name);
CREATE INDEX idx_vn_skill_log_created ON vn_skill_execution_log(created_at DESC);

-- -----------------------------------------------------------
-- VN_ESCALATION_LOG
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vn_escalation_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES vn_tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES vn_conversations(id),
    reason          TEXT NOT NULL,
    vani_confidence REAL NOT NULL,
    claude_model    TEXT NOT NULL,
    prompt_tokens   INTEGER,
    completion_tokens INTEGER,
    latency_ms      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vn_escalation_tenant ON vn_escalation_log(tenant_id);

-- -----------------------------------------------------------
-- VN_SCHEDULED_JOBS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vn_scheduled_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES vn_tenants(id) ON DELETE CASCADE,
    job_type        TEXT NOT NULL,
    schedule_cron   TEXT NOT NULL,
    last_run_at     TIMESTAMPTZ,
    next_run_at     TIMESTAMPTZ,
    config          JSONB DEFAULT '{}'::jsonb,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vn_jobs_tenant ON vn_scheduled_jobs(tenant_id);
CREATE INDEX idx_vn_jobs_next_run ON vn_scheduled_jobs(next_run_at) WHERE active = true;


-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE vn_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE vn_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vn_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vn_conversation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE vn_memory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vn_skill_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vn_escalation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vn_scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY vn_tenant_isolation ON vn_tenants
    FOR ALL USING (id::text = current_setting('app.tenant_id', true));
CREATE POLICY vn_user_tenant_isolation ON vn_users
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY vn_conversation_tenant_isolation ON vn_conversations
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY vn_turn_tenant_isolation ON vn_conversation_turns
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY vn_memory_tenant_isolation ON vn_memory_embeddings
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY vn_skill_log_tenant_isolation ON vn_skill_execution_log
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY vn_escalation_tenant_isolation ON vn_escalation_log
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY vn_jobs_tenant_isolation ON vn_scheduled_jobs
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.tenant_id', p_tenant_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vn_tenants_updated
    BEFORE UPDATE ON vn_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vn_users_updated
    BEFORE UPDATE ON vn_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
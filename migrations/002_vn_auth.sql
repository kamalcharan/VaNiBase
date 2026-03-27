-- ============================================================
-- VaNi Auth Layer — Schema Extensions
-- Adds password support to vn_users, refresh token storage,
-- and session tracking.
-- ============================================================

-- -----------------------------------------------------------
-- Add password_hash to vn_users (nullable — allows social/SSO login)
-- -----------------------------------------------------------
ALTER TABLE vn_users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- -----------------------------------------------------------
-- VN_REFRESH_TOKENS — Refresh token storage with rotation
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vn_refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES vn_users(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES vn_tenants(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,           -- SHA-256 hash of the token (never store raw)
    device_info     TEXT,                    -- e.g., 'Chrome/Windows', 'KI-Prime Shell'
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT false,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vn_refresh_tokens_hash ON vn_refresh_tokens(token_hash) WHERE revoked = false;
CREATE INDEX idx_vn_refresh_tokens_user ON vn_refresh_tokens(user_id);
CREATE INDEX idx_vn_refresh_tokens_tenant ON vn_refresh_tokens(tenant_id);
CREATE INDEX idx_vn_refresh_tokens_expires ON vn_refresh_tokens(expires_at) WHERE revoked = false;

-- RLS
ALTER TABLE vn_refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY vn_refresh_tokens_tenant_isolation ON vn_refresh_tokens
    FOR ALL USING (tenant_id::text = current_setting('app.tenant_id', true));

-- -----------------------------------------------------------
-- Trigger: auto-update updated_at on vn_users (if not already)
-- -----------------------------------------------------------
-- (trg_vn_users_updated already exists from 001_framework_base.sql)

-- -----------------------------------------------------------
-- Cleanup: auto-delete expired tokens (run periodically via cron or BullMQ)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION vn_cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM vn_refresh_tokens
    WHERE revoked = true OR expires_at < now() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

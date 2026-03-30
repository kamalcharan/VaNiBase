-- ============================================================================
-- VaNiBase Migration: 011_vn_onboarding_missing_columns.sql
-- ============================================================================
-- Scope: Add missing columns needed by onboarding step data persistence
-- Depends on: 001_vn_foundation.sql, 010_vn_user_profile_fields.sql
-- ============================================================================
-- Version: 1.0.0
-- Date: March 2026
-- Vikuna Technologies — Confidential
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- VN_users: Add bio column for user profile
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE VN_users ADD COLUMN IF NOT EXISTS bio TEXT;

COMMENT ON COLUMN VN_users.bio IS 'Short user bio or about text, collected during onboarding';

-- ────────────────────────────────────────────────────────────────────────────
-- VN_tenant_profiles: Add ARN column for financial advisors
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE VN_tenant_profiles ADD COLUMN IF NOT EXISTS arn VARCHAR(50);

COMMENT ON COLUMN VN_tenant_profiles.arn IS 'AMFI Registration Number for mutual fund distributors';

-- ────────────────────────────────────────────────────────────────────────────
-- Record this migration
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO VN_migrations (filename, checksum, applied_by, notes) VALUES
    ('011_vn_onboarding_missing_columns.sql', md5('011_vn_onboarding_missing_columns_v1.0.0'), 'manual',
     'Add bio to VN_users, arn to VN_tenant_profiles for onboarding persistence')
ON CONFLICT (filename) DO NOTHING;

COMMIT;

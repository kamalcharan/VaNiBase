-- ============================================================================
-- VaNiBase Migration: 010_vn_user_profile_fields.sql
-- ============================================================================
-- Scope: Add profile fields to VN_users for settings page
-- Depends on: 001_vn_foundation.sql (VN_users must exist)
-- ============================================================================
-- Version: 1.0.0
-- Date: March 2026
-- Vikuna Technologies — Confidential
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- Add profile columns to VN_users
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE VN_users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE VN_users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE VN_users ADD COLUMN IF NOT EXISTS designation VARCHAR(50);
ALTER TABLE VN_users ADD COLUMN IF NOT EXISTS country_code VARCHAR(10) DEFAULT '+91';
ALTER TABLE VN_users ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);

COMMENT ON COLUMN VN_users.first_name IS 'User first name — split from legacy name field';
COMMENT ON COLUMN VN_users.last_name IS 'User last name — split from legacy name field';
COMMENT ON COLUMN VN_users.designation IS 'Job title or designation';
COMMENT ON COLUMN VN_users.country_code IS 'Phone country code, e.g. +91, +1';
COMMENT ON COLUMN VN_users.mobile IS 'Mobile phone number without country code';

-- ────────────────────────────────────────────────────────────────────────────
-- Record this migration
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO VN_migrations (filename, checksum, applied_by, notes) VALUES
    ('010_vn_user_profile_fields.sql', md5('010_vn_user_profile_fields_v1.0.0'), 'manual',
     'Add first_name, last_name, designation, country_code, mobile to VN_users')
ON CONFLICT (filename) DO NOTHING;

COMMIT;

-- ============================================================================
-- Post-migration verification
-- ============================================================================
-- SELECT column_name, data_type, character_maximum_length
--   FROM information_schema.columns
--   WHERE table_name = 'vn_users'
--   AND column_name IN ('first_name','last_name','designation','country_code','mobile');

-- ============================================================
-- VaNi Demo Seed — Inserts minimum data for E2E testing
-- Run after migrations:
--   psql $DATABASE_URL -f seeds/demo-seed.sql
-- ============================================================

-- Use fixed UUIDs so dev headers and docs can reference them.
-- Tenant: Demo Distributor (professional tier)
INSERT INTO vn_tenants (id, name, slug, tier, preferences, active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Demo Distributor',
  'demo-distributor',
  'professional',
  '{"theme": "ocean-blue", "language": "en", "timezone": "Asia/Kolkata", "daily_briefing": true, "whatsapp_enabled": false, "custom": {}}'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier;

-- User: Dev Admin linked to Demo Distributor
INSERT INTO vn_users (id, tenant_id, email, display_name, role, active)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'dev@vani.local',
  'Dev Admin',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name;

-- Print the IDs for reference
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Demo Seed Complete!';
  RAISE NOTICE 'Tenant ID: a0000000-0000-0000-0000-000000000001';
  RAISE NOTICE 'User ID:   b0000000-0000-0000-0000-000000000001';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Use these in dev headers:';
  RAISE NOTICE '  X-Dev-Tenant-Id: a0000000-0000-0000-0000-000000000001';
  RAISE NOTICE '  X-Dev-User-Id:   b0000000-0000-0000-0000-000000000001';
  RAISE NOTICE '============================================';
END $$;

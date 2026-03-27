-- ============================================================
-- VaNi Demo Seed — Inserts minimum data for E2E testing
-- Requires: 001_vn_foundation.sql + 002_vn_operational.sql applied
-- Run: psql $DATABASE_URL -f seeds/demo-seed.sql
-- ============================================================

-- Tenant: Demo Distributor
INSERT INTO VN_tenants (id, slug, status, activated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'demo-distributor',
  'active',
  now()
)
ON CONFLICT (slug) DO NOTHING;

-- Tenant Profile
INSERT INTO VN_tenant_profiles (tenant_id, name, short_name, display_name, type, email, theme_id)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Demo Distributor Pvt Ltd',
  'Demo Dist',
  'Demo Distributor',
  'pvt_ltd',
  'admin@demodist.com',
  'ocean'
)
ON CONFLICT (tenant_id) DO UPDATE SET
  name = EXCLUDED.name;

-- User: Dev Admin (password: "password123" — bcrypt hash)
INSERT INTO VN_users (id, tenant_id, email, password_hash, name, is_active, is_email_verified)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'dev@vani.local',
  '$2b$12$LJ3m4yqF.hxXtEOIZhWJv.8jNHVMQr2cvNMqvOYq6jz3Rz8UkEFLe',  -- "password123"
  'Dev Admin',
  true,
  true
)
ON CONFLICT (tenant_id, email) DO UPDATE SET
  name = EXCLUDED.name;

-- Assign 'owner' role to Dev Admin
INSERT INTO VN_user_roles (user_id, role_id)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'  -- 'owner' role from 001_vn_foundation
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Subscription: Professional plan for demo tenant
INSERT INTO VN_subscriptions (tenant_id, plan_code, plan_name, status, max_users, max_sessions)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'pro',
  'Professional',
  'active',
  10,
  3
)
ON CONFLICT DO NOTHING;

-- Print the IDs for reference
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Demo Seed Complete!';
  RAISE NOTICE 'Tenant ID: a0000000-0000-0000-0000-000000000001';
  RAISE NOTICE 'User ID:   b0000000-0000-0000-0000-000000000001';
  RAISE NOTICE 'Email:     dev@vani.local';
  RAISE NOTICE 'Password:  password123';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Dev headers (bypass JWT):';
  RAISE NOTICE '  X-Dev-Tenant-Id: a0000000-0000-0000-0000-000000000001';
  RAISE NOTICE '  X-Dev-User-Id:   b0000000-0000-0000-0000-000000000001';
  RAISE NOTICE 'Or login: POST /api/v1/auth/login';
  RAISE NOTICE '  {"email":"dev@vani.local","password":"password123"}';
  RAISE NOTICE '============================================';
END $$;

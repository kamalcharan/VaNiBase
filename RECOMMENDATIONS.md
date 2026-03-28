# Migration Recommendations — 003 through 007

## 007_vn_schema_updates.sql — Columns Already Exist (RESOLVED)

Migration 007 now uses `ALTER COLUMN ... TYPE VARCHAR(500)` for `avatar_url` and `logo_url` (which exist as `TEXT` in 001), and keeps `ADD COLUMN IF NOT EXISTS` for `theme_id` (which may or may not exist depending on migration state).

## 003_vn_invitations.sql — role_id Default (RESOLVED)

The default role for invitations is now `'user'`, seeded in `008_vn_seed_user_role.sql` as a global non-system role (code: `user`, sort_order: 4).

## 006_vn_error_log — Retention Policy

The `VN_error_log` table has no built-in cleanup mechanism. Consider adding a cleanup function (similar to `vn_cleanup_expired_sessions`) to periodically prune old error logs beyond a configurable retention period.

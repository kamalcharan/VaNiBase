# Migration Recommendations — 003 through 007

## 007_vn_schema_updates.sql — Columns Already Exist (RESOLVED)

Migration 007 now uses `ALTER COLUMN ... TYPE VARCHAR(500)` for `avatar_url` and `logo_url` (which exist as `TEXT` in 001), and keeps `ADD COLUMN IF NOT EXISTS` for `theme_id` (which may or may not exist depending on migration state).

## 003_vn_invitations.sql — role_id Default 'member' Not Seeded (OPEN QUESTION)

The `role_id` column is `VARCHAR(50)` with a default of `'member'`, but the only seeded roles in `VN_roles` (from 001) are: `superadmin`, `owner`, `admin`. There is no `member` role seeded anywhere in the framework migrations or seed files.

**Question**: Should a `member` role be seeded in the framework, or is it expected that each product seeds its own `member` role before the invitation flow is used? If the default should match an existing role code (e.g. `admin`), the DEFAULT in 003 should be updated. Leaving as `'member'` for now pending clarification.

## 006_vn_error_log — Retention Policy

The `VN_error_log` table has no built-in cleanup mechanism. Consider adding a cleanup function (similar to `vn_cleanup_expired_sessions`) to periodically prune old error logs beyond a configurable retention period.

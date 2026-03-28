# Migration Recommendations — 003 through 007

## 007_vn_schema_updates.sql — Columns Already Exist

The three columns added in migration 007 already exist in `001_vn_foundation.sql`:

| Column | Existing Type (001) | Requested Type (007) |
|--------|-------------------|---------------------|
| `VN_users.avatar_url` | `TEXT` | `VARCHAR(500)` |
| `VN_tenant_profiles.logo_url` | `TEXT` | `VARCHAR(500)` |
| `VN_tenant_profiles.theme_id` | `VARCHAR(50) DEFAULT 'ocean'` | `VARCHAR(50) NULL` |

**Impact**: `ADD COLUMN IF NOT EXISTS` will silently skip these since the columns already exist. The type difference (`TEXT` vs `VARCHAR(500)`) will not cause an error, but it also won't change the type. If the PRD intends `VARCHAR(500)` as the canonical type, the existing columns in 001 should be updated, or 007 should use `ALTER COLUMN ... TYPE VARCHAR(500)` instead.

**Recommendation**: If `VARCHAR(500)` is required for validation purposes, update the column definitions in `001_vn_foundation.sql` directly (since the product hasn't shipped yet), or convert 007 to use `ALTER TABLE ... ALTER COLUMN ... TYPE VARCHAR(500)`.

## 003_vn_invitations.sql — role_id is a String, Not a FK

The `role_id` column is `VARCHAR(50)` with a default of `'member'`, but there is no `'member'` role seeded in `VN_roles`. This is likely intentional (products seed their own roles), but worth confirming that each product seeds a `member` role before the invitation flow is used.

## 006_vn_error_log — Retention Policy

The `VN_error_log` table has no built-in cleanup mechanism. Consider adding a cleanup function (similar to `vn_cleanup_expired_sessions`) to periodically prune old error logs beyond a configurable retention period.

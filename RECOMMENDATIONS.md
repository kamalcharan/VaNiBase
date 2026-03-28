# Recommendations

## 007_vn_schema_updates.sql — Columns Already Exist (RESOLVED)

Migration 007 now uses `ALTER COLUMN ... TYPE VARCHAR(500)` for `avatar_url` and `logo_url` (which exist as `TEXT` in 001), and keeps `ADD COLUMN IF NOT EXISTS` for `theme_id` (which may or may not exist depending on migration state).

## 003_vn_invitations.sql — role_id Default (RESOLVED)

The default role for invitations is now `'user'`, seeded in `008_vn_seed_user_role.sql` as a global non-system role (code: `user`, sort_order: 4).

## 006_vn_error_log — Retention Policy

The `VN_error_log` table has no built-in cleanup mechanism. Consider adding a cleanup function (similar to `vn_cleanup_expired_sessions`) to periodically prune old error logs beyond a configurable retention period.

## Error Handling Framework

### ErrorBoundary Styling

The `ErrorBoundary` uses inline styles with CSS variables (`var(--color-*)`) rather than Tailwind classes because it's a class component that renders outside normal app context when errors occur. Inline styles with CSS variables ensure the fallback UI is always theme-aware without depending on Tailwind's class compilation being available in error states.

### Error Logger — Console vs DB

In development mode (`NODE_ENV=development`), errors are logged to console only. In all other environments, errors are inserted into `VN_error_log`. If the DB pool is not initialized (stub mode), the logger falls back to console silently. The DB insert is fire-and-forget — it never blocks or throws.

## Invitation Endpoints

### Email Dispatch Not Implemented

The invite endpoint returns raw tokens in the response but does not send invitation emails. A future integration should send emails containing an accept link with the token. Until then, the caller (product app) is responsible for email dispatch.

### Flow B — Cross-Tenant User Duplication

When an existing user (authenticated via Bearer) accepts an invitation to a different tenant, a new `VN_users` row is created in the inviting tenant. The `password_hash` is copied from the existing account. This means:
- The user has separate accounts per tenant (consistent with the `UNIQUE(tenant_id, email)` design)
- Password changes on one tenant do not propagate to the other
- If a unified cross-tenant identity is needed in the future, a `VN_user_identities` linking table would be required

### Invitation Expiry Cleanup

Expired invitations are not automatically marked as `'expired'` — they remain as `'pending'` with an `expires_at` in the past. The accept flow validates expiry at runtime. Consider adding a periodic cleanup function (similar to `vn_cleanup_expired_sessions`) to mark old pending invitations as expired for cleaner reporting.

### Max Invitation Limits

The batch invite endpoint does not enforce a maximum number of invitations per request or per tenant. Consider adding a configurable limit (e.g., max 50 per request) to prevent abuse, especially before email dispatch is implemented.

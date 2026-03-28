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

### Multi-Tenancy Model — Strict Isolation (Model 1)

Multi-tenancy model is strict isolation (Model 1). One user row per tenant. No cross-tenant user linking. `invite/accept` always creates a new user. The same email can exist independently in multiple tenants (enforced by `UNIQUE(tenant_id, email)` on `VN_users`). Each tenant's user has their own password, preferences, and role assignments.

### Invitation Expiry Cleanup

Expired invitations are not automatically marked as `'expired'` — they remain as `'pending'` with an `expires_at` in the past. The accept flow validates expiry at runtime. Consider adding a periodic cleanup function (similar to `vn_cleanup_expired_sessions`) to mark old pending invitations as expired for cleaner reporting.

### Max Invitation Limits

The batch invite endpoint does not enforce a maximum number of invitations per request or per tenant. Consider adding a configurable limit (e.g., max 50 per request) to prevent abuse, especially before email dispatch is implemented.

## Password Management Endpoints

### Password Validation

Password validation is currently `length >= 8` only, matching the existing registration rule. Consider adding strength requirements in a future pass (uppercase, lowercase, digit, special character) via a shared `validatePassword()` utility.

### Forgot Password — Email Not Implemented

The `/forgot-password` endpoint returns the raw reset token in the response (MVP). In production, this token must be sent via email and the endpoint should always return a generic message regardless of whether the user exists (to prevent enumeration). The current MVP returns the token directly only when a user is found.

### Reset Token Cleanup

Used and expired password reset tokens remain in `VN_password_resets` indefinitely. Consider a periodic cleanup function to delete tokens older than a configurable retention period (e.g., 30 days).

### Change Password — Session Preservation

`/change-password` does not revoke existing sessions after a password change. This is intentional — the user is already authenticated and initiated the change. `/reset-password` does revoke all sessions (force re-login) since it indicates the password may have been compromised.

## Tenant Profile Endpoint

### CORS — PATCH Method Added

`PATCH` was added to the CORS `methods` whitelist in `server.ts`. Previously only `GET, POST, PUT, DELETE` were allowed, which would have blocked the `PATCH /api/v1/tenant/profile` endpoint from browser clients.

### Upsert Pattern

The update uses a two-step approach: first `INSERT ... ON CONFLICT DO NOTHING` to ensure a row exists, then `UPDATE` with only the provided fields. This handles the edge case where a tenant was created without a profile row (e.g., via direct DB insert or a migration issue).

### Expandability

Only `name`, `logo_url`, and `theme_id` are exposed for update. `VN_tenant_profiles` has many more columns (address, tax IDs, branding, etc.). Additional fields can be added to the endpoint as product requirements expand — the dynamic SET clause pattern supports this cleanly.

## Onboarding API

### Step Definitions — Shared Config

Onboarding step definitions live in `shared/onboarding-steps.ts` (shared between framework and shell). The default steps are KI-Prime's: `user_profile` (mandatory), `business_profile` (mandatory), `theme_selection`, `invite_team`, `risk_preferences`, `import_data` (all optional). Only mandatory steps get DB rows in `VN_tenant_onboarding`. Products override the default by providing their own `onboarding.steps` in their `shell.config.ts`.

### Step Ordering

The `GET /onboarding/status` endpoint sorts pending steps using a hardcoded order array (`user_profile` → `business_profile`). If products add custom mandatory steps, they should be added to the `STEP_ORDER` array in `framework/onboarding/service.ts`, or the ordering logic should be refactored to use a `sort_order` field from the step definition.

### onboarding_complete in /me

`GET /auth/me` now includes `onboarding_complete: boolean` in the `tenant` object. This is computed per-request via a `COUNT(*)` query on `VN_tenant_onboarding`. If this becomes a performance concern (unlikely — it's a small table with an index on `tenant_id`), consider caching the result or denormalizing it onto `VN_tenants`.

### Product-Specific Steps

The framework seeds `DEFAULT_ONBOARDING_STEPS` from `shared/onboarding-steps.ts` during registration. Products that need different steps should provide their own step list via their server entry point. Currently the framework's `register()` function directly imports the default — a future improvement could accept the step list as a parameter or read it from a product config registry.

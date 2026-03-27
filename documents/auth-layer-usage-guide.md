# VaNiBase Auth Layer — Usage Guide

## Overview

Self-contained JWT authentication with bcrypt password hashing, refresh token rotation, and multi-tenant support. No external auth provider required (Supabase optional).

**Files:**
```
framework/auth/
├── types.ts        — Request/response interfaces, JWT payload types
├── passwords.ts    — hashPassword(), verifyPassword() using bcrypt (12 rounds)
├── tokens.ts       — signAccessToken(), signRefreshToken(), verify*(), hashToken()
├── service.ts      — register(), login(), refresh(), logout(), me()
└── index.ts        — Barrel exports

framework/routes/auth.ts    — Express router for /api/v1/auth/*
framework/gateway/auth.ts   — JWT verification middleware (upgraded from stub)
migrations/002_vn_auth.sql  — password_hash column + vn_refresh_tokens table
```

---

## 1. Environment Setup

**Required** for auth to work:

```env
JWT_SECRET=your-32-char-random-secret-here     # REQUIRED for JWT signing
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Auth also needs a database (register/login store data):
```env
DB_PRIMARY=postgresql://user:pass@host:5432/database
```

---

## 2. API Endpoints

### POST /api/v1/auth/register

Creates a new tenant + user. First user becomes `owner`.

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "kamal@vikuna.com",
    "password": "SecurePass123",
    "display_name": "Kamal Charan",
    "tenant_name": "Vikuna Technologies"
  }'
```

**Response (201):**
```json
{
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1...",
    "refresh_token": "eyJhbGciOiJIUzI1...",
    "expires_in": 900
  },
  "user": {
    "id": "uuid",
    "tenant_id": "uuid",
    "email": "kamal@vikuna.com",
    "display_name": "Kamal Charan",
    "role": "owner"
  },
  "tenant": {
    "id": "uuid",
    "name": "Vikuna Technologies",
    "slug": "vikuna-technologies-m1abc",
    "tier": "starter"
  }
}
```

**Errors:**
- `400` — Missing fields or password < 8 chars
- `409` — Email already registered (AUTH_EMAIL_EXISTS)

### POST /api/v1/auth/login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "kamal@vikuna.com", "password": "SecurePass123"}'
```

**Response (200):** Same shape as register.

**Errors:**
- `401` — Invalid email or password (AUTH_INVALID_CREDENTIALS)

### POST /api/v1/auth/refresh

Exchange a refresh token for a new access + refresh pair. Old refresh token is revoked (rotation).

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token": "eyJhbGciOiJIUzI1..."}'
```

**Response (200):**
```json
{
  "access_token": "eyJ...(new)",
  "refresh_token": "eyJ...(new)",
  "expires_in": 900
}
```

**Errors:**
- `401` — Refresh token revoked, expired, or invalid (AUTH_REFRESH_INVALID)

### POST /api/v1/auth/logout

Revokes the refresh token. Access token remains valid until it expires (15 min).

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token": "eyJhbGciOiJIUzI1..."}'
```

**Response (200):** `{ "success": true }`

### GET /api/v1/auth/me (Protected)

Returns the current user's profile. Requires Bearer token.

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1...'
```

**Response (200):**
```json
{
  "user": { "id": "uuid", "tenant_id": "uuid", "email": "...", "display_name": "...", "role": "owner" },
  "tenant": { "id": "uuid", "name": "...", "slug": "...", "tier": "starter" }
}
```

---

## 3. Using Tokens in Protected Endpoints

After login/register, use the `access_token` as a Bearer token:

```bash
# Chat with real JWT
curl -X POST http://localhost:3001/api/v1/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1...' \
  -d '{"message": "show me system stats"}'

# Direct skill execution with real JWT
curl -X POST http://localhost:3001/api/v1/skills/demo-skill/get_greeting \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1...' \
  -d '{"params": {"name": "Kamal"}}'
```

### Token Lifecycle

| Token | TTL | Storage | Purpose |
|-------|-----|---------|---------|
| Access token | 15 min | Client memory (never persist) | Authorization header |
| Refresh token | 30 days | Client secure storage + DB hash | Get new access token |

### Shell Integration

In the shell, replace hardcoded dev headers with real tokens:

```typescript
// After login, store tokens
const { tokens } = await login(email, password);
localStorage.setItem('access_token', tokens.access_token);
localStorage.setItem('refresh_token', tokens.refresh_token);

// In skill-fetcher.ts buildAuthHeaders():
const token = localStorage.getItem('access_token');
headers['Authorization'] = `Bearer ${token}`;
```

---

## 4. Dev Bypass (Still Works)

In development mode (`NODE_ENV=development`), the X-Dev-* headers bypass JWT:

```bash
curl -X POST http://localhost:3001/api/v1/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Dev-Tenant-Id: a0000000-0000-0000-0000-000000000001' \
  -H 'X-Dev-User-Id: b0000000-0000-0000-0000-000000000001' \
  -d '{"message": "hello"}'
```

This sets `req.auth` with role=owner, tier=professional. No JWT_SECRET needed for dev bypass.

---

## 5. JWT Payload Structure

The access token contains:

```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "role": "owner",
  "tier": "professional",
  "email": "kamal@vikuna.com",
  "iat": 1711540800,
  "exp": 1711541700,
  "iss": "vani-framework"
}
```

This maps directly to the existing `JWTPayload` interface in `shared/types/index.ts`. All protected routes see `req.auth` with this shape.

---

## 6. Security Notes

- **Passwords**: bcrypt with 12 salt rounds (~250ms per hash)
- **Refresh tokens**: SHA-256 hashed before DB storage — raw tokens never persisted
- **Token rotation**: Each refresh invalidates the old token and issues a new pair
- **RLS bypass**: Auth queries run on raw pool (pre-auth, no `set_tenant_context`) since they need cross-tenant lookups (email uniqueness check, login)
- **Expired token cleanup**: `vn_cleanup_expired_tokens()` SQL function available for periodic cleanup via BullMQ job

---

## 7. Database Schema (002_vn_auth.sql)

```sql
-- Added to vn_users:
ALTER TABLE vn_users ADD COLUMN password_hash TEXT;

-- New table:
CREATE TABLE vn_refresh_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES vn_users(id),
    tenant_id   UUID NOT NULL REFERENCES vn_tenants(id),
    token_hash  TEXT NOT NULL,        -- SHA-256 of refresh token
    device_info TEXT,                 -- User-Agent string
    ip_address  INET,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN DEFAULT false,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. Product Integration Checklist

1. Pull updated VaNiBase submodule
2. Run `npm install` (adds bcrypt + jsonwebtoken)
3. Set `JWT_SECRET` in your `.env`
4. Run migration: `psql $DATABASE_URL -f migrations/002_vn_auth.sql`
5. Test: `curl -X POST http://localhost:3001/api/v1/auth/register -H 'Content-Type: application/json' -d '{"email":"test@test.com","password":"password123","display_name":"Test"}'`
6. Update shell to use real JWT tokens instead of dev headers

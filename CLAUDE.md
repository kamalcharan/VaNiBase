# VaNiBase — Claude Code Notes

## Project Overview

VaNi Product Framework — a multi-tenant SaaS framework with skill-based architecture.
Products (e.g., KI-Prime) build on this framework by registering skill handlers.

## Architecture

- `shared/types/` — Shared type definitions (SkillContext, TenantScopedDB, etc.)
- `framework/db/pool.ts` — PostgreSQL connection pool with tenant-scoped DB
- `framework/skill-executor/executor.ts` — Skill execution engine
- `framework/context-builder/` — Builds SkillContext from authenticated requests
- `framework/routes/skills.ts` — Express route for skill invocation
- `skills/` — Skill implementations (demo-skill ships with framework)
- `migrations/` — PostgreSQL migration files

## Lessons Learned

- **DB query() and queryOne() return `{ rows: T[] }`** to match pg native format. All skill authors expect this shape. Do NOT return bare `T[]` or `T | null`.
- **SkillContext exposes both `tenantId` and `tenant_id`** for compatibility. Framework code uses camelCase (`tenantId`), product skills may use snake_case (`tenant_id`). Both point to the same value.
- **Skill handlers are called as `handler(params, ctx)`** — params first, context second. Product skills are written as `async function get_clients(params, ctx)`. The executor must match this order.
- **Supabase transaction pooler (port 6543)** requires `ssl: { rejectUnauthorized: false }` and simple queries (no prepared statements) for health checks.
- **DB passwords with special characters** — use individual DB params (`DB_HOST`, `DB_USER`, etc.) instead of `DATABASE_URL` to avoid URL-encoding issues.
- **`set_tenant_context()`** must be called inside BEGIN for RLS to work correctly with PgBouncer transaction mode.

# CLAUDE.md — VaNiBase Framework
## What is this repo?
VaNi Product Framework — the shared foundation for building agent-powered multi-tenant SaaS products. This repo is consumed as a **git submodule** by product repos (KI-Prime, KaalaDristi, ContractNest).
## Architecture
- **Agent-Shell pattern**: LFM2 (self-hosted LLM) handles reasoning → Skills handle computation → Recipes define UI → Shell renders components
- **5 layers**: Channel Gateway → Tenant Context Builder → VaNi Engine (LFM2) → Skill Executor → Data Layer
- **Multi-tenancy**: Stateless LLM, tenant context injected per request from JWT, 3-layer isolation (context injection, executor enforcement, PostgreSQL RLS)
## Repo structure
```
framework/          — Express API server, auth, context builder, skill executor, VaNi engine, escalation, memory, queue
shell/              — Next.js 14 app, 19 VDF components, recipe renderer, 6 themes, light/dark mode
shared/             — TypeScript interfaces, constants
migrations/         — VN_ prefixed framework tables (tenants, users, conversations, memory, logs)
skills/             — Demo skill only (products provide their own skills)
recipes/            — Demo recipes only
seeds/              — Demo seed data
```
## Table naming convention
- `VN_` prefix for all framework tables
- Products use their own prefix: `KI_` (KI-Prime), `KD_` (KaalaDristi)
## Key technical decisions
- Self-hosted Liquid AI LFM2-2.6B via vLLM (zero per-request cost)
- VANI_MOCK=true for development (keyword-based intent, no LLM needed)
- Supabase for auth, raw PostgreSQL (via pooler port 6543) for skill data
- Redis for rate limiting, BullMQ for async jobs
- Connection pooling: pg Pool max=20, ssl rejectUnauthorized=false
- Individual DB params (DB_HOST, DB_USER, DB_PASSWORD) instead of DATABASE_URL to avoid URL encoding issues with special characters in passwords
## Scalability layer (built in)
- Connection pooling with set_tenant_context() on each checkout
- DB transactions: ctx.db.transaction(async tx => {...})
- Race condition protection: ctx.db.queryForUpdate(), updateWithVersion()
- Rate limiting: Redis counters per tenant/day, tier-aware
- Async jobs: ctx.enqueue() → BullMQ
- Memory store backed by vn_conversation_turns + pgvector
- Prometheus /metrics endpoint
## Rules for Claude Code
1. This is a FRAMEWORK repo. Changes here affect ALL products.
2. Every change must be backward compatible — don't break existing product integrations.
3. All framework tables use VN_ prefix.
4. RLS is disabled on vn_tenants and vn_users (needed for pre-auth lookup). All other tables have RLS enabled.
5. Never hardcode product-specific logic. Use configuration and extension points.
6. VDF components must work in all 6 themes × light/dark mode. Use CSS variables, never hardcoded colors.
7. The LLM never generates UI markup. Skills return recipe name + data. Shell renders.
8. Test with the demo-skill before pushing. Run: npm run dev with VANI_MOCK=true.
## Endpoints
- GET /health — basic health check
- GET /health/ready — deep check (DB + Redis + vLLM)
- GET /metrics — Prometheus scrape target
- POST /api/v1/chat — VaNi chat (auth required)
- POST /api/v1/skills/:skillName/:functionName — direct skill execution (auth required)
- GET /api/v1/recipes — list all recipes
- GET /api/v1/recipes/:name — get recipe definition
- GET /api/v1/jobs/:id — async job status
## Git workflow
- Products consume this via git submodule
- Push to main only after testing
- Claude Code branches: merge to main before pushing
- Products pull updates with: git submodule update --remote
## Lessons Learned
- **DB query() and queryOne() return `{ rows: T[] }`** to match pg native format. All skill authors expect this shape. Do NOT return bare `T[]` or `T | null`.
- **SkillContext exposes both `tenantId` and `tenant_id`** for compatibility. Framework code uses camelCase (`tenantId`), product skills may use snake_case (`tenant_id`). Both point to the same value.
- **Skill handlers are called as `handler(params, ctx)`** — params first, context second. Product skills are written as `async function get_clients(params, ctx)`. The executor must match this order.
- **Supabase transaction pooler (port 6543)** requires `ssl: { rejectUnauthorized: false }` and simple queries (no prepared statements) for health checks.
- **DB passwords with special characters** — use individual DB params (`DB_HOST`, `DB_USER`, etc.) instead of `DATABASE_URL` to avoid URL-encoding issues.
- **`set_tenant_context()`** must be called inside BEGIN for RLS to work correctly with PgBouncer transaction mode.

# VaNi Framework — E2E Testing Guide

This guide walks through running the full VaNi pipeline end-to-end: **chat input → VaNi engine → skill execution → recipe + data → shell render**.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local dev without Docker)

## Quick Start (Docker Compose)

```bash
# Start postgres, redis, api, shell (no GPU needed — mock VaNi mode)
docker compose up

# In another terminal, seed the demo data
docker compose exec postgres psql -U vani -d vani -f /seeds/demo-seed.sql
```

Services:
| Service  | URL                        | Notes                    |
|----------|----------------------------|--------------------------|
| API      | http://localhost:3001      | Express framework server |
| Shell    | http://localhost:3000      | Next.js UI               |
| Postgres | localhost:5432             | pgvector/pg16            |
| Redis    | localhost:6379             | Rate limiting + BullMQ   |

## Quick Start (Local, no Docker)

```bash
# No Postgres or Redis required — uses stub DB and mock VaNi
VANI_MOCK=true VLLM_ENDPOINT=mock REDIS_URL="" DATABASE_URL="" \
  npx tsx framework/server.ts
```

## Seed Data

The seed script creates:

| Entity           | ID                                     |
|------------------|----------------------------------------|
| Tenant           | `a0000000-0000-0000-0000-000000000001` |
| User             | `b0000000-0000-0000-0000-000000000001` |

Tenant: **Demo Distributor** (professional tier)
User: **Dev Admin** (admin role)

To seed manually:
```bash
psql $DATABASE_URL -f seeds/demo-seed.sql
```

## Test the Chat Pipeline

The dev auth bypass accepts `X-Dev-Tenant-Id` and `X-Dev-User-Id` headers when `JWT_SECRET` is not set.

### 1. Greeting (triggers `demo-skill.get_greeting`)

```bash
curl -s -X POST http://localhost:3001/api/v1/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Dev-Tenant-Id: a0000000-0000-0000-0000-000000000001' \
  -H 'X-Dev-User-Id: b0000000-0000-0000-0000-000000000001' \
  -d '{"message": "hello Kamal"}'
```

**Expected response:**
```json
{
  "reply": "",
  "recipe": "demo-dashboard",
  "data": {
    "message": "Hello kamal! Welcome to VaNi.",
    "tenant_name": "Demo Distributor",
    "timestamp": "2026-03-20T...",
    "greeting_for": "kamal"
  },
  "skill_calls": [
    { "skill": "demo-skill", "function": "get_greeting" }
  ],
  "escalated": false
}
```

### 2. System Stats (triggers `demo-skill.get_stats`)

```bash
curl -s -X POST http://localhost:3001/api/v1/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Dev-Tenant-Id: a0000000-0000-0000-0000-000000000001' \
  -H 'X-Dev-User-Id: b0000000-0000-0000-0000-000000000001' \
  -d '{"message": "show me system stats"}'
```

**Expected response:**
```json
{
  "reply": "",
  "recipe": "demo-dashboard",
  "data": {
    "tenant_name": "Demo Distributor",
    "uptime_seconds": 42,
    "uptime_display": "42s",
    "node_version": "v22.x.x",
    "memory_mb": 25
  },
  "skill_calls": [
    { "skill": "demo-skill", "function": "get_stats" }
  ],
  "escalated": false
}
```

### 3. Generic Question (no skill match, mock mode reply)

```bash
curl -s -X POST http://localhost:3001/api/v1/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Dev-Tenant-Id: a0000000-0000-0000-0000-000000000001' \
  -H 'X-Dev-User-Id: b0000000-0000-0000-0000-000000000001' \
  -d '{"message": "what is a mutual fund?"}'
```

**Expected response:**
```json
{
  "reply": "I understood your message: \"what is a mutual fund?\". In production, VaNi (LFM2) would classify your intent and call the appropriate skill. Currently running in mock mode.",
  "skill_calls": [],
  "escalated": false
}
```

## Verify Infrastructure Endpoints

### Health (liveness)
```bash
curl http://localhost:3001/health
# → {"status":"ok","service":"vani-framework","version":"0.1.0",...}
```

### Readiness (deep check: DB + Redis + vLLM)
```bash
curl http://localhost:3001/health/ready
# → {"status":"ready","checks":{"postgres":true,"redis":true,"vllm":false},...}
# (vllm=false is expected without GPU profile)
```

### Prometheus Metrics
```bash
curl http://localhost:3001/metrics
# → vani_http_request_duration_seconds_bucket{...}
# → vani_skill_executions_total{...}
# → vani_queue_depth ...
```

### Registered Recipes
```bash
curl http://localhost:3001/api/v1/recipes
# → [{"name":"demo-dashboard","title":"Demo Dashboard","layout":"dashboard-3row"}]
```

## View the Shell

Open http://localhost:3000 in a browser. The shell renders VDF components based on the recipe and data returned by the API.

## Mock VaNi Mode

When `VANI_MOCK=true` or `VLLM_ENDPOINT=mock`, the VaNi engine uses keyword-based intent classification instead of LFM2:

| Keywords                                      | Skill Call              |
|-----------------------------------------------|-------------------------|
| hello, hi, hey, greet, namaste, good morning  | `demo-skill.get_greeting` |
| stats, status, uptime, health, system, info   | `demo-skill.get_stats`    |
| (anything else)                               | Generic reply (no skill)  |

To switch to real LFM2, set `VLLM_ENDPOINT=http://vllm:8000/v1` and start with `--profile gpu`.

## What This Tests

The E2E flow exercises every framework layer:

1. **Auth** — Dev bypass via X-Dev-* headers
2. **Tenant Context** — Tenant ID extracted and passed through
3. **Rate Limiting** — Counter incremented (requires Redis)
4. **Mock VaNi** — Keyword intent classification
5. **Skill Registry** — Tool definitions built for tier
6. **Skill Executor** — Handler invoked inside transaction wrapper
7. **Demo Skill** — Queries DB (or stub), returns data
8. **Recipe** — `demo-dashboard` recipe returned in response
9. **Memory** — Conversation turns saved (requires Postgres)
10. **Metrics** — Prometheus counters updated
11. **Escalation** — Would trigger if confidence < 0.6 (not in demo)

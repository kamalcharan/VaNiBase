/**
 * VaNi Product Framework — Express API Server
 * Phase 1 (F-08/F-16) + Scalability layer (S-01 through S-07)
 *
 * Startup:
 * 1. Load config
 * 2. Initialize infrastructure (DB pool, Redis, BullMQ)
 * 3. Create Orchestrator + boot skills/recipes
 * 4. Mount middleware pipeline
 * 5. Start listening
 */

import 'dotenv/config';
import express from 'express';
import { loadConfig } from './config.js';
import { initPool } from './db/index.js';
import { initRedis } from './redis/index.js';
import { initQueue, startWorker } from './queue/index.js';
import { healthRouter } from './routes/health.js';
import { createChatRouter } from './routes/chat.js';
import { createRecipesRouter } from './routes/recipes.js';
import { jobsRouter } from './routes/jobs.js';
import { authMiddleware } from './gateway/auth.js';
import { tenantContext } from './gateway/tenant-context.js';
import { rateLimitMiddleware } from './middleware/rate-limiter.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { metricsMiddleware, metricsRouter } from './middleware/metrics.js';
import { Orchestrator } from './orchestrator.js';
import { boot } from './boot.js';

async function main() {
  const config = loadConfig();

  // --- Log masked DATABASE_URL so we can verify .env is loaded ---
  if (config.databaseUrl) {
    const masked = config.databaseUrl.replace(/:([^@]+)@/, ':****@');
    console.info(`[VaNi] DATABASE_URL = ${masked}`);
  } else {
    console.warn('[VaNi] DATABASE_URL is empty — running without Postgres');
  }

  // --- Initialize Infrastructure ---
  if (config.databaseUrl) {
    initPool(config.databaseUrl);

    // Startup DB connection test — log full error if it fails
    try {
      const { getPool } = await import('./db/index.js');
      const pool = getPool();
      const result = await pool.query('SELECT 1 AS ok');
      console.info(`[VaNi] DB startup check passed: ${JSON.stringify(result.rows[0])}`);
    } catch (err) {
      console.error('[VaNi] DB startup check FAILED:', err);
    }
  }

  // Redis + Queue: only init if a valid redis:// URL is provided and reachable
  if (config.redisUrl && config.redisUrl.startsWith('redis://')) {
    try {
      const redis = initRedis(config.redisUrl);
      await Promise.race([
        redis.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      initQueue();
      startWorker();
      console.info('[VaNi] Redis + Queue ready');
    } catch (err) {
      // Disconnect the failed Redis client to suppress reconnect spam
      try { (await import('./redis/index.js')).closeRedis(); } catch { /* ignore */ }
      console.warn('[VaNi] Redis/Queue unavailable — rate limiting and async jobs disabled:', (err as Error).message);
    }
  }

  // --- Express App ---
  const app = express();

  // --- Orchestrator (owns all framework layers) ---
  const orchestrator = new Orchestrator();

  // --- Boot: register skills, recipes, job handlers ---
  boot(orchestrator);

  // --- Core Middleware ---
  app.use(express.json());
  app.use(metricsMiddleware);
  app.use(requestLogger);

  // --- Public Routes (no auth) ---
  app.use(healthRouter);
  app.use(metricsRouter);
  app.use('/api/v1', createRecipesRouter(orchestrator.recipeRegistry));

  // --- Protected Routes (auth required) ---
  const protectedRouter = express.Router();
  protectedRouter.use(authMiddleware);
  protectedRouter.use(tenantContext);
  protectedRouter.use(rateLimitMiddleware);
  protectedRouter.use(createChatRouter(orchestrator));
  protectedRouter.use(jobsRouter);
  app.use('/api/v1', protectedRouter);

  // --- Error Handler (must be last) ---
  app.use(errorHandler);

  app.listen(config.port, () => {
    console.info(`[VaNi] Framework server running on port ${config.port} (${config.nodeEnv})`);
    console.info(`[VaNi] Health:   http://localhost:${config.port}/health`);
    console.info(`[VaNi] Ready:    http://localhost:${config.port}/health/ready`);
    console.info(`[VaNi] Metrics:  http://localhost:${config.port}/metrics`);
    console.info(`[VaNi] Chat:     POST http://localhost:${config.port}/api/v1/chat`);
  });

  return { app, orchestrator };
}

let app: ReturnType<typeof express>;
let orchestrator: Orchestrator;

main().then((result) => {
  app = result.app;
  orchestrator = result.orchestrator;
});

export { app, orchestrator };

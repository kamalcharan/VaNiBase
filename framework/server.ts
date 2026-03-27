/**
 * VaNi Framework — Generic Server Entry Point
 *
 * This is the framework's standalone server for development and testing.
 * Products (KI-Prime, KaalaDristi) import the framework as a submodule
 * and have their own entry points that wire in product-specific skills.
 *
 * Usage:
 *   VANI_MOCK=true npx tsx framework/server.ts
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';
import { Orchestrator } from './orchestrator.js';
import { boot } from './boot.js';
import { initPools, closeAll } from './db/index.js';
import { initRedis, closeRedis } from './redis/index.js';
import { initQueue, startWorker } from './queue/index.js';
import { healthRouter } from './routes/health.js';
import { createChatRouter } from './routes/chat.js';
import { createRecipesRouter } from './routes/recipes.js';
import { registerSkillsRoute } from './routes/skills.js';
import { jobsRouter } from './routes/jobs.js';
import { createAuthRouter } from './routes/auth.js';
import { authMiddleware } from './gateway/auth.js';
import { tenantContext } from './gateway/tenant-context.js';
import { rateLimitMiddleware } from './middleware/rate-limiter.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { metricsMiddleware, metricsRouter } from './middleware/metrics.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const port = config.port;

  console.log(`[VaNi] Starting framework server (${config.nodeEnv})`);

  // --- Infrastructure: Database ---
  await initPools(); // reads DB_PRIMARY / DATABASE_URL / DB_HOST from env

  if (config.redisUrl && config.redisUrl.startsWith('redis://')) {
    try {
      const redis = initRedis(config.redisUrl);
      await Promise.race([
        redis.connect().then(() => redis.ping()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      initQueue();
      startWorker();
      console.log('[VaNi] Redis + Queue ready');
    } catch (err) {
      try { closeRedis(); } catch { /* ignore */ }
      console.warn('[VaNi] Redis unavailable:', (err as Error).message);
    }
  } else {
    console.log('[VaNi] Redis not configured — rate limiting and queue disabled');
  }

  // --- Orchestrator ---
  const orchestrator = new Orchestrator();
  boot(orchestrator);

  // --- Express Server ---
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Dev-Tenant-Id', 'X-Dev-User-Id'],
  }));
  app.use(express.json());
  app.use(metricsMiddleware);
  app.use(requestLogger);

  // Public routes
  app.use(healthRouter);
  app.use(metricsRouter);
  app.use('/api/v1', createRecipesRouter(orchestrator.recipeRegistry));
  app.use('/api/v1/auth', createAuthRouter());

  // Protected routes
  const protectedRouter = express.Router();
  protectedRouter.use(authMiddleware);
  protectedRouter.use(tenantContext);
  protectedRouter.use(rateLimitMiddleware);
  protectedRouter.use('/chat', createChatRouter(orchestrator));
  registerSkillsRoute(protectedRouter, orchestrator);
  protectedRouter.use(jobsRouter);
  app.use('/api/v1', protectedRouter);

  app.use(errorHandler);

  const server = app.listen(port, () => {
    console.log(`[VaNi] Server running on port ${port}`);
    console.log(`[VaNi] Health:   http://localhost:${port}/health`);
    console.log(`[VaNi] Chat:     POST http://localhost:${port}/api/v1/chat`);
    console.log(`[VaNi] Skills:   POST http://localhost:${port}/api/v1/skills/:skill/:function`);
    console.log(`[VaNi] Recipes:  GET http://localhost:${port}/api/v1/recipes`);
    console.log(`[VaNi] Auth:     POST http://localhost:${port}/api/v1/auth/register|login|refresh|logout`);
    console.log(`[VaNi] Mock mode: ${orchestrator.mockMode ? 'ON' : 'OFF'}`);
  });

  const shutdown = async () => {
    console.log('\n[VaNi] Shutting down...');
    await closeAll();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => { shutdown(); });
  process.on('SIGTERM', () => { shutdown(); });
}

main().catch((err) => {
  console.error('[VaNi] Failed to start:', err);
  process.exit(1);
});

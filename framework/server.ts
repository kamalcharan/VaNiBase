/**
 * VaNi Product Framework — Express API Server
 * Phase 1 (F-08/F-16) + Scalability layer (S-01 through S-07)
 *
 * Startup:
 * 1. Load config
 * 2. Initialize infrastructure (DB pool, Redis, BullMQ)
 * 3. Create Orchestrator
 * 4. Mount middleware pipeline
 * 5. Start listening
 */

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

const config = loadConfig();

// --- Initialize Infrastructure ---
if (config.databaseUrl) {
  initPool(config.databaseUrl);
}

if (config.redisUrl) {
  initRedis(config.redisUrl);
  try {
    initQueue();
    startWorker();
  } catch (err) {
    console.warn('[VaNi] Queue init skipped (Redis may not be available):', (err as Error).message);
  }
}

// --- Express App ---
const app = express();

// --- Orchestrator (owns all framework layers) ---
const orchestrator = new Orchestrator();

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

export { app, orchestrator };

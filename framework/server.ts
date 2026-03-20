/**
 * VaNi Product Framework — Express API Server
 * Tasks: F-08 (base), F-16 (full wiring)
 *
 * This is the main entry point. It:
 * 1. Loads config
 * 2. Creates the Orchestrator (which owns all registries)
 * 3. Mounts middleware: logger → auth → tenant context → routes
 * 4. Starts listening
 */

import express from 'express';
import { loadConfig } from './config.js';
import { healthRouter } from './routes/health.js';
import { createChatRouter } from './routes/chat.js';
import { createRecipesRouter } from './routes/recipes.js';
import { authMiddleware } from './gateway/auth.js';
import { tenantContext } from './gateway/tenant-context.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { Orchestrator } from './orchestrator.js';

const config = loadConfig();
const app = express();

// --- Orchestrator (owns all framework layers) ---
const orchestrator = new Orchestrator();

// --- Core Middleware ---
app.use(express.json());
app.use(requestLogger);

// --- Public Routes (no auth) ---
app.use(healthRouter);
app.use('/api/v1', createRecipesRouter(orchestrator.recipeRegistry));

// --- Protected Routes (auth required) ---
const protectedRouter = express.Router();
protectedRouter.use(authMiddleware);
protectedRouter.use(tenantContext);
protectedRouter.use(createChatRouter(orchestrator));
app.use('/api/v1', protectedRouter);

// --- Error Handler (must be last) ---
app.use(errorHandler);

app.listen(config.port, () => {
  console.info(`[VaNi] Framework server running on port ${config.port} (${config.nodeEnv})`);
  console.info(`[VaNi] Health: http://localhost:${config.port}/health`);
  console.info(`[VaNi] Chat:   POST http://localhost:${config.port}/api/v1/chat`);
});

export { app, orchestrator };

/**
 * Health Check Endpoints
 * GET /health — basic liveness check
 * GET /health/ready — deep readiness check (DB + Redis + vLLM)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { loadConfig } from '../config.js';
import { checkPoolHealth } from '../db/index.js';
import { checkRedisHealth } from '../redis/index.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const config = loadConfig();
  res.json({
    status: 'ok',
    service: 'vani-framework',
    version: '0.1.0',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/health/ready', async (_req: Request, res: Response) => {
  const config = loadConfig();
  const checks: Record<string, boolean> = {};

  // DB check
  checks.postgres = await checkPoolHealth();

  // Redis check
  checks.redis = await checkRedisHealth();

  // vLLM check
  try {
    const vllmRes = await fetch(`${config.vllmEndpoint.replace('/v1', '')}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    checks.vllm = vllmRes.ok;
  } catch {
    checks.vllm = false;
  }

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

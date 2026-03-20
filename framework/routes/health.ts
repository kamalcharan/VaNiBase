/**
 * Health Check Endpoint
 * Task: F-08 | GET /health
 *
 * Docker and load balancers hit this to verify the service is up.
 * Returns uptime, environment, and timestamp.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { loadConfig } from '../config.js';

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

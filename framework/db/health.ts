/**
 * DB Layer — Health Endpoint Handler
 * Integrates with /health/ready. Returns per-pool breakdown.
 */

import type { Request, Response } from 'express';
import { healthCheck } from './factory.js';

/**
 * Express handler for the DB portion of /health/ready.
 * Returns 200 if all pools healthy, 503 if any unhealthy.
 */
export async function dbHealthHandler(_req: Request, res: Response): Promise<void> {
  const report = await healthCheck();
  const statusCode = report.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(report);
}

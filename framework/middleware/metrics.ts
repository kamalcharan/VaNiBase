/**
 * Prometheus Metrics + Request Timing Middleware
 * S-07: Monitoring hooks
 *
 * Exposes /metrics in Prometheus text format.
 * Tracks: request count, latency histogram, error rate, queue depth, skill execution.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// --- Register default metrics (event loop lag, heap, GC, etc.) ---
client.collectDefaultMetrics({ prefix: 'vani_' });

// --- Custom Metrics ---

export const httpRequestDuration = new client.Histogram({
  name: 'vani_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestTotal = new client.Counter({
  name: 'vani_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

export const httpErrorTotal = new client.Counter({
  name: 'vani_http_errors_total',
  help: 'Total number of HTTP errors (4xx + 5xx)',
  labelNames: ['method', 'path', 'status'],
});

export const skillExecutionDuration = new client.Histogram({
  name: 'vani_skill_execution_duration_seconds',
  help: 'Skill function execution duration in seconds',
  labelNames: ['skill', 'function', 'success'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});

export const skillExecutionTotal = new client.Counter({
  name: 'vani_skill_executions_total',
  help: 'Total number of skill executions',
  labelNames: ['skill', 'function', 'success'],
});

export const skillErrorTotal = new client.Counter({
  name: 'vani_skill_errors_total',
  help: 'Total number of skill execution errors',
  labelNames: ['skill', 'function'],
});

export const queueDepthGauge = new client.Gauge({
  name: 'vani_queue_depth',
  help: 'Number of pending + active + delayed jobs in the queue',
});

export const escalationTotal = new client.Counter({
  name: 'vani_escalations_total',
  help: 'Total number of Claude API escalations',
  labelNames: ['tenant_id'],
});

/**
 * Middleware: track request timing and counts.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationS = durationNs / 1e9;
    const path = normalizePath(req.route?.path || req.path);
    const labels = {
      method: req.method,
      path,
      status: String(res.statusCode),
    };

    httpRequestDuration.observe(labels, durationS);
    httpRequestTotal.inc(labels);

    if (res.statusCode >= 400) {
      httpErrorTotal.inc(labels);
    }
  });

  next();
}

/**
 * Normalize path to avoid high-cardinality labels.
 * E.g., /api/v1/jobs/abc123 → /api/v1/jobs/:id
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Prometheus /metrics endpoint.
 */
export const metricsRouter = Router();

metricsRouter.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

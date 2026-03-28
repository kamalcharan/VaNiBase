/**
 * Global error handler middleware
 *
 * Maps AppError subclasses to appropriate HTTP status codes and logs
 * all errors via the error-logger service before responding.
 */

import type { Request, Response, NextFunction } from 'express';
import type { APIError } from '../../shared/types/index.js';
import { AppError } from '../errors/index.js';
import { logError } from '../services/error-logger.js';

export function errorHandler(
  err: Error & { status?: number; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;

  const status = isAppError ? err.status : (err.status || 500);
  const code = isAppError ? err.code : (err.code || 'INTERNAL_ERROR');
  const details = isAppError ? err.details : undefined;

  const severity = status >= 500 ? 'critical' : 'error';

  // Log before responding — fire-and-forget (logError never throws)
  logError({
    tenant_id: req.auth?.tenant_id,
    user_id: req.auth?.sub,
    error_code: code,
    message: err.message || 'Internal Server Error',
    stack: err.stack,
    endpoint: req.originalUrl,
    method: req.method,
    severity,
  });

  const response: APIError = {
    error: status >= 500 ? 'Internal Server Error' : err.message,
    code,
    status,
    ...(details && { details }),
  };

  res.status(status).json(response);
}

/**
 * Global error handler middleware
 */

import type { Request, Response, NextFunction } from 'express';
import type { APIError } from '../../shared/types/index.js';

export function errorHandler(
  err: Error & { status?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[Error] ${err.message}`, err.stack);

  const status = err.status || 500;
  const response: APIError = {
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    status,
  };

  res.status(status).json(response);
}

/**
 * Simple request logger middleware
 */

import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.info(`[${req.method}] ${req.path} → ${_res.statusCode} (${duration}ms)`);
  });
  next();
}

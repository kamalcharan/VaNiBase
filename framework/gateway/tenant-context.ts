/**
 * Tenant Context Middleware — Sets tenant scope from JWT payload
 * Task: F-09
 *
 * After authMiddleware runs, this middleware ensures req.auth.tenant_id
 * is available and could (in the future) set the PostgreSQL session variable
 * for RLS: SET app.tenant_id = '<tenant_id>'.
 */

import type { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS, ERROR_CODES } from '../../shared/constants/index.js';

export function tenantContext(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth?.tenant_id) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Tenant context missing from auth token',
      code: ERROR_CODES.TENANT_NOT_FOUND,
      status: HTTP_STATUS.UNAUTHORIZED,
    });
    return;
  }

  // Future: set PostgreSQL session variable for RLS
  // await db.query("SELECT set_tenant_context($1)", [req.auth.tenant_id]);

  next();
}

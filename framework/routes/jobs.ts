/**
 * Jobs Route — /api/v1/jobs/:id
 * Check async job status.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getJobStatus } from '../queue/index.js';
import { HTTP_STATUS } from '../../shared/constants/index.js';

export const jobsRouter = Router();

jobsRouter.get('/jobs/:id', async (req: Request, res: Response) => {
  const job = await getJobStatus(req.params.id as string);
  if (!job) {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Job not found',
      code: 'JOB_NOT_FOUND',
      status: HTTP_STATUS.NOT_FOUND,
    });
    return;
  }
  res.json(job);
});

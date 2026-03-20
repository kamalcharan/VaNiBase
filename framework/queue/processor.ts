/**
 * Queue System — BullMQ job processor and dispatcher
 * S-05: Queue system
 *
 * Skills dispatch async work via ctx.enqueue(jobType, payload).
 * Job processors are registered at startup.
 */

import { Queue, Worker, type Job } from 'bullmq';
import { getRedis } from '../redis/index.js';

const QUEUE_NAME = 'vani-jobs';

let queue: Queue | null = null;
let worker: Worker | null = null;

/** Job handler function — product authors implement these */
export type JobHandler = (job: Job) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function initQueue(): Queue {
  if (queue) return queue;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connection = getRedis().duplicate() as any;

  queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 }, // Keep completed jobs for 24h
      removeOnFail: false,              // Keep failed jobs for inspection
    },
  });

  console.info('[Queue] Initialized');
  return queue;
}

export function getQueue(): Queue {
  if (!queue) throw new Error('Queue not initialized — call initQueue() first');
  return queue;
}

/**
 * Register a job handler for a specific job type.
 */
export function registerJobHandler(jobType: string, handler: JobHandler): void {
  handlers.set(jobType, handler);
  console.info(`[Queue] Registered handler: ${jobType}`);
}

/**
 * Start the worker that processes jobs.
 */
export function startWorker(): Worker {
  if (worker) return worker;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connection = getRedis().duplicate() as any;

  worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const handler = handlers.get(job.name);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.name}`);
      }
      console.info(`[Queue] Processing job ${job.id} (${job.name})`);
      await handler(job);
      console.info(`[Queue] Completed job ${job.id} (${job.name})`);
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Queue] Worker error:', err.message);
  });

  console.info('[Queue] Worker started');
  return worker;
}

/**
 * Enqueue a job — called by ctx.enqueue() in SkillContext.
 * Returns the job ID.
 */
export async function enqueueJob(
  jobType: string,
  payload: Record<string, unknown>
): Promise<string> {
  const q = getQueue();
  const job = await q.add(jobType, payload);
  console.info(`[Queue] Enqueued job ${job.id} (${jobType})`);
  return job.id!;
}

/**
 * Get job status by ID.
 */
export async function getJobStatus(jobId: string): Promise<{
  id: string;
  name: string;
  status: string;
  progress: number;
  data: unknown;
  result: unknown;
  failedReason?: string;
  attemptsMade: number;
  timestamp: number;
} | null> {
  const q = getQueue();
  const job = await q.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  return {
    id: job.id!,
    name: job.name,
    status: state,
    progress: job.progress as number,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
  };
}

export async function getQueueDepth(): Promise<number> {
  const q = getQueue();
  const counts = await q.getJobCounts('waiting', 'active', 'delayed');
  return counts.waiting + counts.active + counts.delayed;
}

export async function closeQueue(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
  console.info('[Queue] Closed');
}

/**
 * Rate Limiter Middleware — Per-tenant, tier-aware, Redis-backed
 * S-04: Rate limiting
 *
 * Tracks two counters per tenant per day:
 * - vani:{tenant_id}:{date} — VaNi interaction count
 * - escalation:{tenant_id}:{date} — Claude escalation count
 *
 * Keys expire at midnight IST (UTC+5:30).
 */

import type { Request, Response, NextFunction } from 'express';
import { getRedis } from '../redis/index.js';
import { RATE_LIMITS, HTTP_STATUS, ERROR_CODES } from '../../shared/constants/index.js';
import type { SubscriptionTier } from '../../shared/types/index.js';

function getISTDateKey(): string {
  // Current time in IST
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getSecondsUntilMidnightIST(): number {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const midnightIST = new Date(ist);
  midnightIST.setUTCHours(18, 30, 0, 0); // Midnight IST = 18:30 UTC
  if (midnightIST <= now) {
    midnightIST.setUTCDate(midnightIST.getUTCDate() + 1);
  }
  return Math.ceil((midnightIST.getTime() - now.getTime()) / 1000);
}

export async function incrementVaniCounter(tenantId: string): Promise<number> {
  const redis = getRedis();
  const key = `vani:${tenantId}:${getISTDateKey()}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, getSecondsUntilMidnightIST());
  }
  return count;
}

export async function incrementEscalationCounter(tenantId: string): Promise<number> {
  const redis = getRedis();
  const key = `escalation:${tenantId}:${getISTDateKey()}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, getSecondsUntilMidnightIST());
  }
  return count;
}

export async function getVaniCount(tenantId: string): Promise<number> {
  const redis = getRedis();
  const val = await redis.get(`vani:${tenantId}:${getISTDateKey()}`);
  return val ? parseInt(val, 10) : 0;
}

export async function getEscalationCount(tenantId: string): Promise<number> {
  const redis = getRedis();
  const val = await redis.get(`escalation:${tenantId}:${getISTDateKey()}`);
  return val ? parseInt(val, 10) : 0;
}

/**
 * Check if the tenant can escalate to Claude (checks tier limit).
 */
export async function canEscalate(tenantId: string, tier: SubscriptionTier): Promise<boolean> {
  const limits = RATE_LIMITS[tier];
  if (limits.claudeEscalations === Infinity) return true;
  const count = await getEscalationCount(tenantId);
  return count < limits.claudeEscalations;
}

/**
 * Express middleware: check VaNi interaction rate limit before processing.
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    next();
    return;
  }

  const tier = req.auth.tier as SubscriptionTier;
  const tenantId = req.auth.tenant_id;
  const limits = RATE_LIMITS[tier];

  if (!limits || limits.vaniInteractions === Infinity) {
    next();
    return;
  }

  getVaniCount(tenantId)
    .then((count) => {
      if (count >= limits.vaniInteractions) {
        const retryAfter = getSecondsUntilMidnightIST();
        res.set('Retry-After', String(retryAfter));
        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          error: `Daily interaction limit reached (${limits.vaniInteractions} for ${tier} tier)`,
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          details: { limit: limits.vaniInteractions, used: count, retryAfterSeconds: retryAfter },
        });
        return;
      }
      next();
    })
    .catch((err) => {
      // If Redis is down, allow the request (fail open)
      console.error('[RateLimiter] Redis error, failing open:', err.message);
      next();
    });
}

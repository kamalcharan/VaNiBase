/**
 * Redis Client — Shared ioredis instance for rate limiting, caching, BullMQ
 */

import Redis from 'ioredis';

let redis: Redis | null = null;

export function initRedis(redisUrl: string): Redis {
  if (redis) return redis;

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) return null; // Stop retrying after 3 attempts
      return Math.min(times * 500, 2000);
    },
  });

  redis.on('error', (err) => {
    if (err.message) console.error('[Redis] Connection error:', err.message);
  });

  redis.on('connect', () => {
    console.info('[Redis] Connected');
  });

  return redis;
}

export function getRedis(): Redis {
  if (!redis) throw new Error('Redis not initialized — call initRedis() first');
  return redis;
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const r = getRedis();
    const pong = await r.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.info('[Redis] Closed');
  }
}

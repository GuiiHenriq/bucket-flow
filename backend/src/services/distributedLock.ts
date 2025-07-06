import redisClient from '../config/redis';
import { nanoid as nanoidOriginal } from 'nanoid/non-secure';

const nanoid = () => nanoidOriginal(10);

const LOCK_PREFIX = 'lock:';
const DEFAULT_TTL = 30000;
const DEFAULT_RETRY_COUNT = 5;
const DEFAULT_RETRY_DELAY = 200;

export interface LockOptions {
  ttl?: number;
  retryCount?: number;
  retryDelay?: number;
}

export const acquireLock = async (
  resource: string,
  options: LockOptions = {}
): Promise<string | null> => {
  const lockKey = `${LOCK_PREFIX}${resource}`;
  const lockId = nanoid();
  const ttl = options.ttl || DEFAULT_TTL;
  const retryCount = options.retryCount || DEFAULT_RETRY_COUNT;
  const retryDelay = options.retryDelay || DEFAULT_RETRY_DELAY;

  for (let i = 0; i <= retryCount; i++) {
    const acquired = await redisClient.set(lockKey, lockId, 'PX', ttl, 'NX');
    
    if (acquired === 'OK') {
      return lockId;
    }
    
    if (i < retryCount) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return null;
};

export const releaseLock = async (
  resource: string,
  lockId: string
): Promise<boolean> => {
  const lockKey = `${LOCK_PREFIX}${resource}`;
  
  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
  
  const result = await redisClient.eval(script, 1, lockKey, lockId);
  return result === 1;
};

export const withLock = async <T>(
  resource: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> => {
  const lockId = await acquireLock(resource, options);
  
  if (!lockId) {
    throw new Error(`Failed to acquire lock for resource: ${resource}`);
  }
  
  try {
    return await fn();
  } finally {
    await releaseLock(resource, lockId);
  }
}; 
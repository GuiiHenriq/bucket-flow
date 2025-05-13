import redisClient from '../config/redis';
import { nanoid as nanoidOriginal } from 'nanoid/non-secure';

const nanoid = () => nanoidOriginal(10);

const LOCK_PREFIX = 'lock:';
const DEFAULT_TTL = 30000; // 30 seconds in milliseconds
const DEFAULT_RETRY_COUNT = 5;
const DEFAULT_RETRY_DELAY = 200; // milliseconds

export interface LockOptions {
  /**
   * Time-to-live in milliseconds
   */
  ttl?: number;
  /**
   * Number of retry attempts
   */
  retryCount?: number;
  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;
}

/**
 * Acquires a distributed lock using Redis
 * 
 * @param resource The resource identifier to lock
 * @param options Lock options
 * @returns A lock identifier if successful, null otherwise
 */
export const acquireLock = async (
  resource: string,
  options: LockOptions = {}
): Promise<string | null> => {
  const lockKey = `${LOCK_PREFIX}${resource}`;
  const lockId = nanoid();
  const ttl = options.ttl || DEFAULT_TTL;
  const retryCount = options.retryCount || DEFAULT_RETRY_COUNT;
  const retryDelay = options.retryDelay || DEFAULT_RETRY_DELAY;

  // Redis SET with NX option ensures the key is set only if it doesn't exist yet
  // This makes the lock acquisition atomic
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

/**
 * Releases a distributed lock using Redis Lua script for atomicity
 * 
 * @param resource The resource identifier to unlock
 * @param lockId The lock identifier returned by acquireLock
 * @returns true if the lock was released, false otherwise
 */
export const releaseLock = async (
  resource: string,
  lockId: string
): Promise<boolean> => {
  const lockKey = `${LOCK_PREFIX}${resource}`;
  
  // Lua script to ensure we only delete the lock if it belongs to us
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

/**
 * Executes a function with a distributed lock
 * 
 * @param resource The resource identifier to lock
 * @param fn The function to execute while holding the lock
 * @param options Lock options
 * @returns The result of the function, or throws an error if the lock couldn't be acquired
 */
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
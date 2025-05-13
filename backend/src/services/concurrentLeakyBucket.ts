import redisClient from "../config/redis";
import { withLock } from "./distributedLock";
import * as redisLeakyBucket from "./redisLeakyBucket";
import { enqueueJob, dequeueJob, completeJob } from "./redisQueue";

const BUCKET_LOCK_PREFIX = "leaky-bucket:lock:";
const BUCKET_QUEUE = "leaky-bucket-queue";

/**
 * Consumes a token from a user's bucket using distributed locks for concurrency control
 * 
 * @param userId The user ID
 * @returns True if a token was consumed, false otherwise
 */
export const safeConsumeToken = async (userId: string): Promise<boolean> => {
  // Use a distributed lock to prevent race conditions
  return withLock(
    `${BUCKET_LOCK_PREFIX}${userId}`, 
    async () => {
      return redisLeakyBucket.consumeToken(userId);
    },
    { ttl: 5000, retryCount: 3 }
  );
};

/**
 * Safely processes a query result and updates tokens
 * 
 * @param userId The user ID
 * @param success Whether the operation was successful
 */
export const safeProcessQueryResult = async (
  userId: string,
  success: boolean
): Promise<void> => {
  // For successful operations, queue the token processing to avoid blocking
  if (success) {
    await enqueueJob(BUCKET_QUEUE, "process-query-result", {
      userId,
      success,
      timestamp: Date.now()
    });
  }
};

/**
 * Worker function to process the token bucket queue
 * Meant to be run in a background process or scheduled task
 * 
 * @returns The number of processed jobs
 */
export const processTokenBucketQueue = async (): Promise<number> => {
  let processedCount = 0;
  let job;
  
  // Process up to 100 jobs per batch
  for (let i = 0; i < 100; i++) {
    job = await dequeueJob(BUCKET_QUEUE);
    
    if (!job) {
      break;
    }
    
    try {
      const { userId, success } = job.payload;
      
      if (success) {
        // Use a distributed lock to avoid race conditions
        await withLock(
          `${BUCKET_LOCK_PREFIX}${userId}`,
          async () => {
            await redisLeakyBucket.processQueryResult(userId, success);
          }
        );
      }
      
      await completeJob(BUCKET_QUEUE, job.id);
      processedCount++;
    } catch (error) {
      console.error("Error processing token bucket job:", error);
      // Job will be requeued automatically after timeout
    }
  }
  
  return processedCount;
};

/**
 * Gets the current tokens for a user using distributed locks
 * 
 * @param userId The user ID
 * @returns The token bucket data
 */
export const safeGetUserTokens = async (userId: string): Promise<redisLeakyBucket.TokenBucket> => {
  return withLock(
    `${BUCKET_LOCK_PREFIX}${userId}`,
    async () => {
      return redisLeakyBucket.getUserTokens(userId);
    }
  );
};

/**
 * Updates a user's token count using optimistic concurrency control
 * 
 * @param userId The user ID
 * @param tokenCount The new token count
 * @param maxRetries Maximum number of retries (default 3)
 */
export const updateUserTokens = async (
  userId: string,
  tokenCount: number,
  maxRetries = 3
): Promise<boolean> => {
  // Use the Redis WATCH command for optimistic concurrency control
  const bucketKey = `leaky-bucket:user:${userId}`;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await redisClient.watch(bucketKey);
      
      // Create a multi command (transaction)
      const multi = redisClient.multi();
      
      // Set the new token count
      multi.hset(bucketKey, "tokens", Math.min(tokenCount, redisLeakyBucket.MAX_TOKENS));
      
      // Execute the transaction
      await multi.exec();
      return true;
    } catch (err) {
      // If the transaction fails, retry
      if (attempt === maxRetries) {
        console.error(`Failed to update tokens for user ${userId} after ${maxRetries} attempts`);
        return false;
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
    }
  }
  
  return false;
};

/**
 * Safely initializes user tokens using distributed locks
 * 
 * @param userId The user ID
 * @returns The token bucket data
 */
export const safeInitUserTokens = async (userId: string): Promise<redisLeakyBucket.TokenBucket> => {
  return withLock(
    `${BUCKET_LOCK_PREFIX}${userId}`,
    async () => {
      return redisLeakyBucket.initUserTokens(userId);
    }
  );
}; 
import redisClient from "../config/redis";
import { withLock } from "./distributedLock";
import * as redisLeakyBucket from "./redisLeakyBucket";
import { enqueueJob, dequeueJob, completeJob } from "./redisQueue";

const BUCKET_LOCK_PREFIX = "leaky-bucket:lock:";
const BUCKET_QUEUE = "leaky-bucket-queue";

export const safeConsumeToken = async (userId: string): Promise<boolean> => {
  return withLock(
    `${BUCKET_LOCK_PREFIX}${userId}`, 
    async () => {
      return redisLeakyBucket.consumeToken(userId);
    },
    { ttl: 5000, retryCount: 3 }
  );
};

export const safeProcessQueryResult = async (
  userId: string,
  success: boolean
): Promise<void> => {
  if (success) {
    await enqueueJob(BUCKET_QUEUE, "process-query-result", {
      userId,
      success,
      timestamp: Date.now()
    });
  }
};

export const processTokenBucketQueue = async (): Promise<number> => {
  let processedCount = 0;
  let job;
  
  for (let i = 0; i < 100; i++) {
    job = await dequeueJob(BUCKET_QUEUE);
    
    if (!job) {
      break;
    }
    
    try {
      const { userId, success } = job.payload;
      
      if (success) {
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
    }
  }
  
  return processedCount;
};

export const safeGetUserTokens = async (userId: string): Promise<redisLeakyBucket.TokenBucket> => {
  return withLock(
    `${BUCKET_LOCK_PREFIX}${userId}`,
    async () => {
      return redisLeakyBucket.getUserTokens(userId);
    }
  );
};

export const updateUserTokens = async (
  userId: string,
  tokenCount: number,
  maxRetries = 3
): Promise<boolean> => {
  const bucketKey = `leaky-bucket:user:${userId}`;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await redisClient.watch(bucketKey);
      
      const multi = redisClient.multi();
      
      multi.hset(bucketKey, "tokens", Math.min(tokenCount, redisLeakyBucket.MAX_TOKENS));
      
      await multi.exec();
      return true;
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(`Failed to update tokens for user ${userId} after ${maxRetries} attempts`);
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
    }
  }
  
  return false;
};

export const safeInitUserTokens = async (userId: string): Promise<redisLeakyBucket.TokenBucket> => {
  return withLock(
    `${BUCKET_LOCK_PREFIX}${userId}`,
    async () => {
      return redisLeakyBucket.initUserTokens(userId);
    }
  );
}; 
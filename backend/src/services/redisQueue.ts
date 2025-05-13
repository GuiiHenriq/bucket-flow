import redisClient from '../config/redis';
import { nanoid as nanoidOriginal } from 'nanoid/non-secure';
import { withLock } from './distributedLock';

const nanoid = () => nanoidOriginal(10);

// Queue constants
const QUEUE_PREFIX = 'queue:';
const PROCESSING_PREFIX = 'processing:';
const DEFAULT_JOB_TIMEOUT = 60000; // 60 seconds in milliseconds

export interface JobData {
  id: string;
  type: string;
  payload: any;
  createdAt: string;
}

export interface QueueOptions {
  /**
   * Job timeout in milliseconds
   */
  jobTimeout?: number;
}

/**
 * Adds a job to the specified queue
 * 
 * @param queueName The name of the queue
 * @param jobType The type of the job
 * @param payload The job payload
 * @returns The job ID
 */
export const enqueueJob = async (
  queueName: string,
  jobType: string,
  payload: any
): Promise<string> => {
  const jobId = nanoid();
  const queueKey = `${QUEUE_PREFIX}${queueName}`;
  
  const job: JobData = {
    id: jobId,
    type: jobType,
    payload,
    createdAt: new Date().toISOString()
  };
  
  // Use a Lua script for atomicity
  const script = `
    redis.call('LPUSH', KEYS[1], ARGV[1])
    return ARGV[2]
  `;
  
  await redisClient.eval(
    script,
    1,
    queueKey,
    JSON.stringify(job),
    jobId
  );
  
  return jobId;
};

/**
 * Gets the next job from the specified queue without removing it
 * 
 * @param queueName The name of the queue
 * @returns The job data or null if the queue is empty
 */
export const peekJob = async (queueName: string): Promise<JobData | null> => {
  const queueKey = `${QUEUE_PREFIX}${queueName}`;
  const jobJson = await redisClient.lindex(queueKey, -1);
  
  if (!jobJson) {
    return null;
  }
  
  return JSON.parse(jobJson);
};

/**
 * Gets and removes the next job from the specified queue
 * 
 * @param queueName The name of the queue
 * @param options Queue options
 * @returns The job data or null if the queue is empty
 */
export const dequeueJob = async (
  queueName: string,
  options: QueueOptions = {}
): Promise<JobData | null> => {
  const queueKey = `${QUEUE_PREFIX}${queueName}`;
  const processingKey = `${PROCESSING_PREFIX}${queueName}`;
  const jobTimeout = options.jobTimeout || DEFAULT_JOB_TIMEOUT;
  
  // Use a lock to ensure only one worker processes the queue
  return withLock(`queue:${queueName}:lock`, async () => {
    // Atomic dequeue operation using Lua script
    const script = `
      local job = redis.call('RPOP', KEYS[1])
      if not job then
        return nil
      end
      redis.call('HSET', KEYS[2], ARGV[1], job)
      redis.call('PEXPIRE', KEYS[2], ARGV[2])
      return job
    `;
    
    const jobId = nanoid();
    const jobJson = await redisClient.eval(
      script,
      2,
      queueKey,
      processingKey,
      jobId,
      jobTimeout
    );
    
    if (!jobJson) {
      return null;
    }
    
    return JSON.parse(jobJson as string);
  });
};

/**
 * Marks a job as completed and removes it from the processing set
 * 
 * @param queueName The name of the queue
 * @param jobId The job ID
 */
export const completeJob = async (
  queueName: string,
  jobId: string
): Promise<void> => {
  const processingKey = `${PROCESSING_PREFIX}${queueName}`;
  await redisClient.hdel(processingKey, jobId);
};

/**
 * Returns a job to the queue if it has timed out
 * 
 * @param queueName The name of the queue
 * @returns The number of requeued jobs
 */
export const requeueTimedOutJobs = async (queueName: string): Promise<number> => {
  const queueKey = `${QUEUE_PREFIX}${queueName}`;
  const processingKey = `${PROCESSING_PREFIX}${queueName}`;
  
  // Use a lock to ensure only one process handles requeuing
  return withLock(`queue:${queueName}:requeue-lock`, async () => {
    const jobs = await redisClient.hgetall(processingKey);
    let requeuedCount = 0;
    
    for (const [jobId, jobJson] of Object.entries(jobs)) {
      try {
        const job = JSON.parse(jobJson);
        
        // Push the job back to the queue
        await redisClient.lpush(queueKey, JSON.stringify(job));
        await redisClient.hdel(processingKey, jobId);
        requeuedCount++;
      } catch (error) {
        console.error(`Error requeuing job ${jobId}:`, error);
      }
    }
    
    return requeuedCount;
  });
};

/**
 * Gets the number of jobs in the specified queue
 * 
 * @param queueName The name of the queue
 * @returns The queue length
 */
export const getQueueLength = async (queueName: string): Promise<number> => {
  const queueKey = `${QUEUE_PREFIX}${queueName}`;
  return redisClient.llen(queueKey);
};

/**
 * Gets the number of jobs being processed
 * 
 * @param queueName The name of the queue
 * @returns The number of jobs being processed
 */
export const getProcessingCount = async (queueName: string): Promise<number> => {
  const processingKey = `${PROCESSING_PREFIX}${queueName}`;
  return redisClient.hlen(processingKey);
}; 
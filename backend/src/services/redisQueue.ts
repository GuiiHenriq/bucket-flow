import redisClient from '../config/redis';
import { nanoid as nanoidOriginal } from 'nanoid/non-secure';
import { withLock } from './distributedLock';

const nanoid = () => nanoidOriginal(10);

const QUEUE_PREFIX = 'queue:';
const PROCESSING_PREFIX = 'processing:';
const DEFAULT_JOB_TIMEOUT = 60000;

export interface JobData {
  id: string;
  type: string;
  payload: any;
  createdAt: string;
}

export interface QueueOptions {
  jobTimeout?: number;
}

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

export const peekJob = async (queueName: string): Promise<JobData | null> => {
  const queueKey = `${QUEUE_PREFIX}${queueName}`;
  const jobJson = await redisClient.lindex(queueKey, -1);
  
  if (!jobJson) {
    return null;
  }
  
  return JSON.parse(jobJson);
};

export const dequeueJob = async (
  queueName: string,
  options: QueueOptions = {}
): Promise<JobData | null> => {
  const queueKey = `${QUEUE_PREFIX}${queueName}`;
  const processingKey = `${PROCESSING_PREFIX}${queueName}`;
  const jobTimeout = options.jobTimeout || DEFAULT_JOB_TIMEOUT;
  
  return withLock(`queue:${queueName}:lock`, async () => {
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

export const completeJob = async (
  queueName: string,
  jobId: string
): Promise<void> => {
  const processingKey = `${PROCESSING_PREFIX}${queueName}`;
  await redisClient.hdel(processingKey, jobId);
};

export const requeueTimedOutJobs = async (queueName: string): Promise<number> => {
  const queueKey = `${QUEUE_PREFIX}${queueName}`;
  const processingKey = `${PROCESSING_PREFIX}${queueName}`;
  
  return withLock(`queue:${queueName}:requeue-lock`, async () => {
    const jobs = await redisClient.hgetall(processingKey);
    let requeuedCount = 0;
    
    for (const [jobId, jobJson] of Object.entries(jobs)) {
      try {
        const job = JSON.parse(jobJson);
        
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

export const getQueueLength = async (queueName: string): Promise<number> => {
  const queueKey = `${QUEUE_PREFIX}${queueName}`;
  return redisClient.llen(queueKey);
};

export const getProcessingCount = async (queueName: string): Promise<number> => {
  const processingKey = `${PROCESSING_PREFIX}${queueName}`;
  return redisClient.hlen(processingKey);
}; 
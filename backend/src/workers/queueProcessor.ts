import cron from 'node-cron';
import { processTokenBucketQueue } from '../services/concurrentLeakyBucket';
import { requeueTimedOutJobs } from '../services/redisQueue';

const BUCKET_QUEUE = 'leaky-bucket-queue';

/**
 * Processes the token bucket queue and handles any timed out jobs
 */
const processQueue = async () => {
  try {
    // First, check for and requeue any timed out jobs
    const requeuedCount = await requeueTimedOutJobs(BUCKET_QUEUE);
    
    if (requeuedCount > 0) {
      console.log(`Requeued ${requeuedCount} timed out jobs`);
    }
    
    // Process the queue
    const processedCount = await processTokenBucketQueue();
    
    if (processedCount > 0) {
      console.log(`Processed ${processedCount} jobs from the token bucket queue`);
    }
  } catch (error) {
    console.error('Error processing queue:', error);
  }
};

/**
 * Starts the queue processing worker
 * Runs the processor every 5 seconds
 */
export const startQueueProcessingWorker = () => {
  // Schedule the queue processor to run every 5 seconds
  cron.schedule('*/5 * * * * *', processQueue);
  
  console.log('Queue processing worker started');
  
  // Also process immediately on startup
  processQueue();
};

// If this file is run directly, start the worker
if (require.main === module) {
  startQueueProcessingWorker();
} 
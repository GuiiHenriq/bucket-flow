import cron from 'node-cron';
import { processTokenBucketQueue } from '../services/concurrentLeakyBucket';
import { requeueTimedOutJobs } from '../services/redisQueue';

const BUCKET_QUEUE = 'leaky-bucket-queue';

const processQueue = async () => {
  try {
    const requeuedCount = await requeueTimedOutJobs(BUCKET_QUEUE);
    
    if (requeuedCount > 0) {
      console.log(`Requeued ${requeuedCount} timed out jobs`);
    }
    
    const processedCount = await processTokenBucketQueue();
    
    if (processedCount > 0) {
      console.log(`Processed ${processedCount} jobs from the token bucket queue`);
    }
  } catch (error) {
    console.error('Error processing queue:', error);
  }
};

export const startQueueProcessingWorker = () => {
  cron.schedule('*/5 * * * * *', processQueue);
  
  console.log('Queue processing worker started');
  
  processQueue();
};

if (require.main === module) {
  startQueueProcessingWorker();
} 
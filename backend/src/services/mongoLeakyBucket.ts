import { TokenBucket, ITokenBucket } from '../models/TokenBucket';
import { MAX_TOKENS } from './redisLeakyBucket';

/**
 * Maximum number of retries for optimistic concurrency control
 */
const MAX_RETRIES = 5;

/**
 * Gets or creates a token bucket for a user
 * 
 * @param userId The user ID
 * @returns The token bucket
 */
export const getOrCreateBucket = async (userId: string): Promise<ITokenBucket> => {
  let bucket = await TokenBucket.findOne({ userId });
  
  if (!bucket) {
    bucket = new TokenBucket({
      userId,
      tokens: MAX_TOKENS,
      lastRefill: new Date(),
    });
    await bucket.save();
  }
  
  return bucket;
};

/**
 * Attempts to consume a token with optimistic concurrency control
 * 
 * @param userId The user ID
 * @returns True if a token was consumed, false otherwise
 */
export const consumeToken = async (userId: string): Promise<boolean> => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Use findOneAndUpdate with optimistic concurrency control
      const result = await TokenBucket.findOneAndUpdate(
        {
          userId,
          tokens: { $gt: 0 } // Only update if there are tokens available
        },
        {
          $inc: { tokens: -1, version: 1 } // Atomically decrement tokens and increment version
        },
        {
          new: true, // Return the updated document
          runValidators: true
        }
      );
      
      if (result) {
        return true;
      }
      
      // No tokens available or bucket doesn't exist
      // Try to create the bucket if it doesn't exist
      const bucket = await getOrCreateBucket(userId);
      
      // Still no tokens
      if (bucket.tokens <= 0) {
        return false;
      }
      
      // We might have tokens now, retry
      continue;
    } catch (error) {
      if (attempt >= MAX_RETRIES - 1) {
        console.error(`Failed to consume token for user ${userId} after ${MAX_RETRIES} attempts:`, error);
        return false;
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
    }
  }
  
  return false;
};

/**
 * Processes a query result with optimistic concurrency control
 * 
 * @param userId The user ID
 * @param success Whether the operation was successful
 */
export const processQueryResult = async (
  userId: string,
  success: boolean
): Promise<void> => {
  if (!success) {
    return;
  }
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Use findOneAndUpdate with optimistic concurrency control
      const result = await TokenBucket.findOneAndUpdate(
        { userId },
        [
          {
            $set: {
              tokens: {
                $min: [{ $add: ['$tokens', 1] }, MAX_TOKENS]
              },
              version: { $add: ['$version', 1] }
            }
          }
        ],
        {
          new: true,
          runValidators: true,
          upsert: true
        }
      );
      
      if (result) {
        return;
      }
    } catch (error) {
      if (attempt >= MAX_RETRIES - 1) {
        console.error(`Failed to process query result for user ${userId} after ${MAX_RETRIES} attempts:`, error);
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
    }
  }
};

/**
 * Resets a user's tokens with optimistic concurrency control
 * 
 * @param userId The user ID
 * @param tokens The new token count
 */
export const setUserTokens = async (
  userId: string,
  tokens: number
): Promise<boolean> => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await TokenBucket.findOneAndUpdate(
        { userId },
        {
          $set: { tokens: Math.min(tokens, MAX_TOKENS) },
          $inc: { version: 1 }
        },
        {
          new: true,
          runValidators: true,
          upsert: true
        }
      );
      
      if (result) {
        return true;
      }
    } catch (error) {
      if (attempt >= MAX_RETRIES - 1) {
        console.error(`Failed to set tokens for user ${userId} after ${MAX_RETRIES} attempts:`, error);
        return false;
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
    }
  }
  
  return false;
};

/**
 * Refills tokens for all users with optimistic concurrency control
 */
export const refillAllTokens = async (): Promise<number> => {
  try {
    const result = await TokenBucket.updateMany(
      { tokens: { $lt: MAX_TOKENS } },
      [
        {
          $set: {
            tokens: {
              $min: [{ $add: ['$tokens', 1] }, MAX_TOKENS]
            },
            lastRefill: new Date(),
            version: { $add: ['$version', 1] }
          }
        }
      ]
    );
    
    return result.modifiedCount;
  } catch (error) {
    console.error('Error refilling tokens:', error);
    return 0;
  }
}; 
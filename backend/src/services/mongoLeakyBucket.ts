import { TokenBucket, ITokenBucket } from '../models/TokenBucket';
import { MAX_TOKENS } from './redisLeakyBucket';

const MAX_RETRIES = 5;

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

export const consumeToken = async (userId: string): Promise<boolean> => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await TokenBucket.findOneAndUpdate(
        {
          userId,
          tokens: { $gt: 0 }
        },
        {
          $inc: { tokens: -1, version: 1 }
        },
        {
          new: true,
          runValidators: true
        }
      );
      
      if (result) {
        return true;
      }
      
      const bucket = await getOrCreateBucket(userId);
      
      if (bucket.tokens <= 0) {
        return false;
      }
      
      continue;
    } catch (error) {
      if (attempt >= MAX_RETRIES - 1) {
        console.error(`Failed to consume token for user ${userId} after ${MAX_RETRIES} attempts:`, error);
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
    }
  }
  
  return false;
};

export const processQueryResult = async (
  userId: string,
  success: boolean
): Promise<void> => {
  if (!success) {
    return;
  }
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
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
      
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
    }
  }
};

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
      
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
    }
  }
  
  return false;
};

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
import cron from "node-cron";

interface TokenBucket {
  userId: string;
  tokens: number;
  lastRefill: Date;
}

export const MAX_TOKENS = 10;
const userTokens: Map<string, TokenBucket> = new Map();

export const initUserTokens = (userId: string): TokenBucket => {
  const bucket: TokenBucket = {
    userId,
    tokens: MAX_TOKENS,
    lastRefill: new Date(),
  };
  userTokens.set(userId, bucket);
  return bucket;
};

export const getUserTokens = (userId: string): TokenBucket => {
  let bucket = userTokens.get(userId);
  if (!bucket) {
    bucket = initUserTokens(userId);
  }
  return bucket;
};

export const consumeToken = (userId: string): boolean => {
  const bucket = getUserTokens(userId);

  if (bucket.tokens <= 0) {
    return false;
  }
  return true;
};

export const processQueryResult = (userId: string, success: boolean): void => {
  const bucket = getUserTokens(userId);

  if (!success) {
    bucket.tokens = Math.max(0, bucket.tokens - 1);
  }
  userTokens.set(userId, bucket);
};

export const refillTokens = (): void => {
  console.log("Refilling tokens...");
  userTokens.forEach((bucket, userId) => {
    bucket.tokens = Math.min(bucket.tokens + 1, MAX_TOKENS);
    bucket.lastRefill = new Date();
    userTokens.set(userId, bucket);
    console.log(`User ${userId} now has ${bucket.tokens} tokens`);
  });
};

export const startTokenRefillJob = (): void => {
  cron.schedule("0 * * * *", () => {
    refillTokens();
  });
  console.log("Token refill job scheduled");
};

export const resetAllTokens = (): void => {
  userTokens.clear();
};

export const setUserTokens = (userId: string, tokenCount: number): void => {
  const bucket = getUserTokens(userId);
  bucket.tokens = Math.min(tokenCount, MAX_TOKENS);
  userTokens.set(userId, bucket);
};

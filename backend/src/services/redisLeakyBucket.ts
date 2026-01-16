import cron from "node-cron";
import redisClient from "../config/redis";

export interface TokenBucket {
  userId: string;
  tokens: number;
  lastRefill: Date;
}

export const MAX_TOKENS = 10;

const REDIS_KEY_PREFIX = "leaky-bucket";

const getBucketKey = (userId: string) => `${REDIS_KEY_PREFIX}:user:${userId}`;

export const initUserTokens = async (userId: string): Promise<TokenBucket> => {
  const bucketKey = getBucketKey(userId);
  const now = new Date();

  await redisClient
    .pipeline()
    .hset(bucketKey, "tokens", MAX_TOKENS)
    .hset(bucketKey, "lastRefill", now.toISOString())
    .expire(bucketKey, 60 * 60 * 24 * 7) // Expires in 7 days
    .exec();

  return {
    userId,
    tokens: MAX_TOKENS,
    lastRefill: now,
  };
};

export const getUserTokens = async (userId: string): Promise<TokenBucket> => {
  const bucketKey = getBucketKey(userId);

  const exists = await redisClient.exists(bucketKey);

  if (!exists) {
    return await initUserTokens(userId);
  }

  const bucketData = await redisClient.hgetall(bucketKey);

  return {
    userId,
    tokens: parseInt(bucketData.tokens || "0"),
    lastRefill: new Date(bucketData.lastRefill),
  };
};

export const consumeToken = async (userId: string): Promise<boolean> => {
  const bucketKey = getBucketKey(userId);

  const script = `
    local tokens = tonumber(redis.call('hget', KEYS[1], 'tokens') or 0)
    if tokens <= 0 then
      return 0
    end
    redis.call('hset', KEYS[1], 'tokens', tokens - 1)
    return 1
  `;

  const result = await redisClient.eval(script, 1, bucketKey);
  return result === 1;
};

export const processQueryResult = async (
  userId: string,
  success: boolean
): Promise<void> => {
  if (success) {
    const bucketKey = getBucketKey(userId);

    const script = `
      local tokens = tonumber(redis.call('hget', KEYS[1], 'tokens') or 0)
      local maxTokens = tonumber(ARGV[1])
      local newTokens = math.min(tokens + 1, maxTokens)
      redis.call('hset', KEYS[1], 'tokens', newTokens)
      return newTokens
    `;

    await redisClient.eval(script, 1, bucketKey, MAX_TOKENS.toString());
  }
};

export const refillTokens = async (): Promise<void> => {
  const keys = await redisClient.keys(`${REDIS_KEY_PREFIX}:user:*`);

  console.log(`Refilling tokens for ${keys.length} users...`);

  const script = `
    local tokens = tonumber(redis.call('hget', KEYS[1], 'tokens') or 0)
    local maxTokens = tonumber(ARGV[1])
    local newTokens = math.min(tokens + 1, maxTokens)
    redis.call('hset', KEYS[1], 'tokens', newTokens)
    redis.call('hset', KEYS[1], 'lastRefill', ARGV[2])
    return newTokens
  `;

  const now = new Date().toISOString();

  for (const key of keys) {
    const newTokens = await redisClient.eval(
      script,
      1,
      key,
      MAX_TOKENS.toString(),
      now
    );

    const userId = key.split(":").pop();
    console.log(`User ${userId} now has ${newTokens} tokens`);
  }
};

export const startTokenRefillJob = (): void => {
  cron.schedule("0 * * * *", async () => {
    await refillTokens();
  });
  console.log("Token refill job scheduled");
};

export const resetAllTokens = async (): Promise<void> => {
  const keys = await redisClient.keys(`${REDIS_KEY_PREFIX}:user:*`);

  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
};

export const setUserTokens = async (
  userId: string,
  tokenCount: number
): Promise<void> => {
  const bucketKey = getBucketKey(userId);
  const finalCount = Math.min(tokenCount, MAX_TOKENS);

  await redisClient.hset(bucketKey, "tokens", finalCount);
};

export const getAllUserTokens = async (): Promise<TokenBucket[]> => {
  const keys = await redisClient.keys(`${REDIS_KEY_PREFIX}:user:*`);
  const buckets: TokenBucket[] = [];

  for (const key of keys) {
    const bucketData = await redisClient.hgetall(key);
    const userId = key.split(":").pop() || "";

    buckets.push({
      userId,
      tokens: parseInt(bucketData.tokens || "0"),
      lastRefill: new Date(bucketData.lastRefill),
    });
  }

  return buckets;
};

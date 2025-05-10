import {
  initUserTokens,
  getUserTokens,
  consumeToken,
  processQueryResult,
  refillTokens,
  setUserTokens,
  MAX_TOKENS,
  resetAllTokens,
  getAllUserTokens
} from '../../services/redisLeakyBucket';

// Mock do Redis já configurado em __mocks__/ioredis.ts
jest.mock('ioredis');

describe('Redis Leaky Bucket Service', () => {
  const userId = 'test-user-1';

  beforeEach(async () => {
    await resetAllTokens();
  });

  describe('initUserTokens', () => {
    it('should initialize a new token bucket with max tokens', async () => {
      const bucket = await initUserTokens(userId);
      expect(bucket.tokens).toBe(MAX_TOKENS);
      expect(bucket.userId).toBe(userId);
      expect(bucket.lastRefill).toBeInstanceOf(Date);
    });
  });

  describe('getUserTokens', () => {
    it('should return existing bucket if it exists', async () => {
      const initialBucket = await initUserTokens(userId);
      const retrievedBucket = await getUserTokens(userId);
      expect(retrievedBucket.tokens).toBe(initialBucket.tokens);
      expect(retrievedBucket.userId).toBe(initialBucket.userId);
    });

    it('should create new bucket if it does not exist', async () => {
      const bucket = await getUserTokens('new-user');
      expect(bucket.tokens).toBe(MAX_TOKENS);
      expect(bucket.userId).toBe('new-user');
    });
  });

  describe('consumeToken', () => {
    it('should return true when tokens are available', async () => {
      await setUserTokens(userId, 5);
      const result = await consumeToken(userId);
      expect(result).toBe(true);
      
      // Verify token was decremented
      const bucket = await getUserTokens(userId);
      expect(bucket.tokens).toBe(4);
    });

    it('should return false when no tokens are available', async () => {
      await setUserTokens(userId, 0);
      expect(await consumeToken(userId)).toBe(false);
    });
  });

  describe('processQueryResult', () => {
    it('should not make changes on unsuccessful query', async () => {
      await setUserTokens(userId, 5);
      await processQueryResult(userId, false);
      const bucket = await getUserTokens(userId);
      expect(bucket.tokens).toBe(5);
    });

    it('should increment tokens on successful query', async () => {
      await setUserTokens(userId, 5);
      await processQueryResult(userId, true);
      const bucket = await getUserTokens(userId);
      expect(bucket.tokens).toBe(6);
    });

    it('should not exceed max tokens on successful query', async () => {
      await setUserTokens(userId, MAX_TOKENS);
      await processQueryResult(userId, true);
      const bucket = await getUserTokens(userId);
      expect(bucket.tokens).toBe(MAX_TOKENS);
    });
  });

  describe('refillTokens', () => {
    it('should increment tokens for all users', async () => {
      const userId2 = 'test-user-2';
      await setUserTokens(userId, 5);
      await setUserTokens(userId2, 3);

      await refillTokens();

      const bucket1 = await getUserTokens(userId);
      const bucket2 = await getUserTokens(userId2);

      expect(bucket1.tokens).toBe(6);
      expect(bucket2.tokens).toBe(4);
    });

    it('should not exceed max tokens', async () => {
      await setUserTokens(userId, MAX_TOKENS);
      await refillTokens();
      const bucket = await getUserTokens(userId);
      expect(bucket.tokens).toBe(MAX_TOKENS);
    });
  });

  describe('setUserTokens', () => {
    it('should set tokens to specified value', async () => {
      await setUserTokens(userId, 3);
      const bucket = await getUserTokens(userId);
      expect(bucket.tokens).toBe(3);
    });

    it('should not exceed max tokens', async () => {
      await setUserTokens(userId, MAX_TOKENS + 5);
      const bucket = await getUserTokens(userId);
      expect(bucket.tokens).toBe(MAX_TOKENS);
    });
  });

  describe('getAllUserTokens', () => {
    it('should return all user buckets', async () => {
      await setUserTokens('user1', 5);
      await setUserTokens('user2', 3);

      const buckets = await getAllUserTokens();
      expect(buckets.length).toBe(2);
      
      // Verificar se os usuários estão na lista
      const userIds = buckets.map(b => b.userId);
      expect(userIds).toContain('user1');
      expect(userIds).toContain('user2');
      
      // Verificar os valores dos tokens
      const user1Bucket = buckets.find(b => b.userId === 'user1');
      const user2Bucket = buckets.find(b => b.userId === 'user2');
      
      expect(user1Bucket?.tokens).toBe(5);
      expect(user2Bucket?.tokens).toBe(3);
    });
    
    it('should return empty array when no buckets exist', async () => {
      const buckets = await getAllUserTokens();
      expect(buckets).toEqual([]);
    });
  });
}); 
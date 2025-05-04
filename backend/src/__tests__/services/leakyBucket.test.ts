import {
  initUserTokens,
  getUserTokens,
  consumeToken,
  processQueryResult,
  refillTokens,
  setUserTokens,
  MAX_TOKENS,
} from '../../services/leakyBucket';

describe('Leaky Bucket Service', () => {
  const userId = 'test-user-1';

  describe('initUserTokens', () => {
    it('should initialize a new token bucket with max tokens', () => {
      const bucket = initUserTokens(userId);
      expect(bucket.tokens).toBe(MAX_TOKENS);
      expect(bucket.userId).toBe(userId);
      expect(bucket.lastRefill).toBeInstanceOf(Date);
    });
  });

  describe('getUserTokens', () => {
    it('should return existing bucket if it exists', () => {
      const initialBucket = initUserTokens(userId);
      const retrievedBucket = getUserTokens(userId);
      expect(retrievedBucket).toEqual(initialBucket);
    });

    it('should create new bucket if it does not exist', () => {
      const bucket = getUserTokens('new-user');
      expect(bucket.tokens).toBe(MAX_TOKENS);
      expect(bucket.userId).toBe('new-user');
    });
  });

  describe('consumeToken', () => {
    it('should return true when tokens are available', () => {
      setUserTokens(userId, 5);
      expect(consumeToken(userId)).toBe(true);
    });

    it('should return false when no tokens are available', () => {
      setUserTokens(userId, 0);
      expect(consumeToken(userId)).toBe(false);
    });
  });

  describe('processQueryResult', () => {
    it('should decrement tokens on unsuccessful query', () => {
      setUserTokens(userId, 5);
      processQueryResult(userId, false);
      const bucket = getUserTokens(userId);
      expect(bucket.tokens).toBe(4);
    });

    it('should not decrement tokens on successful query', () => {
      setUserTokens(userId, 5);
      processQueryResult(userId, true);
      const bucket = getUserTokens(userId);
      expect(bucket.tokens).toBe(5);
    });

    it('should not go below 0 tokens', () => {
      setUserTokens(userId, 0);
      processQueryResult(userId, false);
      const bucket = getUserTokens(userId);
      expect(bucket.tokens).toBe(0);
    });
  });

  describe('refillTokens', () => {
    it('should increment tokens for all users', () => {
      const userId2 = 'test-user-2';
      setUserTokens(userId, 5);
      setUserTokens(userId2, 3);

      refillTokens();

      const bucket1 = getUserTokens(userId);
      const bucket2 = getUserTokens(userId2);

      expect(bucket1.tokens).toBe(6);
      expect(bucket2.tokens).toBe(4);
    });

    it('should not exceed max tokens', () => {
      setUserTokens(userId, MAX_TOKENS);
      refillTokens();
      const bucket = getUserTokens(userId);
      expect(bucket.tokens).toBe(MAX_TOKENS);
    });
  });

  describe('setUserTokens', () => {
    it('should set tokens to specified value', () => {
      setUserTokens(userId, 3);
      const bucket = getUserTokens(userId);
      expect(bucket.tokens).toBe(3);
    });

    it('should not exceed max tokens', () => {
      setUserTokens(userId, MAX_TOKENS + 5);
      const bucket = getUserTokens(userId);
      expect(bucket.tokens).toBe(MAX_TOKENS);
    });
  });
}); 
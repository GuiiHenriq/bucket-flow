import { resetAllTokens } from '../services/leakyBucket';

// Reset token buckets before each test
beforeEach(() => {
  resetAllTokens();
});

// Mock cron job to prevent it from running during tests
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
})); 
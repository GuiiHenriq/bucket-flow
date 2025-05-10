import { resetAllTokens } from "../services/redisLeakyBucket";

beforeEach(async () => {
  await resetAllTokens();
});

jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

jest.mock("ioredis");

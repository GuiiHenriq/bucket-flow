import { resetAllTokens } from "../services/leakyBucket";

beforeEach(() => {
  resetAllTokens();
});

jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

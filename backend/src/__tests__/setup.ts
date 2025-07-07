import { resetAllTokens } from "../services/redisLeakyBucket";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ 
  path: path.resolve(__dirname, "../../.env"),
  override: false
});

beforeEach(async () => {
  await resetAllTokens();
});

jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

jest.mock("ioredis");

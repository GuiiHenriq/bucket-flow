import { Context } from "koa";
import { leakyBucketMiddleware } from "../../middlewares/leakyBucket";
import { setUserTokens } from "../../services/redisLeakyBucket";

jest.mock("../../services/redisLeakyBucket", () => {
  const originalModule = jest.requireActual("../../services/redisLeakyBucket");
  let userTokens: Map<string, number> = new Map();

  return {
    ...originalModule,
    setUserTokens: jest.fn(async (userId: string, tokenCount: number) => {
      userTokens.set(userId, Math.min(tokenCount, originalModule.MAX_TOKENS));
    }),
    consumeToken: jest.fn(async (userId: string) => {
      const tokens = userTokens.get(userId) || 0;
      if (tokens <= 0) return false;
      userTokens.set(userId, tokens - 1);
      return true;
    }),
  };
});

interface TestContext extends Partial<Context> {
  state: {
    user?: {
      id: string;
    };
  };
  status: number;
  body: any;
}

describe("Leaky Bucket Middleware", () => {
  let ctx: TestContext;
  let next: jest.Mock;

  beforeEach(() => {
    ctx = {
      state: {},
      status: 0,
      body: null,
    };
    next = jest.fn();
  });

  it("should return 401 when user is not authenticated", async () => {
    await leakyBucketMiddleware(ctx as Context, next);

    expect(ctx.status).toBe(401);
    expect(ctx.body).toEqual({ error: "Authentication required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 429 when no tokens are available", async () => {
    const userId = "test-user";
    ctx.state.user = { id: userId };
    await setUserTokens(userId, 0);

    await leakyBucketMiddleware(ctx as Context, next);

    expect(ctx.status).toBe(429);
    expect(ctx.body).toEqual({
      error: "Rate limit exceeded. Please try again later.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next when tokens are available", async () => {
    const userId = "test-user";
    ctx.state.user = { id: userId };
    await setUserTokens(userId, 5);

    await leakyBucketMiddleware(ctx as Context, next);

    expect(ctx.status).toBe(0);
    expect(ctx.body).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});

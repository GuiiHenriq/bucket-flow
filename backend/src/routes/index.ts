import Router from "@koa/router";
import { login } from "../services/auth";
import { leakyBucketMiddleware } from "../middlewares/leakyBucket";
import { getUserTokens } from "../services/leakyBucket";

export const routes = (router: Router) => {
  router.post("/api/login", login);

  router.get("/api/tokens", leakyBucketMiddleware, async (ctx) => {
    const userId = ctx.state.user.id;
    const tokenBucket = getUserTokens(userId);

    ctx.body = {
      tokens: tokenBucket.tokens,
      lastRefill: tokenBucket.lastRefill,
    };
  });

  router.post("/api/pix/query", leakyBucketMiddleware, async (ctx) => {
    const { key } = ctx.request.body as { key: string };

    // Mock PIX key lookup
    const success = Math.random() < 0.8; // 80% chance of success

    ctx.body = {
      success,
      message: success
        ? "PIX key found"
        : "PIX key not found or service unavailable",
      data: success
        ? {
            key,
            name: "Test User",
            bank: "Test Bank",
            accountType: "Checking",
            accountNumber: "12345-6",
          }
        : null,
    };
  });
};

import { Context, Next } from "koa";
import { consumeToken } from "../services/leakyBucket";

export const leakyBucketMiddleware = async (ctx: Context, next: Next) => {
  const userId = ctx.state.user?.id;

  if (!userId) {
    ctx.status = 401;
    ctx.body = { error: "Authentication required" };
    return;
  }

  const hasToken = consumeToken(userId);

  if (!hasToken) {
    ctx.status = 429;
    ctx.body = { error: "Rate limit exceeded. Please try again later." };
    return;
  }

  await next();
};

import { Context, Next } from "koa";
import { safeConsumeToken, safeProcessQueryResult } from "../services/concurrentLeakyBucket";

export const leakyBucketMiddleware = async (ctx: Context, next: Next) => {
  const userId = ctx.state.user?.id;

  if (!userId) {
    ctx.status = 401;
    ctx.body = { error: "Authentication required" };
    return;
  }

  const hasToken = await safeConsumeToken(userId);

  if (!hasToken) {
    ctx.status = 429;
    ctx.body = { error: "Rate limit exceeded. Please try again later." };
    return;
  }

  try {
    await next();
    
    safeProcessQueryResult(userId, true).catch(err => {
      console.error("Error processing query result:", err);
    });
  } catch (error) {
    throw error;
  }
};

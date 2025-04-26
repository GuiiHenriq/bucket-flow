import { Context, Next } from "koa";
import jwt from "jsonwebtoken";

// Mock user database
const users = [
  { id: "1", username: "user1", password: "password1" },
  { id: "2", username: "user2", password: "password2" },
];

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const authMiddleware = async (ctx: Context, next: Next) => {
  try {
    if (
      ctx.path === "/api/login" ||
      (ctx.path === "/graphql" && ctx.method === "OPTIONS")
    ) {
      return await next();
    }

    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.status = 401;
      ctx.body = { error: "Authentication required" };
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const user = users.find((u) => u.id === decoded.id);
    if (!user) {
      ctx.status = 401;
      ctx.body = { error: "Invalid token" };
      return;
    }

    ctx.state.user = user;

    await next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = { error: "Invalid token" };
  }
};

import { Context, Next } from "koa";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";
import { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface GraphQLRequestBody {
  query?: string;
  variables?: any;
}

export const authMiddleware = async (ctx: Context, next: Next) => {
  try {
    if (
      ctx.path === "/api/login" ||
      ctx.path === "/api/register" ||
      ctx.method === "OPTIONS" ||
      (ctx.path === "/graphql" && (ctx.request.body as GraphQLRequestBody)?.query?.includes("mutation AuthMutationsLoginMutation")) ||
      (ctx.path === "/graphql" && (ctx.request.body as GraphQLRequestBody)?.query?.includes("mutation AuthMutationsRegisterMutation"))
    ) {
      return await next();
    }

    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.status = 401;
      ctx.body = { error: "Authentication required" };
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const user = await User.findById(decoded.id) as IUser;
    if (!user) {
      ctx.status = 401;
      ctx.body = { error: "Invalid token" };
      return;
    }

    ctx.state.user = {
      id: (user._id as Types.ObjectId).toString(),
      username: user.username
    };

    await next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = { error: "Invalid token" };
  }
};

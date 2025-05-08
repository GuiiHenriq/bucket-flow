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
  // Para debug
  console.log("Path:", ctx.path);
  console.log("Method:", ctx.method);
  console.log("Body:", JSON.stringify(ctx.request.body));

  try {
    // Permitir requisições OPTIONS
    if (ctx.method === "OPTIONS") {
      return await next();
    }

    // Simplificando drasticamente para testes
    // Permitir todas as requisições para /graphql
    if (ctx.path === "/graphql") {
      return await next();
    }

    // Para todas as outras rotas, exigir autenticação
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.status = 401;
      ctx.body = { error: "Authentication required" };
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const user = (await User.findById(decoded.id)) as IUser;
    if (!user) {
      ctx.status = 401;
      ctx.body = { error: "Invalid token" };
      return;
    }

    ctx.state.user = {
      id: (user._id as Types.ObjectId).toString(),
      username: user.username,
    };

    await next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = { error: "Invalid token" };
  }
}; 
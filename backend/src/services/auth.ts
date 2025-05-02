import jwt from "jsonwebtoken";
import { Context } from "koa";
import { User } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const register = async (ctx: Context) => {
  try {
    const { username, password } = ctx.request.body as {
      username: string;
      password: string;
    };

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      ctx.status = 400;
      ctx.body = { error: "Username already exists" };
      return;
    }

    // Create new user
    const user = new User({ username, password });
    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "24h" });

    ctx.status = 201;
    ctx.body = { token };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: "Error creating user" };
  }
};

export const login = async (ctx: Context) => {
  try {
    const { username, password } = ctx.request.body as {
      username: string;
      password: string;
    };

    const user = await User.findOne({ username });
    if (!user) {
      ctx.status = 401;
      ctx.body = { error: "Invalid credentials" };
      return;
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      ctx.status = 401;
      ctx.body = { error: "Invalid credentials" };
      return;
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "24h" });

    ctx.body = { token };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: "Error during login" };
  }
};

export const getUserById = async (id: string) => {
  return User.findById(id);
};

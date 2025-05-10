import jwt from "jsonwebtoken";
import { Context } from "koa";
import { User, IUser } from "../models/User";
import { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface RegisterInput {
  username: string;
  password: string;
}

interface AuthResponse {
  token: string;
  id: string;
  username: string;
}

export const register = async (ctx: Context | { request: { body: RegisterInput } }): Promise<AuthResponse> => {
  try {
    const { username, password } = 'body' in ctx.request 
      ? ctx.request.body as RegisterInput
      : (ctx.request as any).body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      if ('status' in ctx) {
        (ctx as Context).status = 400;
        (ctx as Context).body = { error: "Username already exists" };
      }
      throw new Error("Username already exists");
    }

    const user = new User({ username, password }) as IUser;
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "24h" });

    return {
      token,
      id: (user._id as Types.ObjectId).toString(),
      username: user.username
    };
  } catch (error) {
    if ('status' in ctx) {
      (ctx as Context).status = 500;
      (ctx as Context).body = { error: "Error creating user" };
    }
    throw error;
  }
};

export const login = async (ctx: Context | { request: { body: { username: string; password: string } } }): Promise<AuthResponse> => {
  try {
    const { username, password } = 'body' in ctx.request 
      ? ctx.request.body as { username: string; password: string }
      : (ctx.request as any).body;

    const user = await User.findOne({ username }) as IUser | null;
    if (!user) {
      if ('status' in ctx) {
        (ctx as Context).status = 401;
        (ctx as Context).body = { error: "Invalid credentials" };
      }
      throw new Error("Invalid credentials");
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      if ('status' in ctx) {
        (ctx as Context).status = 401;
        (ctx as Context).body = { error: "Invalid credentials" };
      }
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "24h" });

    return {
      token,
      id: (user._id as Types.ObjectId).toString(),
      username: user.username
    };
  } catch (error) {
    if ('status' in ctx) {
      (ctx as Context).status = 500;
      (ctx as Context).body = { error: "Error during login" };
    }
    throw error;
  }
};

export const getUserById = async (id: string) => {
  return User.findById(id);
};

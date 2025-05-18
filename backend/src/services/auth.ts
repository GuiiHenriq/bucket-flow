import jwt from "jsonwebtoken";
import { Context } from "koa";
import { User, IUser } from "../models/User";
import { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "f5e6ea86177b7190efd38125a714928693899f28d7bf05ad87699fad0eff4f2f6e6b9e5362abd6db752c054b4d136caccf453da2302c65368cf507837b479d41502477f2089771eb121449e5cf62bd98df264eb75ed5adfcdbd9dd44007f6cf764a362f29cb57bfd520783c8346e4448537889315df0286577359f1f6834251be66801b9ac1838de3b5fd334002ab7f04a954caa4002852d2f8a5a6b40d2069ba34c3dc31b4a67541018f2540054e68081512d981aa1392f4388b27ecc0c63d02fd943c6a264ec2693554f2717c3bbd7f118005ba181141d0f521c4dd44079d20f9d6616c6f45f99f28f2d78a4e94f68a71b3756827eb59723a6c4ca3dce659d";

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

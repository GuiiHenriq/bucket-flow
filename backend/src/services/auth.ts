import jwt from "jsonwebtoken";
import { Context } from "koa";

// Mock user database
const users = [
  { id: "1", username: "user1", password: "password1" },
  { id: "2", username: "user2", password: "password2" },
];

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const login = async (ctx: Context) => {
  const { username, password } = ctx.request.body as {
    username: string;
    password: string;
  };

  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) {
    ctx.status = 401;
    ctx.body = { error: "Invalid credentials" };
    return;
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });

  ctx.body = { token };
};

export const getUserById = (id: string) => {
  return users.find((user) => user.id === id);
};

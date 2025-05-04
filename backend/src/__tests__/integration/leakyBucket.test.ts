import request from "supertest";
import { createServer } from "http";
import { app } from "../../app";
import { setUserTokens } from "../../services/leakyBucket";
import jwt from "jsonwebtoken";
import { User } from "../../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const TEST_USER_ID = "test-user";

jest.mock("../../models/User", () => ({
  User: {
    findById: jest.fn().mockImplementation((id) => {
      if (id === TEST_USER_ID) {
        return Promise.resolve({
          _id: TEST_USER_ID,
          username: "testuser",
          comparePassword: jest.fn().mockResolvedValue(true),
        });
      }
      return Promise.resolve(null);
    }),
  },
}));

describe("Leaky Bucket Integration Tests", () => {
  let authToken: string;
  let server: ReturnType<typeof createServer>;

  beforeAll(() => {
    authToken = jwt.sign({ id: TEST_USER_ID }, JWT_SECRET, {
      expiresIn: "24h",
    });
    server = app.listen();
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    setUserTokens(TEST_USER_ID, 10);
    jest.spyOn(global.Math, "random").mockRestore();
  });

  const makeAuthenticatedRequest = (
    method: "get" | "post",
    path: string,
    data?: any
  ) => {
    const req = request(server)
      [method](path)
      .set("Authorization", `Bearer ${authToken}`);
    return data ? req.send(data) : req;
  };

  describe("GET /api/tokens", () => {
    it("should return token information for authenticated user", async () => {
      const response = await makeAuthenticatedRequest("get", "/api/tokens");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        tokens: 10,
        lastRefill: expect.any(String),
      });
    });

    it("should return 401 without authentication", async () => {
      const response = await request(server).get("/api/tokens");
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Authentication required" });
    });
  });

  describe("POST /api/pix/query", () => {
    const testKey = "12345678900";

    it("should process query when tokens are available", async () => {
      jest.spyOn(global.Math, "random").mockReturnValue(0.7);
      const response = await makeAuthenticatedRequest(
        "post",
        "/api/pix/query",
        { key: testKey }
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 429 when rate limit is exceeded", async () => {
      setUserTokens(TEST_USER_ID, 0);
      const response = await makeAuthenticatedRequest(
        "post",
        "/api/pix/query",
        { key: testKey }
      );
      expect(response.status).toBe(429);
      expect(response.body).toEqual({
        error: "Rate limit exceeded. Please try again later.",
      });
    });

    it("should maintain token count after query", async () => {
      jest.spyOn(global.Math, "random").mockReturnValue(0.7);
      await makeAuthenticatedRequest("post", "/api/pix/query", {
        key: testKey,
      });
      const response = await makeAuthenticatedRequest("get", "/api/tokens");
      expect(response.body.tokens).toBe(10);
    });
  });
});

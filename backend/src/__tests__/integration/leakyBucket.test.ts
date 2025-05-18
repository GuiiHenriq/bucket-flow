import request from "supertest";
import { createServer } from "http";
import { app } from "../../app";
import { setUserTokens } from "../../services/redisLeakyBucket";
import jwt from "jsonwebtoken";
import { User } from "../../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "f5e6ea86177b7190efd38125a714928693899f28d7bf05ad87699fad0eff4f2f6e6b9e5362abd6db752c054b4d136caccf453da2302c65368cf507837b479d41502477f2089771eb121449e5cf62bd98df264eb75ed5adfcdbd9dd44007f6cf764a362f29cb57bfd520783c8346e4448537889315df0286577359f1f6834251be66801b9ac1838de3b5fd334002ab7f04a954caa4002852d2f8a5a6b40d2069ba34c3dc31b4a67541018f2540054e68081512d981aa1392f4388b27ecc0c63d02fd943c6a264ec2693554f2717c3bbd7f118005ba181141d0f521c4dd44079d20f9d6616c6f45f99f28f2d78a4e94f68a71b3756827eb59723a6c4ca3dce659d";
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

  beforeEach(async () => {
    await setUserTokens(TEST_USER_ID, 10);
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
      await setUserTokens(TEST_USER_ID, 0);
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

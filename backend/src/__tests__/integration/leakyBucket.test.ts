const TEST_JWT_SECRET = 'integration-test-secret-key';
process.env.JWT_SECRET = TEST_JWT_SECRET;

import request from "supertest";
import { createServer } from "http";
import { app } from "../../app";
import { setUserTokens } from "../../services/redisLeakyBucket";
import jwt from "jsonwebtoken";
import { User } from "../../models/User";

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
    authToken = jwt.sign({ id: TEST_USER_ID }, TEST_JWT_SECRET, {
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

  const makeGraphQLRequest = (
    query: string,
    variables: any = {},
    token?: string
  ) => {
    const req = request(server)
      .post("/graphql")
      .send({
        query,
        variables,
      });

    if (token) {
      req.set("Authorization", `Bearer ${token}`);
    }

    return req;
  };

  describe("GraphQL getTokens", () => {
    it("should return token information for authenticated user", async () => {
      const query = `
        query {
          getTokens {
            tokens
            lastRefill
          }
        }
      `;

      const response = await makeGraphQLRequest(query, {}, authToken);
      expect(response.status).toBe(200);
      expect(response.body.data.getTokens).toEqual({
        tokens: 10,
        lastRefill: expect.any(String),
      });
    });

    it("should return 401 without authentication", async () => {
      const query = `
        query {
          getTokens {
            tokens
            lastRefill
          }
        }
      `;

      const response = await makeGraphQLRequest(query);
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Authentication required" });
    });
  });

  describe("GraphQL queryPixKey", () => {
    const testKey = "12345678900";

    it("should process query when tokens are available", async () => {
      jest.spyOn(global.Math, "random").mockReturnValue(0.7);
      
      const query = `
        mutation QueryPixKey($key: String!) {
          queryPixKey(key: $key) {
            success
            message
          }
        }
      `;

      const response = await makeGraphQLRequest(
        query,
        { key: testKey },
        authToken
      );
      expect(response.status).toBe(200);
      expect(response.body.data.queryPixKey).toHaveProperty("success", true);
    });

    it("should return rate limit error when tokens are exhausted", async () => {
      await setUserTokens(TEST_USER_ID, 0);
      
      const query = `
        mutation QueryPixKey($key: String!) {
          queryPixKey(key: $key) {
            success
            message
          }
        }
      `;

      const response = await makeGraphQLRequest(
        query,
        { key: testKey },
        authToken
      );
      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toBe("Rate limit exceeded. Please try again later.");
    });

    it("should maintain token count after query", async () => {
      jest.spyOn(global.Math, "random").mockReturnValue(0.7);
      
      const queryPixKey = `
        mutation QueryPixKey($key: String!) {
          queryPixKey(key: $key) {
            success
            message
          }
        }
      `;

      const getTokensQuery = `
        query {
          getTokens {
            tokens
            lastRefill
          }
        }
      `;

      await makeGraphQLRequest(queryPixKey, { key: testKey }, authToken);
      const response = await makeGraphQLRequest(getTokensQuery, {}, authToken);
      expect(response.body.data.getTokens.tokens).toBe(10);
    });
  });
});
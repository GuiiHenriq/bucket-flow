import { resolvers } from "../../graphql/schema";
import { setUserTokens } from "../../services/redisLeakyBucket";
import { consumeToken, processQueryResult } from "../../services/redisLeakyBucket";

// Mock Redis e funções relevantes do leaky bucket
jest.mock("../../services/redisLeakyBucket", () => {
  const tokens = new Map<string, number>();
  
  return {
    setUserTokens: jest.fn(async (userId: string, tokenCount: number) => {
      tokens.set(userId, tokenCount);
    }),
    getUserTokens: jest.fn(async (userId: string) => {
      return {
        userId,
        tokens: tokens.get(userId) || 10,
        lastRefill: new Date()
      };
    }),
    consumeToken: jest.fn(async (userId: string) => {
      const currentTokens = tokens.get(userId) || 0;
      if (currentTokens <= 0) return false;
      tokens.set(userId, currentTokens - 1);
      return true;
    }),
    processQueryResult: jest.fn(async (userId: string, success: boolean) => {
      if (success) {
        const currentTokens = tokens.get(userId) || 0;
        tokens.set(userId, Math.min(currentTokens + 1, 10));
      }
    })
  };
});

describe("GraphQL Resolvers", () => {
  const userId = "test-user";
  const context = { user: { id: userId } };

  beforeEach(async () => {
    await setUserTokens(userId, 10);
  });

  describe("Query", () => {
    it("should return hello world", () => {
      const result = resolvers.Query.hello();
      expect(result).toBe("Hello World!");
    });

    it("should return user when authenticated", () => {
      const result = resolvers.Query.me(null, null, context);
      expect(result).toEqual(context.user);
    });

    it("should throw error when not authenticated", () => {
      expect(() => {
        resolvers.Query.me(null, null, {});
      }).toThrow("Not authenticated");
    });
  });

  describe("Mutation", () => {
    describe("queryPixKey", () => {
      it("should throw error when not authenticated", async () => {
        await expect(
          resolvers.Mutation.queryPixKey(null, { key: "12345678900" }, {})
        ).rejects.toThrow("Authentication required");
      });

      it("should throw error when rate limit exceeded", async () => {
        await setUserTokens(userId, 0);
        await expect(
          resolvers.Mutation.queryPixKey(null, { key: "12345678900" }, context)
        ).rejects.toThrow("Rate limit exceeded. Please try again later.");
      });

      it("should return success response for valid PIX key", async () => {
        jest.spyOn(global.Math, "random").mockReturnValue(0.8);

        const result = await resolvers.Mutation.queryPixKey(
          null,
          { key: "12345678900" },
          context
        );

        expect(result).toEqual({
          success: true,
          message: "PIX key found",
          key: "12345678900",
          accountInfo: {
            name: "João Silva",
            bank: "Banco Digital",
            accountType: "Checking",
            accountNumber: "12345-6",
          },
        });

        jest.spyOn(global.Math, "random").mockRestore();
      });

      it("should return failure response for invalid PIX key", async () => {
        jest.spyOn(global.Math, "random").mockReturnValue(0.1);

        const result = await resolvers.Mutation.queryPixKey(
          null,
          { key: "invalid-key" },
          context
        );

        expect(result).toEqual({
          success: false,
          message: "PIX key not found or service unavailable",
        });

        jest.spyOn(global.Math, "random").mockRestore();
      });
    });
  });
});

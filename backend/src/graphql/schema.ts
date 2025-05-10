import { gql } from "apollo-server-koa";
import {
  consumeToken,
  processQueryResult,
  getUserTokens,
  getAllUserTokens,
} from "../services/redisLeakyBucket";
import { register, login } from "../services/auth";

export const typeDefs = gql`
  type User {
    id: ID!
    username: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type TokenBucket {
    tokens: Int!
    lastRefill: String!
    userId: String
  }

  input RegisterInput {
    username: String!
    password: String!
  }

  input LoginInput {
    username: String!
    password: String!
  }

  type PixKeyResponse {
    success: Boolean!
    message: String
    key: String
    accountInfo: AccountInfo
  }

  type AccountInfo {
    name: String
    bank: String
    accountType: String
    accountNumber: String
  }

  type Query {
    hello: String
    me: User
    getTokens: TokenBucket
    getAllTokens: [TokenBucket]
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    queryPixKey(key: String!): PixKeyResponse
    getTokens: TokenBucket
  }
`;

const pixKeyDatabase = [
  {
    key: "12345678900",
    accountInfo: {
      name: "João Silva",
      bank: "Banco Digital",
      accountType: "Checking",
      accountNumber: "12345-6",
    },
  },
  {
    key: "joao@example.com",
    accountInfo: {
      name: "João Silva",
      bank: "Banco Digital",
      accountType: "Savings",
      accountNumber: "65432-1",
    },
  },
];

const simulateExternalCall = (
  key: string
): { success: boolean; data?: any } => {
  const shouldFail = Math.random() < 0.2;

  if (shouldFail) {
    return { success: false };
  }

  const foundKey = pixKeyDatabase.find((entry) => entry.key === key);
  if (!foundKey) {
    return { success: false };
  }

  return { success: true, data: foundKey };
};

interface AuthResponse {
  token: string;
  id: string;
  username: string;
}

const getTokensBucket = async (context: any) => {
  if (!context.user) {
    throw new Error("Authentication required");
  }

  const userId = context.user.id;
  const tokenBucket = await getUserTokens(userId);

  return {
    tokens: tokenBucket.tokens,
    lastRefill: tokenBucket.lastRefill.toISOString(),
    userId: tokenBucket.userId,
  };
};

// Função para verificar se o usuário é admin
// Na vida real, isso viria do modelo de usuário
const isAdmin = (context: any): boolean => {
  // Exemplo simples para fins de demonstração
  // Em produção, isso dependeria de um campo no modelo de usuário ou outra lógica
  const adminUserIds = ['admin', '1', 'admin-user'];
  return context.user && adminUserIds.includes(context.user.id);
};

export const resolvers = {
  Query: {
    hello: () => "Hello World!",
    me: (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }
      return context.user;
    },
    getTokens: async (_: any, __: any, context: any) => {
      return await getTokensBucket(context);
    },
    // Nova consulta para painel administrativo
    getAllTokens: async (_: any, __: any, context: any) => {
      // Verificar se o usuário é um administrador
      if (!isAdmin(context)) {
        throw new Error("Admin privileges required");
      }
      
      const buckets = await getAllUserTokens();
      
      return buckets.map(bucket => ({
        userId: bucket.userId,
        tokens: bucket.tokens,
        lastRefill: bucket.lastRefill.toISOString(),
      }));
    },
  },
  Mutation: {
    register: async (
      _: any,
      { input }: { input: { username: string; password: string } }
    ) => {
      const response = (await register({
        request: { body: input },
      } as any)) as AuthResponse;

      if (!response) {
        throw new Error("Registration failed");
      }

      return {
        token: response.token,
        user: {
          id: response.id,
          username: response.username,
        },
      };
    },
    login: async (
      _: any,
      { input }: { input: { username: string; password: string } }
    ) => {
      const response = (await login({
        request: { body: input },
      } as any)) as AuthResponse;

      if (!response) {
        throw new Error("Login failed");
      }

      return {
        token: response.token,
        user: {
          id: response.id,
          username: response.username,
        },
      };
    },
    queryPixKey: async (_: any, { key }: { key: string }, context: any) => {
      const { user } = context;

      if (!user) {
        throw new Error("Authentication required");
      }

      const hasToken = await consumeToken(user.id);
      if (!hasToken) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }

      const result = simulateExternalCall(key);

      await processQueryResult(user.id, result.success);

      if (!result.success) {
        return {
          success: false,
          message: "PIX key not found or service unavailable",
        };
      }

      return {
        success: true,
        message: "PIX key found",
        key: result.data.key,
        accountInfo: result.data.accountInfo,
      };
    },
    getTokens: async (_: any, __: any, context: any) => {
      return await getTokensBucket(context);
    },
  },
};

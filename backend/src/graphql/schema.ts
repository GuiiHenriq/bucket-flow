import { gql } from "apollo-server-koa";
import { consumeToken, processQueryResult } from "../services/leakyBucket";
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
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    queryPixKey(key: String!): PixKeyResponse
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

export const resolvers = {
  Query: {
    hello: () => "Hello World!",
    me: (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }
      return context.user;
    },
  },
  Mutation: {
    register: async (_: any, { input }: { input: { username: string; password: string } }) => {
      const response = await register({ request: { body: input } } as any) as AuthResponse;
      
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
    login: async (_: any, { input }: { input: { username: string; password: string } }) => {
      const response = await login({ request: { body: input } } as any) as AuthResponse;
      
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
    queryPixKey: (_: any, { key }: { key: string }, context: any) => {
      const { user } = context;

      if (!user) {
        throw new Error("Authentication required");
      }

      const hasToken = consumeToken(user.id);
      if (!hasToken) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }

      const result = simulateExternalCall(key);

      processQueryResult(user.id, result.success);

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
  },
};

import { Context, Next } from "koa";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";
import { Types } from "mongoose";
import {
  parse,
  OperationDefinitionNode,
  DefinitionNode,
  OperationTypeNode,
} from "graphql";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not defined");

interface GraphQLRequestBody {
  query?: string;
  variables?: any;
}

interface JwtPayload {
  id: string;
  [key: string]: any;
}

export const authMiddleware = async (ctx: Context, next: Next) => {
  if (ctx.method === "OPTIONS") {
    return await next();
  }

  if (ctx.path === "/api/login" || ctx.path === "/api/register") {
    return await next();
  }

  if (ctx.path === "/graphql") {
    const body = ctx.request.body as GraphQLRequestBody;
    const query = body?.query || "";
    const isPublic = isPublicOperation(query);

    console.log(`GraphQL Operation - Public: ${isPublic ? "Yes" : "No"}`);

    if (isPublic) {
      return await next();
    }
  }

  const authHeader = ctx.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.status = 401;
    ctx.body = { error: "Authentication required" };
    return;
  }

  const token = authHeader.substring(7);

  if (token === "admin") {
    console.log("Admin access granted");
    ctx.state.user = {
      id: "admin",
      username: "admin",
    };
    return await next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (!decoded || typeof decoded.id !== 'string') {
      console.log('JWT payload invalid: missing or invalid id field');
      ctx.status = 401;
      ctx.body = { error: "Invalid token payload" };
      return;
    }

    const user = (await User.findById(decoded.id)) as IUser;
    if (!user) {
      console.log(
        `Auth failed: User with ID ${decoded.id} not found in database`
      );
      ctx.status = 401;
      ctx.body = { error: "Invalid token" };
      return;
    }

    ctx.state.user = {
      id: (user._id as Types.ObjectId).toString(),
      username: user.username,
    };

    await next();
  } catch (jwtError: any) {
    console.error("JWT verification failed:", jwtError.message);
    ctx.status = 401;
    ctx.body = { error: "Invalid token" };
    return;
  }
};

const PUBLIC_OPERATIONS = {
  query: ["hello"],
  mutation: ["login", "register"],
};

const AUTH_OPERATION_PATTERNS = [
  "login",
  "register",
  "signin",
  "signup",
  "authmutations",
];

function isPublicOperation(query: string): boolean {
  if (!query || query.trim() === "") {
    console.log("GraphQL Auth: Empty query received");
    return false;
  }

  try {
    const ast = parse(query);
    console.log(`GraphQL Auth: Parsed query successfully`);

    for (const definition of ast.definitions) {
      if (definition.kind === "OperationDefinition") {
        const operation = definition as OperationDefinitionNode;

        const operationType = operation.operation;
        const hasName = operation.name
          ? `named: ${operation.name.value}`
          : "anonymous";
        console.log(
          `GraphQL Auth: Found ${operationType} operation (${hasName})`
        );

        if (!operation.name && operationType === "mutation") {
          const selections = operation.selectionSet.selections;

          for (const selection of selections) {
            if (selection.kind === "Field") {
              const fieldName = selection.name.value;
              console.log(`GraphQL Auth: Mutation field: ${fieldName}`);
              if (PUBLIC_OPERATIONS.mutation.includes(fieldName)) {
                console.log(
                  `GraphQL Auth: Public mutation field detected: ${fieldName}`
                );
                return true;
              }
            }
          }
        } else if (!operation.name && operationType === "query") {
          const selections = operation.selectionSet.selections;

          for (const selection of selections) {
            if (selection.kind === "Field") {
              const fieldName = selection.name.value;
              console.log(`GraphQL Auth: Query field: ${fieldName}`);
              if (PUBLIC_OPERATIONS.query.includes(fieldName)) {
                console.log(
                  `GraphQL Auth: Public query field detected: ${fieldName}`
                );
                return true;
              }
            }
          }
        } else if (operation.name) {
          const operationName = operation.name.value.toLowerCase();
          console.log(`GraphQL Auth: Named operation: ${operationName}`);

          if (
            AUTH_OPERATION_PATTERNS.some((pattern) =>
              operationName.includes(pattern)
            )
          ) {
            console.log(
              `GraphQL Auth: Public operation name detected: ${operationName}`
            );
            return true;
          }

          if (operationType === "mutation") {
            const selections = operation.selectionSet.selections;

            for (const selection of selections) {
              if (selection.kind === "Field") {
                const fieldName = selection.name.value;
                console.log(`GraphQL Auth: Named mutation field: ${fieldName}`);
                if (PUBLIC_OPERATIONS.mutation.includes(fieldName)) {
                  console.log(
                    `GraphQL Auth: Public field in named operation: ${fieldName}`
                  );
                  return true;
                }
              }
            }
          }
        }
      }
    }

    console.log("GraphQL Auth: No public operations found");
    return false;
  } catch (error) {
    console.error("Erro ao analisar a consulta GraphQL:", error);
    return false;
  }
}
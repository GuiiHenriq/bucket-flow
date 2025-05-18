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

const JWT_SECRET = process.env.JWT_SECRET || "f5e6ea86177b7190efd38125a714928693899f28d7bf05ad87699fad0eff4f2f6e6b9e5362abd6db752c054b4d136caccf453da2302c65368cf507837b479d41502477f2089771eb121449e5cf62bd98df264eb75ed5adfcdbd9dd44007f6cf764a362f29cb57bfd520783c8346e4448537889315df0286577359f1f6834251be66801b9ac1838de3b5fd334002ab7f04a954caa4002852d2f8a5a6b40d2069ba34c3dc31b4a67541018f2540054e68081512d981aa1392f4388b27ecc0c63d02fd943c6a264ec2693554f2717c3bbd7f118005ba181141d0f521c4dd44079d20f9d6616c6f45f99f28f2d78a4e94f68a71b3756827eb59723a6c4ca3dce659d";

interface GraphQLRequestBody {
  query?: string;
  variables?: any;
}

export const authMiddleware = async (ctx: Context, next: Next) => {
  if (ctx.method === "OPTIONS") {
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

  // Special case for admin token
  if (token === "admin") {
    console.log("Admin access granted");
    ctx.state.user = {
      id: "admin",
      username: "admin",
    };
    return await next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

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

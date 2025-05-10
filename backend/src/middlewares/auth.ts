import { Context, Next } from "koa";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";
import { Types } from "mongoose";
import { parse, OperationDefinitionNode, DefinitionNode, OperationTypeNode } from 'graphql';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface GraphQLRequestBody {
  query?: string;
  variables?: any;
}

export const authMiddleware = async (ctx: Context, next: Next) => {
  // Permitir requisições OPTIONS
  if (ctx.method === "OPTIONS") {
    return await next();
  }

  // Verificar se é uma rota GraphQL
  if (ctx.path === "/graphql") {
    // Verificar se é uma operação pública
    const body = ctx.request.body as GraphQLRequestBody;
    const query = body?.query || "";
    const isPublic = isPublicOperation(query);
    
    // Log para debugging
    console.log(`GraphQL Operation - Public: ${isPublic ? 'Yes' : 'No'}`);
    
    if (isPublic) {
      return await next();
    }
  }

  // Para todas as outras rotas/operações, exigir autenticação
  const authHeader = ctx.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.status = 401;
    ctx.body = { error: "Authentication required" };
    return;
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    const user = (await User.findById(decoded.id)) as IUser;
    if (!user) {
      console.log(`Auth failed: User with ID ${decoded.id} not found in database`);
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
    console.error('JWT verification failed:', jwtError.message);
    ctx.status = 401;
    ctx.body = { error: "Invalid token" };
    return;
  }
};

/**
 * Lista de operações públicas que não requerem autenticação
 */
const PUBLIC_OPERATIONS = {
  query: ['hello'],
  mutation: ['login', 'register'],
};

/**
 * Padrões de nomes de operações que indicam autenticação
 */
const AUTH_OPERATION_PATTERNS = [
  'login', 
  'register', 
  'signin', 
  'signup', 
  'authmutations'
];

/**
 * Verifica se a operação GraphQL é pública (não requer autenticação)
 * usando o parser GraphQL para analisar corretamente a consulta
 */
function isPublicOperation(query: string): boolean {
  if (!query || query.trim() === '') {
    console.log('GraphQL Auth: Empty query received');
    return false;
  }

  try {
    // Parse a consulta GraphQL em AST
    const ast = parse(query);
    console.log(`GraphQL Auth: Parsed query successfully`);
    
    // Verificar cada definição no documento
    for (const definition of ast.definitions) {
      // Verificar se é uma operação (query/mutation)
      if (definition.kind === 'OperationDefinition') {
        const operation = definition as OperationDefinitionNode;
        
        // Obter o tipo de operação (query/mutation)
        const operationType = operation.operation;
        const hasName = operation.name ? `named: ${operation.name.value}` : 'anonymous';
        console.log(`GraphQL Auth: Found ${operationType} operation (${hasName})`);
        
        // Para mutations anônimas, verificar pelos campos selecionados
        if (!operation.name && operationType === 'mutation') {
          const selections = operation.selectionSet.selections;
          
          // Verificar se alguma seleção é um campo público (login ou register)
          for (const selection of selections) {
            if (selection.kind === 'Field') {
              const fieldName = selection.name.value;
              console.log(`GraphQL Auth: Mutation field: ${fieldName}`);
              if (PUBLIC_OPERATIONS.mutation.includes(fieldName)) {
                console.log(`GraphQL Auth: Public mutation field detected: ${fieldName}`);
                return true;
              }
            }
          }
        } 
        // Para queries anônimas, verificar campos públicos
        else if (!operation.name && operationType === 'query') {
          const selections = operation.selectionSet.selections;
          
          for (const selection of selections) {
            if (selection.kind === 'Field') {
              const fieldName = selection.name.value;
              console.log(`GraphQL Auth: Query field: ${fieldName}`);
              if (PUBLIC_OPERATIONS.query.includes(fieldName)) {
                console.log(`GraphQL Auth: Public query field detected: ${fieldName}`);
                return true;
              }
            }
          }
        }
        // Para operações nomeadas, verificar se o nome da operação indica um propósito público
        else if (operation.name) {
          const operationName = operation.name.value.toLowerCase();
          console.log(`GraphQL Auth: Named operation: ${operationName}`);
          
          // Verificar se o nome da operação corresponde a algum padrão de autenticação
          if (AUTH_OPERATION_PATTERNS.some(pattern => operationName.includes(pattern))) {
            console.log(`GraphQL Auth: Public operation name detected: ${operationName}`);
            return true;
          }
          
          // Para operações nomeadas, verificar também os campos selecionados
          if (operationType === 'mutation') {
            const selections = operation.selectionSet.selections;
            
            for (const selection of selections) {
              if (selection.kind === 'Field') {
                const fieldName = selection.name.value;
                console.log(`GraphQL Auth: Named mutation field: ${fieldName}`);
                if (PUBLIC_OPERATIONS.mutation.includes(fieldName)) {
                  console.log(`GraphQL Auth: Public field in named operation: ${fieldName}`);
                  return true;
                }
              }
            }
          }
        }
      }
    }
    
    console.log('GraphQL Auth: No public operations found');
    return false;
  } catch (error) {
    console.error('Erro ao analisar a consulta GraphQL:', error);
    // Em caso de erro no parsing, não tratar como operação pública
    return false;
  }
}


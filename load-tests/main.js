import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Métricas personalizadas
const authFailRate = new Rate('auth_failures');
const tokenConsumptionRate = new Counter('tokens_consumed');
const responseTimeMs = new Trend('response_time_ms');
const pixKeyQueriesTotal = new Counter('pix_key_queries_total');
const pixKeyQueriesSuccess = new Counter('pix_key_queries_success');
const pixKeyQueriesFailed = new Counter('pix_key_queries_failed');

// Configuração do teste
export const options = {
  scenarios: {
    // Teste de carga com VUs constantes
    constant_users: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
    // Teste de pico de carga para verificar comportamento sob demanda repentina
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 20 },
        { duration: '20s', target: 50 },
        { duration: '10s', target: 0 },
      ],
      startTime: '30s',
    },
    // Teste específico para o Leaky Bucket
    leaky_bucket_test: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 15,
      maxDuration: '2m',
      startTime: '70s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% das requisições devem ser concluídas em menos de 1s
    'auth_failures': ['rate<0.1'],     // Taxa de falhas de autenticação deve ser menor que 10%
    'pix_key_queries_failed': ['count<100'], // Limitar o número total de falhas nas consultas PIX
  },
};

// URLs e variáveis globais
const BASE_URL = 'http://localhost:3000/graphql';
let users = new Map();

// Funções auxiliares
function makeGraphQLRequest(query, variables = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const payload = JSON.stringify({
    query: query,
    variables: variables
  });
  
  const response = http.post(BASE_URL, payload, { headers });
  responseTimeMs.add(response.timings.duration);
  
  return response;
}

// Queries e Mutations GraphQL
const registerMutation = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        username
      }
    }
  }
`;

const loginMutation = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        username
      }
    }
  }
`;

const getTokensQuery = `
  query GetTokens {
    getTokens {
      tokens
      lastRefill
    }
  }
`;

const queryPixKeyMutation = `
  mutation QueryPixKey($key: String!) {
    queryPixKey(key: $key) {
      success
      message
      key
      accountInfo {
        name
        bank
        accountType
        accountNumber
      }
    }
  }
`;

// Funções principais de teste
function registerUser() {
  const username = `user_${randomIntBetween(1000, 9999)}`;
  const password = `pass_${randomIntBetween(1000, 9999)}`;
  
  const response = makeGraphQLRequest(registerMutation, {
    input: { username, password }
  });
  
  const success = check(response, {
    'registro bem-sucedido': (r) => r.status === 200 && !r.json().errors,
  });
  
  if (!success) {
    authFailRate.add(1);
    return null;
  }
  
  authFailRate.add(0);
  const result = response.json().data.register;
  
  // Armazenar os dados do usuário para uso posterior
  users.set(username, {
    username,
    password,
    token: result.token,
    id: result.user.id
  });
  
  return users.get(username);
}

function loginUser(username, password) {
  const response = makeGraphQLRequest(loginMutation, {
    input: { username, password }
  });
  
  const success = check(response, {
    'login bem-sucedido': (r) => r.status === 200 && !r.json().errors,
  });
  
  if (!success) {
    authFailRate.add(1);
    return null;
  }
  
  authFailRate.add(0);
  return response.json().data.login;
}

function checkTokens(token) {
  const response = makeGraphQLRequest(getTokensQuery, {}, token);
  
  check(response, {
    'consulta de tokens bem-sucedida': (r) => r.status === 200 && !r.json().errors,
    'tokens visíveis': (r) => r.json().data && r.json().data.getTokens && typeof r.json().data.getTokens.tokens === 'number',
  });
  
  if (response.status === 200 && !response.json().errors) {
    return response.json().data.getTokens.tokens;
  }
  
  return null;
}

function queryPixKey(token, key) {
  pixKeyQueriesTotal.add(1);
  
  const response = makeGraphQLRequest(queryPixKeyMutation, { key }, token);
  
  const success = check(response, {
    'requisição pix completa': (r) => r.status === 200,
    'sem erros de servidor': (r) => !r.json().errors,
  });
  
  if (success && response.json().data && response.json().data.queryPixKey) {
    const result = response.json().data.queryPixKey;
    
    if (result.success) {
      pixKeyQueriesSuccess.add(1);
    } else {
      pixKeyQueriesFailed.add(1);
      tokenConsumptionRate.add(1);
    }
    
    return result;
  }
  
  pixKeyQueriesFailed.add(1);
  return null;
}

// Teste de carga padrão
export default function() {
  const user = registerUser();
  
  if (user) {
    // Verificar saldo inicial de tokens
    const initialTokens = checkTokens(user.token);
    
    if (initialTokens !== null) {
      console.log(`Usuário ${user.username} iniciou com ${initialTokens} tokens`);
      
      // Realizar algumas consultas PIX (com chaves válidas e inválidas)
      const validKeys = ['12345678900', 'joao@example.com'];
      const invalidKeys = ['invalid1', 'invalid2', '99999999999'];
      
      // Consulta com chave válida
      const validKey = validKeys[randomIntBetween(0, validKeys.length - 1)];
      const validResult = queryPixKey(user.token, validKey);
      
      // Consulta com chave inválida
      const invalidKey = invalidKeys[randomIntBetween(0, invalidKeys.length - 1)];
      const invalidResult = queryPixKey(user.token, invalidKey);
      
      // Verificar tokens após as consultas
      const finalTokens = checkTokens(user.token);
      
      if (finalTokens !== null && initialTokens !== null) {
        console.log(`Usuário ${user.username} terminou com ${finalTokens} tokens (diferença: ${initialTokens - finalTokens})`);
      }
    }
  }
  
  sleep(1);
}

// Teste específico do Leaky Bucket
export function leakyBucketTest() {
  const user = registerUser();
  
  if (!user) return;
  
  // Verificar tokens iniciais
  let tokens = checkTokens(user.token);
  console.log(`[Leaky Bucket] Usuário ${user.username} iniciou com ${tokens} tokens`);
  
  // Fazer consultas até esgotar os tokens
  let attempts = 0;
  let lastTokenCount = tokens;
  
  while (tokens > 0 && attempts < 20) {
    console.log(`[Leaky Bucket] Tentativa ${attempts + 1}: ${tokens} tokens restantes`);
    
    // Usar chave inválida para garantir falha e consumo de token
    queryPixKey(user.token, `invalid_key_${randomIntBetween(1000, 9999)}`);
    
    // Esperar um pouco antes de verificar novamente
    sleep(0.5);
    
    // Verificar tokens após a consulta
    tokens = checkTokens(user.token);
    
    // Verificar se o token foi consumido
    if (lastTokenCount > tokens) {
      console.log(`[Leaky Bucket] Token consumido: ${lastTokenCount} -> ${tokens}`);
    } else {
      console.log(`[Leaky Bucket] Nenhum token consumido: ${tokens}`);
    }
    
    lastTokenCount = tokens;
    attempts++;
  }
  
  // Verificar se o usuário foi bloqueado quando os tokens acabaram
  if (tokens === 0) {
    console.log(`[Leaky Bucket] Usuário ${user.username} esgotou os tokens após ${attempts} tentativas`);
    
    // Tentar mais uma consulta para verificar o bloqueio
    const result = queryPixKey(user.token, 'qualquer_valor');
    console.log(`[Leaky Bucket] Resultado após esgotar tokens: ${JSON.stringify(result)}`);
  }
  
  sleep(2);
} 
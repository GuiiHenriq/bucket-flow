import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Métricas personalizadas
const apiResponseTime = new Trend('api_response_time');
const authResponseTime = new Trend('auth_response_time');
const pixQueryResponseTime = new Trend('pix_query_response_time');
const failureRate = new Rate('failure_rate');

// Configuração do teste
export const options = {
  scenarios: {
    api_performance: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 5, duration: '30s' },   // Ramp-up para 5 RPS
        { target: 10, duration: '30s' },  // Ramp-up para 10 RPS
        { target: 20, duration: '30s' },  // Ramp-up para 20 RPS
        { target: 5, duration: '30s' },   // Ramp-down para 5 RPS
        { target: 0, duration: '10s' },   // Ramp-down para encerrar o teste
      ],
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<1000'],   // 95% das requisições em menos de 1s
    'api_response_time': ['avg<300'],      // Tempo médio de resposta abaixo de 300ms
    'failure_rate': ['rate<0.05'],         // Taxa de falha menor que 5%
  },
};

// URLs e variáveis globais
const BASE_URL = 'http://localhost:3000/graphql';
const users = new Map();

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

const queryPixKeyMutation = `
  mutation QueryPixKey($key: String!) {
    queryPixKey(key: $key) {
      success
      message
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
  
  const start = new Date();
  const response = http.post(BASE_URL, payload, { headers });
  const duration = new Date() - start;
  
  apiResponseTime.add(duration);
  
  check(response, {
    'requisição bem-sucedida': (r) => r.status === 200,
    'sem erros no servidor': (r) => !r.json().errors,
  }) || failureRate.add(1);
  
  return response;
}

// Funções principais
function registerAndLoginUser() {
  const username = `user_perf_${randomString(5)}`;
  const password = `pass_${randomString(8)}`;
  
  const start = new Date();
  
  // Registro
  const registerResponse = makeGraphQLRequest(registerMutation, {
    input: { username, password }
  });
  
  const registerSuccess = check(registerResponse, {
    'registro bem-sucedido': (r) => r.status === 200 && !r.json().errors,
  });
  
  if (!registerSuccess) {
    failureRate.add(1);
    return null;
  }
  
  const registerData = registerResponse.json().data.register;
  
  // Login (opcional, já que o registro já retorna token)
  const loginResponse = makeGraphQLRequest(loginMutation, {
    input: { username, password }
  });
  
  const loginSuccess = check(loginResponse, {
    'login bem-sucedido': (r) => r.status === 200 && !r.json().errors,
  });
  
  if (!loginSuccess) {
    failureRate.add(1);
    return null;
  }
  
  const duration = new Date() - start;
  authResponseTime.add(duration);
  
  // Armazenar usuário
  const user = {
    username,
    password,
    token: registerData.token,
    id: registerData.user.id
  };
  
  users.set(username, user);
  return user;
}

function queryRandomPixKey(token) {
  // Lista de chaves PIX (algumas válidas, outras inválidas)
  const pixKeys = [
    '12345678900',           // Válida
    'joao@example.com',      // Válida
    'random@invalid.com',    // Inválida
    'invalid_key',           // Inválida
    '99999999999'            // Inválida
  ];
  
  // Selecionar uma chave aleatória
  const key = pixKeys[Math.floor(Math.random() * pixKeys.length)];
  
  const start = new Date();
  const response = makeGraphQLRequest(queryPixKeyMutation, { key }, token);
  const duration = new Date() - start;
  
  pixQueryResponseTime.add(duration);
  
  return response;
}

// Função principal de teste
export default function() {
  // 70% do tempo fazemos operações com usuários já registrados
  // 30% do tempo criamos novos usuários
  const shouldCreateNewUser = Math.random() < 0.3 || users.size === 0;
  
  let user;
  
  if (shouldCreateNewUser) {
    user = registerAndLoginUser();
  } else {
    // Pegar um usuário aleatório existente
    const userKeys = Array.from(users.keys());
    const randomUsername = userKeys[Math.floor(Math.random() * userKeys.length)];
    user = users.get(randomUsername);
  }
  
  if (!user) {
    console.error('Falha ao obter usuário válido');
    failureRate.add(1);
    sleep(1);
    return;
  }
  
  // Verificar tokens do usuário
  const tokensResponse = makeGraphQLRequest(getTokensQuery, {}, user.token);
  
  // Realizar consulta PIX
  const pixResponse = queryRandomPixKey(user.token);
  
  // Esperar um pouco antes da próxima iteração
  sleep(Math.random() * 2 + 0.5); // Entre 0.5 e 2.5 segundos
} 
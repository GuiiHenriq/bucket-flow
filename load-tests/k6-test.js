import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Métricas personalizadas
const registerTime = new Trend('register_time');
const loginTime = new Trend('login_time');
const pixQueryTime = new Trend('pix_query_time');
const successRate = new Rate('success_rate');
const tokenConsumptionRate = new Counter('tokens_consumed');

// Configuração do teste
export const options = {
  stages: [
    { duration: '10s', target: 5 },  // Rampa de 5 usuários em 10 segundos
    { duration: '20s', target: 10 }, // Aumentar para 10 usuários em 20 segundos
    { duration: '10s', target: 0 },  // Reduzir para 0 em 10 segundos
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // 95% das requisições abaixo de 1s
    'success_rate': ['rate>0.9'],        // Taxa de sucesso acima de 90%
  },
};

// URL da API
const API_URL = 'http://localhost:3000/graphql';

// Armazenar usuários para reutilização
const users = new Map();

// Queries e mutations GraphQL
const registerMutation = `
  mutation Register($username: String!, $password: String!) {
    register(input: { username: $username, password: $password }) {
      token
      user {
        id
        username
      }
    }
  }
`;

const loginMutation = `
  mutation Login($username: String!, $password: String!) {
    login(input: { username: $username, password: $password }) {
      token
      user {
        id
        username
      }
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

// Função auxiliar para fazer requisições GraphQL
function graphqlRequest(query, variables = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const payload = JSON.stringify({
    query,
    variables
  });
  
  return http.post(API_URL, payload, { headers });
}

// Funções do teste
function registerUser() {
  const username = `user_${Math.floor(Math.random() * 10000)}`;
  const password = `pass_${Math.floor(Math.random() * 10000)}`;
  
  const start = new Date();
  const response = graphqlRequest(registerMutation, {
    username,
    password
  });
  const duration = new Date() - start;
  
  registerTime.add(duration);
  
  const success = check(response, {
    'registro com status 200': (r) => r.status === 200,
    'registro sem erros': (r) => !r.json().errors,
    'token recebido no registro': (r) => r.json().data?.register?.token,
  });
  
  successRate.add(success ? 1 : 0);
  
  if (success) {
    const data = response.json().data.register;
    users.set(username, {
      username,
      password,
      token: data.token,
      id: data.user.id
    });
    return users.get(username);
  }
  
  return null;
}

function loginUser(username, password) {
  const start = new Date();
  const response = graphqlRequest(loginMutation, {
    username,
    password
  });
  const duration = new Date() - start;
  
  loginTime.add(duration);
  
  const success = check(response, {
    'login com status 200': (r) => r.status === 200,
    'login sem erros': (r) => !r.json().errors,
    'token recebido no login': (r) => r.json().data?.login?.token,
  });
  
  successRate.add(success ? 1 : 0);
  
  if (success) {
    return response.json().data.login;
  }
  
  return null;
}

function getTokens(token) {
  const response = graphqlRequest(getTokensQuery, {}, token);
  
  const success = check(response, {
    'consulta de tokens com status 200': (r) => r.status === 200,
    'consulta de tokens sem erros': (r) => !r.json().errors,
  });
  
  successRate.add(success ? 1 : 0);
  
  if (success && response.json().data?.getTokens) {
    return response.json().data.getTokens.tokens;
  }
  
  return null;
}

function queryPixKey(token, key) {
  const start = new Date();
  const response = graphqlRequest(queryPixKeyMutation, { key }, token);
  const duration = new Date() - start;
  
  pixQueryTime.add(duration);
  
  const success = check(response, {
    'consulta pix com status 200': (r) => r.status === 200,
    'consulta pix sem erros': (r) => !r.json().errors,
  });
  
  successRate.add(success ? 1 : 0);
  
  if (success && response.json().data?.queryPixKey) {
    const result = response.json().data.queryPixKey;
    
    if (!result.success) {
      tokenConsumptionRate.add(1);
    }
    
    return result;
  }
  
  return null;
}

// Funções para testes específicos
function testLeakyBucket(user) {
  // Verificar tokens iniciais
  let tokens = getTokens(user.token);
  console.log(`[Leaky Bucket] Usuário ${user.username} iniciou com ${tokens} tokens`);
  
  // Lista de chaves inválidas
  const invalidKeys = ['invalid_key', 'not_exists', '99999999999'];
  
  // Fazer consultas até que os tokens sejam reduzidos
  for (let i = 0; i < 3 && tokens > 0; i++) {
    const invalidKey = invalidKeys[i % invalidKeys.length];
    const result = queryPixKey(user.token, invalidKey);
    
    // Verificar tokens após a consulta
    const newTokens = getTokens(user.token);
    
    console.log(`[Leaky Bucket] Após consulta ${i+1}: ${tokens} -> ${newTokens} tokens`);
    tokens = newTokens;
    
    sleep(0.5);
  }
}

// Teste principal
export default function() {
  // Registrar um novo usuário
  const user = registerUser();
  
  if (user) {
    // Testar login com o usuário registrado
    const loginResult = loginUser(user.username, user.password);
    
    if (loginResult) {
      // Testar consulta de tokens
      const tokens = getTokens(user.token);
      console.log(`Usuário ${user.username} tem ${tokens} tokens`);
      
      // Fazer uma consulta PIX válida
      const validResult = queryPixKey(user.token, '12345678900');
      
      // Testar o mecanismo Leaky Bucket
      testLeakyBucket(user);
    }
  }
  
  sleep(1);
} 
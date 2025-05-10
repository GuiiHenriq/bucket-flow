import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Métricas personalizadas
const registerTime = new Trend('register_time');
const loginTime = new Trend('login_time');
const loginSuccessRate = new Rate('login_success_rate');
const registerSuccessRate = new Rate('register_success_rate');
const totalUsers = new Counter('total_users_created');

// Configuração do teste
export const options = {
  scenarios: {
    auth_test: {
      executor: 'constant-arrival-rate',
      rate: 5,              // 5 usuários por segundo
      timeUnit: '1s',       // Unidade de tempo
      duration: '1m',       // Duração total
      preAllocatedVUs: 50,  // Alocação inicial de VUs
      maxVUs: 100,          // Máximo de VUs
    },
    concurrent_logins: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '30s', target: 50 },
        { duration: '10s', target: 0 },
      ],
      startTime: '1m',
    }
  },
  thresholds: {
    'register_time': ['p(95)<1000'],          // 95% dos registros abaixo de 1s
    'login_time': ['p(95)<500'],              // 95% dos logins abaixo de 500ms
    'login_success_rate': ['rate>0.95'],      // Taxa de sucesso do login > 95%
    'register_success_rate': ['rate>0.95'],   // Taxa de sucesso do registro > 95%
  },
};

// URL da API
const BASE_URL = 'http://localhost:3000/graphql';

// Armazenar usuários registrados para testes de login
const registeredUsers = [];

// Queries GraphQL
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

// Função para fazer requisições GraphQL
function makeGraphQLRequest(query, variables = {}) {
  const payload = JSON.stringify({
    query: query,
    variables: variables
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  return http.post(BASE_URL, payload, params);
}

// Função para registrar um novo usuário
function registerUser() {
  const username = `auth_test_${randomString(8)}`;
  const password = `pass_${randomString(8)}`;
  
  const start = new Date();
  const response = makeGraphQLRequest(registerMutation, {
    input: { username, password }
  });
  const duration = new Date() - start;
  
  registerTime.add(duration);
  
  const success = check(response, {
    'registro retornou 200': (r) => r.status === 200,
    'registro sem erros': (r) => !r.json().errors,
    'token válido retornado': (r) => r.json().data?.register?.token?.length > 0,
  });
  
  registerSuccessRate.add(success ? 1 : 0);
  
  if (success) {
    totalUsers.add(1);
    const userData = {
      username,
      password,
      id: response.json().data.register.user.id,
      token: response.json().data.register.token
    };
    
    // Salvar para uso posterior
    registeredUsers.push(userData);
    return userData;
  }
  
  return null;
}

// Função para fazer login com um usuário existente
function loginUser(username, password) {
  const start = new Date();
  const response = makeGraphQLRequest(loginMutation, {
    input: { username, password }
  });
  const duration = new Date() - start;
  
  loginTime.add(duration);
  
  const success = check(response, {
    'login retornou 200': (r) => r.status === 200,
    'login sem erros': (r) => !r.json().errors,
    'token válido de login': (r) => r.json().data?.login?.token?.length > 0,
  });
  
  loginSuccessRate.add(success ? 1 : 0);
  return success;
}

// Teste principal - Registra novos usuários
export default function() {
  registerUser();
  sleep(0.5);
}

// Teste de login concorrente
export function concurrentLogins() {
  // Se não temos usuários registrados, registre um
  if (registeredUsers.length === 0) {
    registerUser();
    sleep(1);
    return;
  }
  
  // Selecione um usuário aleatório da lista de usuários registrados
  const userIndex = Math.floor(Math.random() * registeredUsers.length);
  const user = registeredUsers[userIndex];
  
  if (!user) {
    console.error('Falha ao obter usuário válido para login');
    loginSuccessRate.add(0);
    return;
  }
  
  // Realizar o login
  loginUser(user.username, user.password);
  sleep(0.5);
}

// Teste específico de sobrecarga com credenciais inválidas
export function invalidLoginAttempts() {
  // 80% dos logins com credenciais inválidas
  const username = `user_${randomString(8)}`;  // Usuário que não existe
  const password = 'senha_errada';
  
  const start = new Date();
  const response = makeGraphQLRequest(loginMutation, {
    input: { username, password }
  });
  const duration = new Date() - start;
  
  loginTime.add(duration);
  
  // Esperamos falha aqui, mas verificamos se a resposta é bem formada
  check(response, {
    'resposta de erro formatada corretamente': (r) => 
      r.status === 200 && r.json().errors && r.json().errors.length > 0
  });
  
  sleep(0.2);
} 
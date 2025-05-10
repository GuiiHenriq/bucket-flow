import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Métricas personalizadas
const tokenDecreaseTrend = new Trend('token_decrease');
const failedRequestsAfterDepletion = new Counter('failed_requests_after_depletion');

// Configuração do teste
export const options = {
  vus: 5,          // 5 usuários virtuais
  iterations: 5,   // Cada usuário faz 5 iterações
  thresholds: {
    'token_decrease': ['avg>0'],  // Média de diminuição de tokens deve ser maior que 0
    'http_req_duration': ['p(95)<1000'], // 95% das requisições abaixo de 1s
  },
};

// URL da API
const API_URL = 'http://localhost:3000/graphql';

// Queries GraphQL
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
    }
  }
`;

// Função auxiliar para requisições GraphQL
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

// Função principal do teste
export default function() {
  // 1. Registrar um novo usuário
  const username = `user_lb_${Math.floor(Math.random() * 10000)}`;
  const password = 'password123';
  
  const registerResponse = graphqlRequest(registerMutation, {
    username,
    password
  });
  
  const registerSuccess = check(registerResponse, {
    'registro bem-sucedido': (r) => r.status === 200 && !r.json().errors,
    'token obtido': (r) => r.json().data?.register?.token,
  });
  
  if (!registerSuccess) {
    console.error('Falha no registro do usuário');
    return;
  }
  
  const token = registerResponse.json().data.register.token;
  
  // 2. Verificar tokens iniciais
  const initialTokensResponse = graphqlRequest(getTokensQuery, {}, token);
  
  const initialCheckSuccess = check(initialTokensResponse, {
    'consulta tokens inicial bem-sucedida': (r) => r.status === 200 && !r.json().errors,
    'tokens iniciais disponíveis': (r) => r.json().data?.getTokens?.tokens > 0,
  });
  
  if (!initialCheckSuccess) {
    console.error('Falha ao verificar tokens iniciais');
    return;
  }
  
  const initialTokens = initialTokensResponse.json().data.getTokens.tokens;
  console.log(`Usuário ${username} iniciou com ${initialTokens} tokens`);
  
  // 3. Realizar consultas PIX inválidas para consumir tokens
  let currentTokens = initialTokens;
  const maxConsumptionAttempts = 15; // Limite máximo de tentativas
  let attemptsDone = 0;
  
  while (currentTokens > 0 && attemptsDone < maxConsumptionAttempts) {
    // Usar uma chave PIX inválida para garantir o consumo do token
    const invalidKey = `invalid_key_${Math.floor(Math.random() * 1000)}`;
    
    const pixResponse = graphqlRequest(queryPixKeyMutation, { key: invalidKey }, token);
    
    // Verificar tokens após a consulta
    const tokenCheckResponse = graphqlRequest(getTokensQuery, {}, token);
    
    if (tokenCheckResponse.status === 200 && !tokenCheckResponse.json().errors) {
      const newTokens = tokenCheckResponse.json().data.getTokens.tokens;
      
      // Verificar se tokens diminuíram
      if (newTokens < currentTokens) {
        const decrease = currentTokens - newTokens;
        tokenDecreaseTrend.add(decrease);
        console.log(`Tokens diminuíram: ${currentTokens} -> ${newTokens} (-${decrease})`);
      }
      
      currentTokens = newTokens;
    }
    
    // Aumentar contador de tentativas
    attemptsDone++;
    
    // Pequena pausa entre as requisições
    sleep(0.3);
  }
  
  // 4. Testar o bloqueio após esgotamento de tokens
  if (currentTokens <= 0) {
    console.log(`Tokens esgotados após ${attemptsDone} tentativas. Testando bloqueio...`);
    
    // Tentar fazer mais uma consulta PIX
    const blockedResponse = graphqlRequest(queryPixKeyMutation, { key: 'any_key' }, token);
    
    check(blockedResponse, {
      'requisição bloqueada com sucesso': (r) => 
        r.status === 200 && 
        r.json().errors && 
        r.json().errors[0].message.includes('Rate limit exceeded')
    });
    
    if (blockedResponse.json().errors && blockedResponse.json().errors[0].message.includes('Rate limit exceeded')) {
      console.log('Bloqueio de taxa funcionando corretamente!');
    } else {
      console.error('Falha no bloqueio de taxa após esgotamento de tokens');
      failedRequestsAfterDepletion.add(1);
    }
  } else {
    console.log(`Não foi possível esgotar os tokens após ${attemptsDone} tentativas.`);
  }
  
  // 5. Pequena pausa antes da próxima iteração
  sleep(1);
} 
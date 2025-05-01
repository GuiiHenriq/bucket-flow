import {
  Environment,
  Network,
  RecordSource,
  Store,
} from 'relay-runtime';
import type {
  RequestParameters,
  Variables,
} from 'relay-runtime';

// Objeto para armazenar a última resposta
export const networkLogger = {
  lastResponse: null as any,
  listeners: [] as ((response: any) => void)[],
  
  // Método para registrar uma nova resposta
  logResponse(response: any) {
    this.lastResponse = response;
    // Notificar todos os ouvintes sobre a nova resposta
    this.listeners.forEach(listener => listener(response));
  },
  
  // Método para adicionar um ouvinte de eventos
  addListener(listener: (response: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
};

// Função para obter o token de autenticação da API
async function getAuthToken() {
  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: "user1",
        password: "password1"
      }),
    });
    
    if (!response.ok) {
      throw new Error('Falha na autenticação');
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Erro ao obter token:', error);
    return null;
  }
}

// Armazenamento em memória do token
let authToken: string | null = null;

// Função para garantir que temos um token válido
async function ensureToken() {
  if (!authToken) {
    authToken = await getAuthToken();
  }
  return authToken;
}

// Função que busca resultados de operações GraphQL
async function fetchGraphQL(operation: RequestParameters, variables: Variables) {
  // Obtém o token antes de fazer a requisição GraphQL
  const token = await ensureToken();
  
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      query: operation.text,
      variables,
    }),
  });

  const result = await response.json();
  
  // Registrar a resposta no logger
  networkLogger.logResponse({
    operation: operation.name,
    variables,
    response: result
  });
  
  return result;
}

// Criação da camada de rede a partir da função fetch
const network = Network.create(fetchGraphQL);

// Criação do store
const store = new Store(new RecordSource());

// Criação do ambiente usando esta rede
const environment = new Environment({
  network,
  store,
});

export default environment;
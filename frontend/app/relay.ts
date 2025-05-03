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

// Função que busca resultados de operações GraphQL
async function fetchGraphQL(operation: RequestParameters, variables: Variables) {
  const token = localStorage.getItem('token');
  
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
export const environment = new Environment({
  network,
  store,
});
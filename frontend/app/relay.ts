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

export const networkLogger = {
  lastResponse: null as any,
  listeners: [] as ((response: any) => void)[],
  
  logResponse(response: any) {
    this.lastResponse = response;
    this.listeners.forEach(listener => listener(response));
  },
  
  addListener(listener: (response: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
};

async function fetchGraphQL(operation: RequestParameters, variables: Variables) {
  const token = localStorage.getItem('token');
  const adminToken = localStorage.getItem('adminToken');
  
  let authHeader = null;
  if (adminToken && adminToken === 'admin-session') {
    authHeader = 'Bearer admin';
  } else if (token) {
    authHeader = `Bearer ${token}`;
  }
  
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { 'Authorization': authHeader } : {})
    },
    body: JSON.stringify({
      query: operation.text,
      variables,
    }),
  });

  const result = await response.json();
  
  networkLogger.logResponse({
    operation: operation.name,
    variables,
    response: result
  });
  
  return result;
}

const network = Network.create(fetchGraphQL);

const store = new Store(new RecordSource());

export const environment = new Environment({
  network,
  store,
});
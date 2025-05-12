# Leaky Bucket - Woovi Challenge

Um sistema de Leaky Bucket para limitar requisições implementado com consulta GraphQL usando Node.js e consumido no frontend usando React.

## Tecnologias

- **Backend**: Node.js, TypeScript, Koa.js, Apollo Server
- **Frontend**: React, TypeScript, Relay, TailwindCSS
- **Container**: Docker

## Visão Geral

Sistema de limitação baseado em tokens:

- Máximo de 10 tokens por usuário
- Requisições com falha consomem 1 token
- Requisições bem-sucedidas não consomem tokens
- Quando tokens = 0, novas requisições são bloqueadas
- A cada 1 hora, 1 token é adicionado

## Executando com Docker

### Requisitos

- Docker
- Docker Compose

### Passos

1. **Clone o repositório**:

```bash
git clone https://github.com/GuiiHenriq/woovi-challenge-leaky-bucket
cd leaky-bucket
```

2. **Inicie os containers**:

```bash
docker-compose up
```

Portas:
- Backend: 3000
- Frontend: 5173
- MongoDB: 27017

3. **Acesse**:
- Frontend: [http://localhost:5173](http://localhost:5173)
- GraphQL API: [http://localhost:3000/graphql](http://localhost:3000/graphql)

## Exemplos de Consultas GraphQL

### Registrar Usuário

```graphql
mutation {
  register(input: {
    username: "usuario_teste",
    password: "senha123"
  }) {
    token
    user {
      id
      username
    }
  }
}
```

### Login

```graphql
mutation {
  login(input: {
    username: "usuario_teste",
    password: "senha123"
  }) {
    token
    user {
      id
      username
    }
  }
}
```

### Saldo de Tokens

```graphql
query {
  getTokens {
    tokens
    lastRefill
  }
}
```

**OBS**: Requer autenticação.

### Transação PIX

```graphql
mutation {
  queryPixKey(key: "12345678900") {
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
```

**OBS**: Requer autenticação.

### Autenticação

Para endpoints que precisam de autenticação:

```
Authorization: Bearer seu_token_aqui
```

## Atomicidade

Foi implementado atomicidade usando o Redis:

### Exemplo: Consumo de Token

```typescript
export const consumeToken = async (userId: string): Promise<boolean> => {
  const bucketKey = getBucketKey(userId);

  const script = `
    local tokens = tonumber(redis.call('hget', KEYS[1], 'tokens') or 0)
    if tokens <= 0 then
      return 0
    end
    redis.call('hset', KEYS[1], 'tokens', tokens - 1)
    return 1
  `;

  const result = await redisClient.eval(script, 1, bucketKey);
  return result === 1;
};
```

O script Lua garante que:
1. Verificamos disponibilidade de tokens
2. Decrementamos o contador
3. Tudo em uma única operação atômica

## Concorrência

## Estimativa de Custo do Banco de Dados

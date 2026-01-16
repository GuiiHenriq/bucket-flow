# BucketFlow

A Leaky Bucket system to limit requests implemented with GraphQL query using Node.js and consumed on the frontend using React.

## Technologies

- **Backend**: Node.js, TypeScript, Koa.js, Apollo Server
- **Frontend**: React, TypeScript, Relay, TailwindCSS
- **Container**: Docker

## Overview

Token-based limiting system:
- Maximum of 10 tokens per user
- Failed requests consume 1 token
- Successful requests do not consume tokens
- When tokens = 0, new requests are blocked
- Every 1 hour, 1 token is added

## Running with Docker

### Requirements

- Docker
- Docker Compose

### Steps

1. **Clone the repository**:
```bash
git clone https://github.com/GuiiHenriq/bucket-flow
cd bucket-flow
```

2. **Start the containers**:
```bash
docker-compose up
```

Ports:
- Backend: 3000
- Frontend: 5173
- MongoDB: 27017

3. **URLs**:
- Frontend: [http://localhost:5173](http://localhost:5173)
- GraphQL API: [http://localhost:3000/graphql](http://localhost:3000/graphql)

## GraphQL Query Examples

### Register User

```graphql
mutation {
  register(input: {
    username: "usertest",
    password: "pass123"
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
    username: "usertest",
    password: "pass123"
  }) {
    token
    user {
      id
      username
    }
  }
}
```

### Token Balance

```graphql
query {
  getTokens {
    tokens
    lastRefill
  }
}
```

**NOTE**: Requires authentication.

### PIX Transaction

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

**NOTE**: Requires authentication.

### Authentication

For endpoints that need authentication:
```
Authorization: Bearer your_token_here
```

## Admin Page Access

- Access the admin login page at: [http://localhost:5173/admin](http://localhost:5173/admin)
- After login, you will be redirected to the admin panel at `/admin/dashboard`.

**Credentials:**
- Username: `admin`
- Password: `admin`

## Diagram
![Diagram Solution](https://raw.githubusercontent.com/GuiiHenriq/woovi-challenge-leaky-bucket/refs/heads/feature/project-improvements/diagram.png?token=GHSAT0AAAAAADGRNPFB2JDGYPPRCLOG4GRG2DLBLYA)

## Atomicity

Atomicity was implemented using Redis:

### Example: Token Consumption

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

The Lua script ensures that:
1. We check token availability
2. We decrease the counter
3. Everything in a single atomic operation

## Annual Cost Estimate (MongoDB + Redis)

| Number of Users | MongoDB (Storage) | Redis (Storage) | Total Annual Estimated Cost |
|----------------|--------------------------|------------------------|-----------------------------|
| 1.000 | Free (Free Tier) | Free | **$0 USD** |
| 10.000 | Free (Free Tier) | Free | **$0 USD** |
| 50.000 | M2 (~$9 USD/month) | Free | **~$108 USD** |
| 100.000 | M5 (~$25 USD/month) | Free or ~$1 USD/month | **~~$312 USD** |
| 500.000 | M10+ (~$60 USD/month) | Paid Redis (~$3 USD/month) | **~~$756 USD** |

> ⚠️ These values are only estimates based on average storage usage per user:
> - MongoDB: ~1 KB per user
> - Redis: ~100 bytes per user
> Prices based on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and [Upstash Redis](https://upstash.com/).

# Leaky Bucket API - Rate Limiting with GraphQL

This project shows a full backend and frontend system using GraphQL, with a rate limiting system based on the Leaky Bucket algorithm. The system includes authentication (login/register), PIX transactions, and request token control.

## Technologies Used

- **Backend**: Node.js, TypeScript, Koa.js, Apollo Server (GraphQL)
- **Frontend**: React, TypeScript, Relay, TailwindCSS
- **Container**: Docker

## System Overview

The system uses a token-based rate limiting:

- Each user has a maximum of 10 tokens
- Failed requests use 1 token
- Successful requests do not use tokens
- When tokens are 0, new requests are blocked
- Every 1 hour, 1 token is added

## Running with Docker

### Requirements

- Docker
- Docker Compose

### Steps

1. **Clone the repository**:

```bash
git clone https://github.com/GuiiHenriq/woovi-challenge-leaky-bucket
cd leaky-bucket
```

2. **Start the containers**:

```bash
docker-compose up
```

This will start:

- Backend on port 3000
- Frontend on port 5173
- MongoDB on port 27017

3. **Open the app**:

- Frontend: [http://localhost:5173](http://localhost:5173)
- GraphQL API: [http://localhost:3000/graphql](http://localhost:3000/graphql)

## Testing the GraphQL API

You can test the GraphQL API using tools like Postman or Insomnia.

### Setting up Postman

1. Create a new request in Postman and select POST method
2. Set the URL to `http://localhost:3000/graphql`
3. In "Headers", add:
   - Key: `Content-Type`, Value: `application/json`
4. For authenticated requests, add:
   - Key: `Authorization`, Value: `Bearer your_token_here`

### GraphQL Query Examples

#### Register User

```graphql
mutation {
  register(input: {
    username: "test_user",
    password: "password123"
  }) {
    token
    user {
      id
      username
    }
  }
}
```

#### Login User

```graphql
mutation {
  login(input: {
    username: "test_user",
    password: "password123"
  }) {
    token
    user {
      id
      username
    }
  }
}
```

#### Get Token Balance

```graphql
query {
  getTokens {
    tokens
    lastRefill
  }
}
```

**Note**: This query needs authentication.

#### Make PIX Transaction

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
  getTokens {
    tokens
    lastRefill
  }
}
```

**Note**: This query needs authentication.

#### Get User Info

```graphql
query {
  me {
    id
    username
  }
}
```

**Note**: This query needs authentication.

### Authentication

For endpoints that need authentication:

1. First, login or register to get a JWT token
2. Add the token in your request headers:

```
Authorization: Bearer your_token_here
```

## Project Structure

```
leaky-bucket/
├── backend/
│   ├── src/
│   │   ├── graphql/       # GraphQL definitions
│   │   ├── middlewares/   # Koa middlewares
│   │   ├── models/        # Data models
│   │   └── services/      # Services and business logic
├── frontend/
│   ├── app/
│   │   ├── components/    # React components
└── docker-compose.yml     # Docker config
```

## Postman Collection

In the `postman/` folder you will find a Postman collection with all examples ready to use.

## Development

To develop locally without Docker:

1. Set up MongoDB locally or use a remote service
2. In the `backend/` folder:

```bash
npm install
npm run dev
```

3. In the `frontend/` folder:

```bash
npm install
npm run dev
```
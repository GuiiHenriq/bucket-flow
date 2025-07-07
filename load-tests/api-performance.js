import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { randomString } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const apiResponseTime = new Trend("api_response_time");
const authResponseTime = new Trend("auth_response_time");
const pixQueryResponseTime = new Trend("pix_query_response_time");
const failureRate = new Rate("failure_rate");

export const options = {
  scenarios: {
    api_performance: {
      executor: "ramping-arrival-rate",
      startRate: 1,
      timeUnit: "1s",
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 5, duration: "30s" },
        { target: 10, duration: "30s" },
        { target: 20, duration: "30s" },
        { target: 5, duration: "30s" },
        { target: 0, duration: "10s" },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    api_response_time: ["avg<300"],
    failure_rate: ["rate<0.05"],
  },
};

const BASE_URL = "http://localhost:3000/graphql";
const users = new Map();

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

function makeGraphQLRequest(query, variables = {}, token = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const payload = JSON.stringify({
    query: query,
    variables: variables,
  });

  const start = new Date();
  const response = http.post(BASE_URL, payload, { headers });
  const duration = new Date() - start;

  apiResponseTime.add(duration);

  check(response, {
    "requisição bem-sucedida": (r) => r.status === 200,
    "sem erros no servidor": (r) => !r.json().errors,
  }) || failureRate.add(1);

  return response;
}

function registerAndLoginUser() {
  const username = `user_perf_${randomString(5)}`;
  const password = `pass_${randomString(8)}`;

  const start = new Date();

  const registerResponse = makeGraphQLRequest(registerMutation, {
    input: { username, password },
  });

  const registerSuccess = check(registerResponse, {
    "registro bem-sucedido": (r) => r.status === 200 && !r.json().errors,
  });

  if (!registerSuccess) {
    failureRate.add(1);
    return null;
  }

  const registerData = registerResponse.json().data.register;

  const loginResponse = makeGraphQLRequest(loginMutation, {
    input: { username, password },
  });

  const loginSuccess = check(loginResponse, {
    "login bem-sucedido": (r) => r.status === 200 && !r.json().errors,
  });

  if (!loginSuccess) {
    failureRate.add(1);
    return null;
  }

  const duration = new Date() - start;
  authResponseTime.add(duration);

  const user = {
    username,
    password,
    token: registerData.token,
    id: registerData.user.id,
  };

  users.set(username, user);
  return user;
}

function queryRandomPixKey(token) {
  const pixKeys = [
    "12345678900", // Válida
    "joao@example.com", // Válida
    "random@invalid.com", // Inválida
    "invalid_key", // Inválida
    "99999999999", // Inválida
  ];

  const key = pixKeys[Math.floor(Math.random() * pixKeys.length)];

  const start = new Date();
  const response = makeGraphQLRequest(queryPixKeyMutation, { key }, token);
  const duration = new Date() - start;

  pixQueryResponseTime.add(duration);

  return response;
}

export default function () {
  const shouldCreateNewUser = Math.random() < 0.3 || users.size === 0;

  let user;

  if (shouldCreateNewUser) {
    user = registerAndLoginUser();
  } else {
    const userKeys = Array.from(users.keys());
    const randomUsername =
      userKeys[Math.floor(Math.random() * userKeys.length)];
    user = users.get(randomUsername);
  }

  if (!user) {
    console.error("Falha ao obter usuário válido");
    failureRate.add(1);
    sleep(1);
    return;
  }

  const tokensResponse = makeGraphQLRequest(getTokensQuery, {}, user.token);

  const pixResponse = queryRandomPixKey(user.token);

  sleep(Math.random() * 2 + 0.5);
}

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const authFailRate = new Rate("auth_failures");
const tokenConsumptionRate = new Counter("tokens_consumed");
const responseTimeMs = new Trend("response_time_ms");
const pixKeyQueriesTotal = new Counter("pix_key_queries_total");
const pixKeyQueriesSuccess = new Counter("pix_key_queries_success");
const pixKeyQueriesFailed = new Counter("pix_key_queries_failed");

export const options = {
  scenarios: {
    constant_users: {
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
    },
    stress_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 20 },
        { duration: "20s", target: 50 },
        { duration: "10s", target: 0 },
      ],
      startTime: "30s",
    },
    leaky_bucket_test: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 15,
      maxDuration: "2m",
      startTime: "70s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    auth_failures: ["rate<0.1"],
    pix_key_queries_failed: ["count<100"],
  },
};

const BASE_URL = "http://localhost:3000/graphql";
let users = new Map();

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

  const response = http.post(BASE_URL, payload, { headers });
  responseTimeMs.add(response.timings.duration);

  return response;
}

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

const getTokensQuery = `
  query GetTokens {
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

function registerUser() {
  const username = `user_${randomIntBetween(1000, 9999)}`;
  const password = `pass_${randomIntBetween(1000, 9999)}`;

  const response = makeGraphQLRequest(registerMutation, {
    input: { username, password },
  });

  const success = check(response, {
    "successful registration": (r) => r.status === 200 && !r.json().errors,
  });

  if (!success) {
    authFailRate.add(1);
    return null;
  }

  authFailRate.add(0);
  const result = response.json().data.register;

  users.set(username, {
    username,
    password,
    token: result.token,
    id: result.user.id,
  });

  return users.get(username);
}

function loginUser(username, password) {
  const response = makeGraphQLRequest(loginMutation, {
    input: { username, password },
  });

  const success = check(response, {
    "successful login": (r) => r.status === 200 && !r.json().errors,
  });

  if (!success) {
    authFailRate.add(1);
    return null;
  }

  authFailRate.add(0);
  return response.json().data.login;
}

function checkTokens(token) {
  const response = makeGraphQLRequest(getTokensQuery, {}, token);

  check(response, {
    "successful token query": (r) =>
      r.status === 200 && !r.json().errors,
    "tokens visible": (r) =>
      r.json().data &&
      r.json().data.getTokens &&
      typeof r.json().data.getTokens.tokens === "number",
  });

  if (response.status === 200 && !response.json().errors) {
    return response.json().data.getTokens.tokens;
  }

  return null;
}

function queryPixKey(token, key) {
  pixKeyQueriesTotal.add(1);

  const response = makeGraphQLRequest(queryPixKeyMutation, { key }, token);

  const success = check(response, {
    "complete PIX request": (r) => r.status === 200,
    "no server errors": (r) => !r.json().errors,
  });

  if (success && response.json().data && response.json().data.queryPixKey) {
    const result = response.json().data.queryPixKey;

    if (result.success) {
      pixKeyQueriesSuccess.add(1);
    } else {
      pixKeyQueriesFailed.add(1);
      tokenConsumptionRate.add(1);
    }

    return result;
  }

  pixKeyQueriesFailed.add(1);
  return null;
}

export default function () {
  const user = registerUser();

  if (user) {
    const initialTokens = checkTokens(user.token);

    if (initialTokens !== null) {
      console.log(
        `User ${user.username} started with ${initialTokens} tokens`
      );

      const validKeys = ["12345678900", "joao@example.com"];
      const invalidKeys = ["invalid1", "invalid2", "99999999999"];

      const validKey = validKeys[randomIntBetween(0, validKeys.length - 1)];
      const validResult = queryPixKey(user.token, validKey);

      const invalidKey =
        invalidKeys[randomIntBetween(0, invalidKeys.length - 1)];
      const invalidResult = queryPixKey(user.token, invalidKey);

      const finalTokens = checkTokens(user.token);

      if (finalTokens !== null && initialTokens !== null) {
        console.log(
          `User ${user.username} finished with ${finalTokens} tokens (difference: ${
            initialTokens - finalTokens
          })`
        );
      }
    }
  }

  sleep(1);
}

export function leakyBucketTest() {
  const user = registerUser();

  if (!user) return;

  let tokens = checkTokens(user.token);
  console.log(
    `[Leaky Bucket] User ${user.username} started with ${tokens} tokens`
  );

  let attempts = 0;
  let lastTokenCount = tokens;

  while (tokens > 0 && attempts < 20) {
    console.log(
      `[Leaky Bucket] Attempt ${attempts + 1}: ${tokens} tokens remaining`
    );

    queryPixKey(user.token, `invalid_key_${randomIntBetween(1000, 9999)}`);

    sleep(0.5);

    tokens = checkTokens(user.token);

    if (lastTokenCount > tokens) {
      console.log(
        `[Leaky Bucket] Token consumed: ${lastTokenCount} -> ${tokens}`
      );
    } else {
      console.log(`[Leaky Bucket] No token consumed: ${tokens}`);
    }

    lastTokenCount = tokens;
    attempts++;
  }

  if (tokens === 0) {
    console.log(
      `[Leaky Bucket] User ${user.username} depleted tokens after ${attempts} attempts`
    );

    const result = queryPixKey(user.token, "qualquer_valor");
    console.log(
      `[Leaky Bucket] Result after depleting tokens: ${JSON.stringify(result)}`
    );
  }

  sleep(2);
}

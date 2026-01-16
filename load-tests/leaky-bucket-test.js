import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const tokenDecreaseTrend = new Trend("token_decrease");
const failedRequestsAfterDepletion = new Counter(
  "failed_requests_after_depletion"
);

export const options = {
  vus: 5,
  iterations: 5,
  thresholds: {
    token_decrease: ["avg>0"],
    http_req_duration: ["p(95)<1000"],
  },
};

const API_URL = "http://localhost:3000/graphql";

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

function graphqlRequest(query, variables = {}, token = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const payload = JSON.stringify({
    query,
    variables,
  });

  return http.post(API_URL, payload, { headers });
}

export default function () {
  const username = `user_lb_${Math.floor(Math.random() * 10000)}`;
  const password = "password123";

  const registerResponse = graphqlRequest(registerMutation, {
    username,
    password,
  });

  const registerSuccess = check(registerResponse, {
    "successful registration": (r) => r.status === 200 && !r.json().errors,
    "token obtained": (r) => r.json().data?.register?.token,
  });

  if (!registerSuccess) {
    console.error("User registration failed");
    return;
  }

  const token = registerResponse.json().data.register.token;

  const initialTokensResponse = graphqlRequest(getTokensQuery, {}, token);

  const initialCheckSuccess = check(initialTokensResponse, {
    "initial token query successful": (r) =>
      r.status === 200 && !r.json().errors,
    "initial tokens available": (r) => r.json().data?.getTokens?.tokens > 0,
  });

  if (!initialCheckSuccess) {
    console.error("Failed to verify initial tokens");
    return;
  }

  const initialTokens = initialTokensResponse.json().data.getTokens.tokens;
  console.log(`User ${username} started with ${initialTokens} tokens`);

  let currentTokens = initialTokens;
  const maxConsumptionAttempts = 15;
  let attemptsDone = 0;

  while (currentTokens > 0 && attemptsDone < maxConsumptionAttempts) {
    const invalidKey = `invalid_key_${Math.floor(Math.random() * 1000)}`;

    const pixResponse = graphqlRequest(
      queryPixKeyMutation,
      { key: invalidKey },
      token
    );

    const tokenCheckResponse = graphqlRequest(getTokensQuery, {}, token);

    if (
      tokenCheckResponse.status === 200 &&
      !tokenCheckResponse.json().errors
    ) {
      const newTokens = tokenCheckResponse.json().data.getTokens.tokens;

      if (newTokens < currentTokens) {
        const decrease = currentTokens - newTokens;
        tokenDecreaseTrend.add(decrease);
        console.log(
          `Tokens decreased: ${currentTokens} -> ${newTokens} (-${decrease})`
        );
      }

      currentTokens = newTokens;
    }

    attemptsDone++;

    sleep(0.3);
  }

  if (currentTokens <= 0) {
    console.log(
      `Tokens depleted after ${attemptsDone} attempts. Testing blocking...`
    );

    const blockedResponse = graphqlRequest(
      queryPixKeyMutation,
      { key: "any_key" },
      token
    );

    check(blockedResponse, {
      "request successfully blocked": (r) =>
        r.status === 200 &&
        r.json().errors &&
        r.json().errors[0].message.includes("Rate limit exceeded"),
    });

    if (
      blockedResponse.json().errors &&
      blockedResponse.json().errors[0].message.includes("Rate limit exceeded")
    ) {
      console.log("Rate limiting working correctly!");
    } else {
      console.error("Rate limiting failed after token depletion");
      failedRequestsAfterDepletion.add(1);
    }
  } else {
    console.log(
      `Failed to deplete tokens after ${attemptsDone} attempts.`
    );
  }

  sleep(1);
}

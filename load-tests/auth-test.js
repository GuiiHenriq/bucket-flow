import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { randomString } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

const registerTime = new Trend("register_time");
const loginTime = new Trend("login_time");
const loginSuccessRate = new Rate("login_success_rate");
const registerSuccessRate = new Rate("register_success_rate");
const totalUsers = new Counter("total_users_created");

export const options = {
  scenarios: {
    auth_test: {
      executor: "constant-arrival-rate",
      rate: 5,
      timeUnit: "1s",
      duration: "1m",
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
    concurrent_logins: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 10 },
        { duration: "30s", target: 50 },
        { duration: "10s", target: 0 },
      ],
      startTime: "1m",
    },
  },
  thresholds: {
    register_time: ["p(95)<1000"],
    login_time: ["p(95)<500"],
    login_success_rate: ["rate>0.95"],
    register_success_rate: ["rate>0.95"],
  },
};

const BASE_URL = "http://localhost:3000/graphql";

const registeredUsers = [];

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

function makeGraphQLRequest(query, variables = {}) {
  const payload = JSON.stringify({
    query: query,
    variables: variables,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  return http.post(BASE_URL, payload, params);
}

function registerUser() {
  const username = `auth_test_${randomString(8)}`;
  const password = `pass_${randomString(8)}`;

  const start = new Date();
  const response = makeGraphQLRequest(registerMutation, {
    input: { username, password },
  });
  const duration = new Date() - start;

  registerTime.add(duration);

  const success = check(response, {
    "registro retornou 200": (r) => r.status === 200,
    "registro sem erros": (r) => !r.json().errors,
    "token válido retornado": (r) => r.json().data?.register?.token?.length > 0,
  });

  registerSuccessRate.add(success ? 1 : 0);

  if (success) {
    totalUsers.add(1);
    const userData = {
      username,
      password,
      id: response.json().data.register.user.id,
      token: response.json().data.register.token,
    };

    registeredUsers.push(userData);
    return userData;
  }

  return null;
}

function loginUser(username, password) {
  const start = new Date();
  const response = makeGraphQLRequest(loginMutation, {
    input: { username, password },
  });
  const duration = new Date() - start;

  loginTime.add(duration);

  const success = check(response, {
    "login retornou 200": (r) => r.status === 200,
    "login sem erros": (r) => !r.json().errors,
    "token válido de login": (r) => r.json().data?.login?.token?.length > 0,
  });

  loginSuccessRate.add(success ? 1 : 0);
  return success;
}

export default function () {
  registerUser();
  sleep(0.5);
}

export function concurrentLogins() {
  if (registeredUsers.length === 0) {
    registerUser();
    sleep(1);
    return;
  }

  const userIndex = Math.floor(Math.random() * registeredUsers.length);
  const user = registeredUsers[userIndex];

  if (!user) {
    console.error("Falha ao obter usuário válido para login");
    loginSuccessRate.add(0);
    return;
  }

  loginUser(user.username, user.password);
  sleep(0.5);
}

export function invalidLoginAttempts() {
  const username = `user_${randomString(8)}`;
  const password = "senha_errada";

  const start = new Date();
  const response = makeGraphQLRequest(loginMutation, {
    input: { username, password },
  });
  const duration = new Date() - start;

  loginTime.add(duration);

  check(response, {
    "resposta de erro formatada corretamente": (r) =>
      r.status === 200 && r.json().errors && r.json().errors.length > 0,
  });

  sleep(0.2);
}

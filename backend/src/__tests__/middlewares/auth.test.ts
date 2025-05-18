import { Context, Request } from 'koa';
import { authMiddleware } from '../../middlewares/auth';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';

const TEST_JWT_SECRET = 'integration-test-secret-key';
process.env.JWT_SECRET = TEST_JWT_SECRET;

jest.mock('../../models/User', () => ({
  User: {
    findById: jest.fn(),
  },
}));

interface TestContext {
  headers: {
    authorization?: string;
  };
  path: string;
  method: string;
  request: Partial<Request> & {
    body?: any;
  };
  state: {
    user?: {
      id: string;
      username: string;
    };
  };
  status: number;
  body: any;
}

describe('Auth Middleware', () => {
  let ctx: TestContext;
  let next: jest.Mock;
  const userId = 'test-user-id';
  const username = 'testuser';

  beforeEach(() => {
    ctx = {
      headers: {},
      path: '/api/test',
      method: 'GET',
      request: {},
      state: {},
      status: 200,
      body: null,
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should allow access to login endpoint', async () => {
    ctx.path = '/api/login';
    await authMiddleware(ctx as unknown as Context, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow access to register endpoint', async () => {
    ctx.path = '/api/register';
    await authMiddleware(ctx as unknown as Context, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow access to GraphQL login mutation', async () => {
    ctx.path = '/graphql';
    ctx.request.body = {
      query: 'mutation AuthMutationsLoginMutation',
    };
    await authMiddleware(ctx as unknown as Context, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow access to GraphQL register mutation', async () => {
    ctx.path = '/graphql';
    ctx.request.body = {
      query: 'mutation AuthMutationsRegisterMutation',
    };
    await authMiddleware(ctx as unknown as Context, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 when no authorization header is present', async () => {
    await authMiddleware(ctx as unknown as Context, next);
    expect(ctx.status).toBe(401);
    expect(ctx.body).toEqual({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when authorization header is invalid', async () => {
    ctx.headers.authorization = 'Invalid Token';
    await authMiddleware(ctx as unknown as Context, next);
    expect(ctx.status).toBe(401);
    expect(ctx.body).toEqual({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', async () => {
    ctx.headers.authorization = 'Bearer invalid.token.here';
    await authMiddleware(ctx as unknown as Context, next);
    expect(ctx.status).toBe(401);
    expect(ctx.body).toEqual({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when user is not found', async () => {
    const token = jwt.sign({ id: userId }, TEST_JWT_SECRET);
    ctx.headers.authorization = `Bearer ${token}`;
    (User.findById as jest.Mock).mockResolvedValue(null);

    await authMiddleware(ctx as unknown as Context, next);
    expect(ctx.status).toBe(401);
    expect(ctx.body).toEqual({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should set user in context when token is valid', async () => {
    const token = jwt.sign({ id: userId }, TEST_JWT_SECRET);
    ctx.headers.authorization = `Bearer ${token}`;
    (User.findById as jest.Mock).mockResolvedValue({
      _id: userId,
      username,
    });

    await authMiddleware(ctx as unknown as Context, next);
    expect(ctx.state.user).toEqual({
      id: userId,
      username,
    });
    expect(next).toHaveBeenCalled();
  });
}); 
import { Context, Request } from 'koa';
import { authMiddleware } from '../../middlewares/auth';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'f5e6ea86177b7190efd38125a714928693899f28d7bf05ad87699fad0eff4f2f6e6b9e5362abd6db752c054b4d136caccf453da2302c65368cf507837b479d41502477f2089771eb121449e5cf62bd98df264eb75ed5adfcdbd9dd44007f6cf764a362f29cb57bfd520783c8346e4448537889315df0286577359f1f6834251be66801b9ac1838de3b5fd334002ab7f04a954caa4002852d2f8a5a6b40d2069ba34c3dc31b4a67541018f2540054e68081512d981aa1392f4388b27ecc0c63d02fd943c6a264ec2693554f2717c3bbd7f118005ba181141d0f521c4dd44079d20f9d6616c6f45f99f28f2d78a4e94f68a71b3756827eb59723a6c4ca3dce659d';

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
    const token = jwt.sign({ id: userId }, JWT_SECRET);
    ctx.headers.authorization = `Bearer ${token}`;
    (User.findById as jest.Mock).mockResolvedValue(null);

    await authMiddleware(ctx as unknown as Context, next);
    expect(ctx.status).toBe(401);
    expect(ctx.body).toEqual({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should set user in context when token is valid', async () => {
    const token = jwt.sign({ id: userId }, JWT_SECRET);
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
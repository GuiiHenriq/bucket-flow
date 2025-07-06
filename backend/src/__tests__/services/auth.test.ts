import { Context } from 'koa';
import { register, login } from '../../services/auth';
import { User } from '../../models/User';
import jwt from 'jsonwebtoken';

jest.mock('../../models/User');

describe('Auth Service', () => {
  let mockCtx: any;
  const username = 'testuser';
  const password = 'password123';

  beforeEach(() => {
    mockCtx = {
      request: {
        body: { username, password },
      },
      status: 200,
      body: null,
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user and return token', async () => {
      const mockUser = {
        _id: 'test-user-id',
        username,
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User as unknown as jest.Mock).mockImplementation(() => mockUser);

      const result = await register(mockCtx);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('id', mockUser._id);
      expect(result).toHaveProperty('username', username);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should return error if username already exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ username });

      await expect(register(mockCtx)).rejects.toThrow('Username already exists');
      expect(mockCtx.status).toBe(400);
      expect(mockCtx.body).toEqual({ error: 'Username already exists' });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockRejectedValue(error);

      await expect(register(mockCtx)).rejects.toThrow('Database error');
      expect(mockCtx.status).toBe(500);
      expect(mockCtx.body).toEqual({ error: 'Error creating user' });
    });
  });

  describe('login', () => {
    const mockUser = {
      _id: 'test-user-id',
      username,
      comparePassword: jest.fn(),
    };

    it('should return token for valid credentials', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);

      const result = await login(mockCtx);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('id', mockUser._id);
      expect(result).toHaveProperty('username', username);
    });

    it('should return error for non-existent user', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(login(mockCtx)).rejects.toThrow('Invalid credentials');
      expect(mockCtx.status).toBe(401);
      expect(mockCtx.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should return error for invalid password', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      await expect(login(mockCtx)).rejects.toThrow('Invalid credentials');
      expect(mockCtx.status).toBe(401);
      expect(mockCtx.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockRejectedValue(error);

      await expect(login(mockCtx)).rejects.toThrow('Database error');
      expect(mockCtx.status).toBe(500);
      expect(mockCtx.body).toEqual({ error: 'Error during login' });
    });
  });
}); 
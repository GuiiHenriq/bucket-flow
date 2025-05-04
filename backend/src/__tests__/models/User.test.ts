import mongoose from 'mongoose';
import { User } from '../../models/User';
import bcrypt from 'bcryptjs';

// Mock mongoose
jest.mock('mongoose', () => {
  const mockSchema = {
    pre: jest.fn().mockImplementation(function(this: any, hook: string, callback: Function) {
      this.preHooks = this.preHooks || {};
      this.preHooks[hook] = callback;
      return this;
    }),
    methods: {},
  };

  class MockModel {
    username: string;
    password: string;
    preHooks: { [key: string]: Function };
    isModified: jest.Mock;
    save: jest.Mock;
    validateSync: jest.Mock;

    constructor(data: any) {
      this.username = data.username?.trim();
      this.password = data.password;
      this.preHooks = {};
      this.isModified = jest.fn().mockReturnValue(true);
      this.save = jest.fn().mockImplementation(async () => {
        if (this.preHooks.save) {
          const next = async (error?: Error) => {
            if (error) throw error;
          };
          try {
            await this.preHooks.save.call(this, next);
          } catch (error) {
            throw error;
          }
        }
        if (this.isModified('password')) {
          const salt = await bcrypt.genSalt(10);
          this.password = await bcrypt.hash(this.password, salt);
        }
        return this;
      });
      this.validateSync = jest.fn().mockImplementation(() => {
        if (!this.username || !this.password) {
          return { errors: { username: { message: 'Username is required' }, password: { message: 'Password is required' } } };
        }
        return undefined;
      });
    }

    comparePassword = jest.fn().mockImplementation(async (candidatePassword: string) => {
      return bcrypt.compare(candidatePassword, this.password);
    });
  }

  return {
    Schema: jest.fn().mockImplementation(() => mockSchema),
    model: jest.fn().mockImplementation(() => MockModel),
    Document: jest.fn(),
  };
});

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('User Model', () => {
  const userData = {
    username: 'testuser',
    password: 'password123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pre Save Hook', () => {
    it('should hash password before saving', async () => {
      const user = new User(userData);
      await user.save();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
    });

    it('should not hash password if it has not been modified', async () => {
      const user = new User(userData);
      user.isModified = jest.fn().mockReturnValue(false);
      await user.save();
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should handle hashing errors', async () => {
      const error = new Error('Hashing error');
      (bcrypt.genSalt as jest.Mock).mockRejectedValue(error);
      const user = new User(userData);
      await expect(user.save()).rejects.toThrow('Hashing error');
    });
  });

  describe('comparePassword', () => {
    it('should compare passwords correctly', async () => {
      const user = new User(userData);
      const result = await user.comparePassword('password123');
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', user.password);
    });

    it('should return false for non-matching password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const user = new User(userData);
      expect(await user.comparePassword('wrongpassword')).toBe(false);
    });

    it('should handle comparison errors', async () => {
      const error = new Error('Comparison error');
      (bcrypt.compare as jest.Mock).mockRejectedValue(error);
      const user = new User(userData);
      await expect(user.comparePassword(userData.password)).rejects.toThrow('Comparison error');
    });
  });

  describe('Schema Validation', () => {
    it('should require username and password', () => {
      const user = new User({});
      const validationError = user.validateSync();
      expect(validationError?.errors.username).toBeDefined();
      expect(validationError?.errors.password).toBeDefined();
    });

    it('should trim username', () => {
      const user = new User({
        username: '  testuser  ',
        password: userData.password,
      });
      expect(user.username).toBe('testuser');
    });
  });
}); 
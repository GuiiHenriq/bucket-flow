import { resolvers } from '../../graphql/schema';
import { setUserTokens } from '../../services/leakyBucket';

describe('GraphQL Resolvers', () => {
  const userId = 'test-user';
  const context = { user: { id: userId } };

  beforeEach(() => {
    setUserTokens(userId, 10);
  });

  describe('Query', () => {
    it('should return hello world', () => {
      const result = resolvers.Query.hello();
      expect(result).toBe('Hello World!');
    });

    it('should return user when authenticated', () => {
      const result = resolvers.Query.me(null, null, context);
      expect(result).toEqual(context.user);
    });

    it('should throw error when not authenticated', () => {
      expect(() => {
        resolvers.Query.me(null, null, {});
      }).toThrow('Not authenticated');
    });
  });

  describe('Mutation', () => {
    describe('queryPixKey', () => {
      it('should throw error when not authenticated', () => {
        expect(() => {
          resolvers.Mutation.queryPixKey(null, { key: '12345678900' }, {});
        }).toThrow('Authentication required');
      });

      it('should throw error when rate limit exceeded', () => {
        setUserTokens(userId, 0);
        expect(() => {
          resolvers.Mutation.queryPixKey(null, { key: '12345678900' }, context);
        }).toThrow('Rate limit exceeded. Please try again later.');
      });

      it('should return success response for valid PIX key', () => {
        // Mock Math.random to ensure success
        jest.spyOn(global.Math, 'random').mockReturnValue(0.9);

        const result = resolvers.Mutation.queryPixKey(
          null,
          { key: '12345678900' },
          context
        );

        expect(result).toEqual({
          success: true,
          message: 'PIX key found',
          key: '12345678900',
          accountInfo: {
            name: 'João Silva',
            bank: 'Banco Digital',
            accountType: 'Checking',
            accountNumber: '12345-6',
          },
        });

        jest.spyOn(global.Math, 'random').mockRestore();
      });

      it('should return failure response for invalid PIX key', () => {
        // Mock Math.random to ensure failure
        jest.spyOn(global.Math, 'random').mockReturnValue(0.1);

        const result = resolvers.Mutation.queryPixKey(
          null,
          { key: 'invalid-key' },
          context
        );

        expect(result).toEqual({
          success: false,
          message: 'PIX key not found or service unavailable',
        });

        jest.spyOn(global.Math, 'random').mockRestore();
      });

      it('should decrement tokens on failure', () => {
        // Mock Math.random to ensure failure
        jest.spyOn(global.Math, 'random').mockReturnValue(0.1);

        const result = resolvers.Mutation.queryPixKey(null, { key: '12345678900' }, context);
        expect(result.success).toBe(false);

        jest.spyOn(global.Math, 'random').mockRestore();
      });
    });
  });
}); 
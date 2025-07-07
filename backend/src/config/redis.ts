import Redis from 'ioredis';

const REDIS_URI = process.env.REDIS_URI || 'redis://localhost:6379';

export const redisClient = new Redis(REDIS_URI);

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});

redisClient.on('error', (error) => {
  console.error('Redis connection error:', error);
});

export default redisClient; 
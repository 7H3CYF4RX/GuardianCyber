import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisOptions: any = {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times: number) {
    return Math.min(times * 1000, 10000);
  },
};

if (process.env.REDIS_PASSWORD) {
  redisOptions.password = process.env.REDIS_PASSWORD;
}

const redis = new Redis(redisUrl, redisOptions);

redis.on('error', (err) => {
  console.warn('[Redis] Warning:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

export default redis;

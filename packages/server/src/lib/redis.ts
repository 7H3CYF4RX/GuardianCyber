import Redis from 'ioredis';

const isProd = process.env.NODE_ENV === 'production';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isLocalhostInProd = isProd && (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1'));

const redisOptions: any = {
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times: number) {
    if (isLocalhostInProd) return null;
    return Math.min(times * 1000, 10000);
  },
};

if (process.env.REDIS_PASSWORD) {
  redisOptions.password = process.env.REDIS_PASSWORD;
}

const redis = new Redis(redisUrl, redisOptions);

redis.on('error', (err) => {
  if (!isLocalhostInProd) {
    console.warn('[Redis] Warning:', err.message);
  }
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

export default redis;

import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisOptions: any = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
};

if (process.env.REDIS_PASSWORD) {
  redisOptions.password = process.env.REDIS_PASSWORD;
}

const redis = new Redis(redisUrl, redisOptions);

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

export default redis;

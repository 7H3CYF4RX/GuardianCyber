"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const isProd = process.env.NODE_ENV === 'production';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isLocalhostInProd = isProd && (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1'));
const redisOptions = {
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
        if (isLocalhostInProd)
            return null;
        return Math.min(times * 1000, 10000);
    },
};
if (process.env.REDIS_PASSWORD) {
    redisOptions.password = process.env.REDIS_PASSWORD;
}
const redis = new ioredis_1.default(redisUrl, redisOptions);
redis.on('error', (err) => {
    if (!isLocalhostInProd) {
        console.warn('[Redis] Warning:', err.message);
    }
});
redis.on('connect', () => {
    console.log('[Redis] Connected');
});
exports.default = redis;

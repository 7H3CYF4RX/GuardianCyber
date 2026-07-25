"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisOptions = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
};
if (process.env.REDIS_PASSWORD) {
    redisOptions.password = process.env.REDIS_PASSWORD;
}
const redis = new ioredis_1.default(redisUrl, redisOptions);
redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
});
redis.on('connect', () => {
    console.log('[Redis] Connected');
});
exports.default = redis;

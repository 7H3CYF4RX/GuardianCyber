"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalLimiter = exports.hintLimiter = exports.chatLimiter = exports.authLimiter = void 0;
exports.errorHandler = errorHandler;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = require("rate-limit-redis");
const redis_1 = __importDefault(require("../lib/redis"));
function makeRedisStore(prefix) {
    return new rate_limit_redis_1.RedisStore({
        // @ts-expect-error — sendCommand type mismatch between ioredis and rate-limit-redis
        sendCommand: (...args) => redis_1.default.call(...args),
        prefix,
    });
}
// Auth routes: 10 requests per 1 minute per IP
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: makeRedisStore('rl:auth:'),
    message: { error: 'Too many attempts. Try again in a minute.' },
});
// Chat route: 60 requests per minute per user (≈ 1 per 1s)
exports.chatLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60000,
    max: 60,
    keyGenerator: (req) => req.user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
    store: makeRedisStore('rl:chat:'),
    message: { error: 'Sending too fast. Please slow down.' },
});
// Hint route: 5 attempts per 10 minutes per user
exports.hintLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60000,
    max: 5,
    keyGenerator: (req) => `hint:${req.user?.id}:${req.params.id}`,
    standardHeaders: true,
    legacyHeaders: false,
    store: makeRedisStore('rl:hint:'),
    message: { error: 'Too many hint attempts. Try again in 10 minutes.' },
});
// Global API limiter
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    store: makeRedisStore('rl:global:'),
});
function errorHandler(err, req, res, next) {
    console.error('[Error]', err?.message || err);
    // Never leak stack traces or internal details in production
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
}

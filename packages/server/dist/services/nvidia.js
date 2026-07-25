"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initKeyRotation = initKeyRotation;
exports.startKeySweeper = startKeySweeper;
exports.callNvidia = callNvidia;
exports.callNvidiaStream = callNvidiaStream;
const pool_1 = __importDefault(require("../db/pool"));
const redis_1 = __importDefault(require("../lib/redis"));
const crypto_1 = require("../lib/crypto");
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'google/gemma-4-31b-it';
const REDIS_KEY = 'nvidia:keys:sorted';
// ─── Key Health ───────────────────────────────────────────────────────────────
async function initKeyRotation() {
    try {
        const { rows } = await pool_1.default.query(`SELECT id, key_encrypted FROM api_keys WHERE provider='nvidia' AND is_active=true ORDER BY priority`);
        for (const row of rows) {
            // score = 0 means available now
            await redis_1.default.zadd(REDIS_KEY, 'NX', 0, String(row.id));
        }
        console.log(`[KeyRotation] Initialized ${rows.length} NVIDIA key(s) in Redis`);
    }
    catch (err) {
        console.warn(`[KeyRotation] Redis/DB key rotation init warning: ${err.message}`);
    }
}
async function getHealthyKeyId() {
    const now = Date.now();
    try {
        // Score <= now means the key is healthy
        const available = await redis_1.default.zrangebyscore(REDIS_KEY, '-inf', now, 'LIMIT', 0, 1);
        return available[0] || null;
    }
    catch {
        return null;
    }
}
async function getKeyValue(keyId) {
    const { rows } = await pool_1.default.query('SELECT key_encrypted FROM api_keys WHERE id=$1', [keyId]);
    if (!rows.length)
        throw new Error(`Key ${keyId} not found`);
    return (0, crypto_1.decrypt)(rows[0].key_encrypted);
}
async function markKeyLimited(keyId, attempt) {
    const backoffMs = Math.min(60000 * Math.pow(2, attempt - 1), 15 * 60000);
    const availableAt = Date.now() + backoffMs;
    try {
        await redis_1.default.zadd(REDIS_KEY, availableAt, keyId);
        await pool_1.default.query('UPDATE api_keys SET is_rate_limited=true, rate_limited_until=$1 WHERE id=$2', [new Date(availableAt), keyId]);
    }
    catch { }
    console.warn(`[KeyRotation] Key ${keyId} rate-limited for ${backoffMs / 1000}s`);
}
async function markKeyUsed(keyId) {
    try {
        await pool_1.default.query('UPDATE api_keys SET last_used_at=NOW(), usage_count=usage_count+1 WHERE id=$1', [keyId]);
    }
    catch { }
}
// ─── Background sweeper — runs every 10s ────────────────────────────────────
function startKeySweeper() {
    setInterval(async () => {
        try {
            const { rows } = await pool_1.default.query(`SELECT id FROM api_keys WHERE is_rate_limited=true AND rate_limited_until <= NOW() AND is_active=true`);
            for (const row of rows) {
                await pool_1.default.query('UPDATE api_keys SET is_rate_limited=false WHERE id=$1', [row.id]);
                await redis_1.default.zadd(REDIS_KEY, 0, String(row.id)); // make immediately available
            }
        }
        catch { }
    }, 10000);
}
const MAX_TOKENS_CAP = 16384; // Hard cap to prevent runaway token usage
async function callNvidia(messages, options = {}, attempt = 0, triedKeys = new Set()) {
    if (attempt > 5) {
        throw new Error('ALL_KEYS_EXHAUSTED');
    }
    let apiKey = null;
    let keyId = await getHealthyKeyId();
    if (keyId && !triedKeys.has(keyId)) {
        triedKeys.add(keyId);
        try {
            apiKey = await getKeyValue(keyId);
        }
        catch {
            apiKey = null;
        }
    }
    // Fallback to process.env.NVIDIA_API_KEY if no key from pool
    if (!apiKey) {
        apiKey = process.env.NVIDIA_API_KEY || null;
    }
    if (!apiKey) {
        throw new Error('ALL_KEYS_RATE_LIMITED');
    }
    const modelName = process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';
    const payload = {
        model: modelName,
        messages,
        max_tokens: Math.min(options.maxTokens || 512, MAX_TOKENS_CAP),
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9,
        stream: false,
    };
    const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
    });
    if (res.status === 429 || res.status === 503) {
        if (keyId)
            await markKeyLimited(keyId, attempt + 1);
        return callNvidia(messages, options, attempt + 1, triedKeys);
    }
    if (!res.ok) {
        const errText = await res.text();
        console.error(`[NVIDIA] Error ${res.status}:`, errText);
        if (keyId)
            await markKeyLimited(keyId, attempt + 1);
        return callNvidia(messages, options, attempt + 1, triedKeys);
    }
    if (keyId)
        await markKeyUsed(keyId);
    const data = (await res.json());
    const content = data.choices?.[0]?.message?.content || '';
    const tokensUsed = data.usage?.completion_tokens || 0;
    return { content, tokensUsed };
}
async function callNvidiaStream(messages, onChunk, options = {}, attempt = 0, triedKeys = new Set()) {
    if (attempt > 5) {
        throw new Error('ALL_KEYS_EXHAUSTED');
    }
    let apiKey = null;
    let keyId = await getHealthyKeyId();
    if (keyId && !triedKeys.has(keyId)) {
        triedKeys.add(keyId);
        try {
            apiKey = await getKeyValue(keyId);
        }
        catch {
            apiKey = null;
        }
    }
    if (!apiKey) {
        apiKey = process.env.NVIDIA_API_KEY || null;
    }
    if (!apiKey) {
        throw new Error('ALL_KEYS_RATE_LIMITED');
    }
    const modelName = process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';
    const payload = {
        model: modelName,
        messages,
        max_tokens: Math.min(options.maxTokens || 512, MAX_TOKENS_CAP),
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9,
        stream: true,
    };
    const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
    });
    if (res.status === 429 || res.status === 503) {
        if (keyId)
            await markKeyLimited(keyId, attempt + 1);
        return callNvidiaStream(messages, onChunk, options, attempt + 1, triedKeys);
    }
    if (!res.ok) {
        const errText = await res.text();
        console.error(`[NVIDIA Stream] Error ${res.status}:`, errText);
        if (keyId)
            await markKeyLimited(keyId, attempt + 1);
        return callNvidiaStream(messages, onChunk, options, attempt + 1, triedKeys);
    }
    if (keyId)
        await markKeyUsed(keyId);
    let fullContent = '';
    let tokenCount = 0;
    if (!res.body) {
        throw new Error('Response body is null');
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]')
                continue;
            if (trimmed.startsWith('data: ')) {
                try {
                    const json = JSON.parse(trimmed.slice(6));
                    const delta = json.choices?.[0]?.delta;
                    if (delta) {
                        const contentToken = delta.content || '';
                        const reasoningToken = delta.reasoning_content || '';
                        if (contentToken || reasoningToken) {
                            tokenCount++;
                            if (contentToken)
                                fullContent += contentToken;
                            onChunk({ contentToken, reasoningToken });
                        }
                    }
                }
                catch { }
            }
        }
    }
    return { fullContent, tokensUsed: tokenCount };
}

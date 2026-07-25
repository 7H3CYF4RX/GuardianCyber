import pool from '../db/pool';
import redis from '../lib/redis';
import { decrypt, encrypt } from '../lib/crypto';

const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'google/gemma-4-31b-it';
const REDIS_KEY = 'nvidia:keys:sorted';

// ─── Key Health ───────────────────────────────────────────────────────────────

export async function initKeyRotation(): Promise<void> {
  try {
    const rawKeysString = process.env.NVIDIA_API_KEYS || process.env.NVIDIA_API_KEY || '';
    const rawKeys = rawKeysString.split(',').map((k) => k.trim()).filter((k) => k.length > 5);

    if (rawKeys.length > 0) {
      const { rows: existingRows } = await pool.query(
        `SELECT id, key_encrypted FROM api_keys WHERE provider='nvidia'`
      );
      const existingKeys = new Set<string>();
      for (const r of existingRows) {
        try {
          existingKeys.add(decrypt(r.key_encrypted));
        } catch {}
      }

      for (let i = 0; i < rawKeys.length; i++) {
        const key = rawKeys[i];
        if (!existingKeys.has(key)) {
          const encrypted = encrypt(key);
          await pool.query(
            `INSERT INTO api_keys (provider, key_encrypted, priority, is_active) VALUES ('nvidia', $1, $2, true)`,
            [encrypted, i]
          );
        }
      }
    }

    const { rows } = await pool.query(
      `SELECT id FROM api_keys WHERE provider='nvidia' AND is_active=true ORDER BY priority`
    );
    for (const row of rows) {
      await redis.zadd(REDIS_KEY, 'NX', 0, String(row.id)).catch(() => {});
    }
    console.log(`[KeyRotation] Initialized ${rows.length} NVIDIA key(s) in rotation pool`);
  } catch (err: any) {
    console.warn(`[KeyRotation] Key rotation init info: ${err.message}`);
  }
}

async function getHealthyKeyId(): Promise<string | null> {
  const now = Date.now();
  try {
    const available = await redis.zrangebyscore(REDIS_KEY, '-inf', now, 'LIMIT', 0, 1);
    return available[0] || null;
  } catch {
    return null;
  }
}

async function getKeyValue(keyId: string): Promise<string> {
  const { rows } = await pool.query('SELECT key_encrypted FROM api_keys WHERE id=$1', [keyId]);
  if (!rows.length) throw new Error(`Key ${keyId} not found`);
  return decrypt(rows[0].key_encrypted);
}

async function markKeyLimited(keyId: string, attempt: number): Promise<void> {
  const backoffMs = Math.min(60_000 * Math.pow(2, attempt - 1), 15 * 60_000);
  const availableAt = Date.now() + backoffMs;
  try {
    await redis.zadd(REDIS_KEY, availableAt, keyId).catch(() => {});
    await pool.query(
      'UPDATE api_keys SET is_rate_limited=true, rate_limited_until=$1 WHERE id=$2',
      [new Date(availableAt), keyId]
    );
  } catch {}
  console.warn(`[KeyRotation] Key ${keyId} rate-limited for ${backoffMs / 1000}s`);
}

async function markKeyUsed(keyId: string): Promise<void> {
  try {
    await pool.query('UPDATE api_keys SET last_used_at=NOW(), usage_count=usage_count+1 WHERE id=$1', [keyId]);
  } catch {}
}

// ─── Background sweeper — runs every 10s ────────────────────────────────────

export function startKeySweeper(): void {
  setInterval(async () => {
    try {
      const { rows } = await pool.query(
        `SELECT id FROM api_keys WHERE is_rate_limited=true AND rate_limited_until <= NOW() AND is_active=true`
      );
      for (const row of rows) {
        await pool.query('UPDATE api_keys SET is_rate_limited=false WHERE id=$1', [row.id]);
        await redis.zadd(REDIS_KEY, 0, String(row.id)).catch(() => {});
      }
    } catch {}
  }, 10_000);
}

function getFallbackKey(attempt: number): string | null {
  const raw = process.env.NVIDIA_API_KEYS || process.env.NVIDIA_API_KEY || '';
  const keys = raw.split(',').map((k) => k.trim()).filter((k) => k.length > 5);
  if (!keys.length) return null;
  return keys[attempt % keys.length];
}

// ─── Main NVIDIA call with failover ─────────────────────────────────────────

export interface NvidiaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NvidiaOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
}

const MAX_TOKENS_CAP = 16384; // Hard cap to prevent runaway token usage

export async function callNvidia(
  messages: NvidiaMessage[],
  options: NvidiaOptions = {},
  attempt = 0,
  triedKeys = new Set<string>()
): Promise<{ content: string; tokensUsed: number }> {
  if (attempt > 5) {
    throw new Error('ALL_KEYS_EXHAUSTED');
  }

  let apiKey: string | null = null;
  let keyId: string | null = await getHealthyKeyId();

  if (keyId && !triedKeys.has(keyId)) {
    triedKeys.add(keyId);
    try {
      apiKey = await getKeyValue(keyId);
    } catch {
      apiKey = null;
    }
  }

  // Fallback to single key extracted from process.env if pool key not found
  if (!apiKey) {
    apiKey = getFallbackKey(attempt);
  }

  if (!apiKey) {
    throw new Error('ALL_KEYS_RATE_LIMITED');
  }

  const modelName = process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';

  const payload: any = {
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
    signal: AbortSignal.timeout(60_000),
  });

  if (res.status === 429 || res.status === 503) {
    if (keyId) await markKeyLimited(keyId, attempt + 1);
    return callNvidia(messages, options, attempt + 1, triedKeys);
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[NVIDIA] Error ${res.status}:`, errText);
    if (keyId) await markKeyLimited(keyId, attempt + 1);
    return callNvidia(messages, options, attempt + 1, triedKeys);
  }

  if (keyId) await markKeyUsed(keyId);

  const data = (await res.json()) as any;
  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.completion_tokens || 0;

  return { content, tokensUsed };
}

export async function callNvidiaStream(
  messages: NvidiaMessage[],
  onChunk: (chunk: { contentToken?: string; reasoningToken?: string }) => void,
  options: NvidiaOptions = {},
  attempt = 0,
  triedKeys = new Set<string>()
): Promise<{ fullContent: string; tokensUsed: number }> {
  if (attempt > 5) {
    throw new Error('ALL_KEYS_EXHAUSTED');
  }

  let apiKey: string | null = null;
  let keyId: string | null = await getHealthyKeyId();

  if (keyId && !triedKeys.has(keyId)) {
    triedKeys.add(keyId);
    try {
      apiKey = await getKeyValue(keyId);
    } catch {
      apiKey = null;
    }
  }

  if (!apiKey) {
    apiKey = getFallbackKey(attempt);
  }

  if (!apiKey) {
    throw new Error('ALL_KEYS_RATE_LIMITED');
  }

  const modelName = process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';

  const payload: any = {
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
    if (keyId) await markKeyLimited(keyId, attempt + 1);
    return callNvidiaStream(messages, onChunk, options, attempt + 1, triedKeys);
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[NVIDIA Stream] Error ${res.status}:`, errText);
    if (keyId) await markKeyLimited(keyId, attempt + 1);
    return callNvidiaStream(messages, onChunk, options, attempt + 1, triedKeys);
  }

  if (keyId) await markKeyUsed(keyId);

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
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta;
          if (delta) {
            const contentToken = delta.content || '';
            const reasoningToken = delta.reasoning_content || '';
            if (contentToken || reasoningToken) {
              tokenCount++;
              if (contentToken) fullContent += contentToken;
              onChunk({ contentToken, reasoningToken });
            }
          }
        } catch {}
      }
    }
  }

  return { fullContent, tokensUsed: tokenCount };
}

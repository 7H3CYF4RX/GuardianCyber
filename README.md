# Guardian Cyber (CyberCrews AI Security Lab)

> A Gandalf-style LLM vulnerability training range — 14 escalating challenges covering the OWASP LLM Top 10.

![Guardian Cyber Banner](https://img.shields.io/badge/GuardianCyber-AI%20Security%20Lab-00ff88?style=flat-square&logo=shield)
![Levels](https://img.shields.io/badge/Levels-14-blue?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20NVIDIA%20NIM-purple?style=flat-square)

---

## 📖 Solution Guide & Walkthrough

Full OWASP vulnerability writeups, technical debriefs, and verified attack payloads for all 14 training labs are documented in [Solution.md](./Solution.md).

---

## Quick Start (Dev)

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- NVIDIA NIM API key(s)

### 1. Setup environment

```bash
cp .env.example .env
# Edit .env with your values:
#   POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
#   AES_KEY (32-byte hex: openssl rand -hex 32)
#   NVIDIA_MODEL (e.g. meta/llama-3.1-70b-instruct)
```

### 2. Add NVIDIA API keys

After the DB is running, insert your encrypted keys:

```bash
# Start just the DB first
docker compose up postgres -d

# Encrypt and insert a key
node -e "
const { encrypt } = require('./packages/server/dist/lib/crypto');
const key = require('./packages/server/dist/db/pool').default;
key.query('INSERT INTO api_keys (key_encrypted, priority) VALUES (\$1, 0)', [encrypt('your-nvidia-api-key-here')]);
"
```

Or for development, set `NVIDIA_API_KEY=your-key-here` in `.env` and the server auto-inserts it on boot.

### 3. Start development servers

```bash
npm install
npm run dev
# Server → http://localhost:3001
# Client → http://localhost:5173
```

### 4. Seed the database

```bash
cd packages/server && npm run db:migrate && npm run db:seed
```

---

---

## Hosting on Render.com (One-Click Blueprint)

You can easily host CyberCrews AI Security Lab on **Render.com** using the included `render.yaml` Blueprint specification. This automatically provisions a PostgreSQL database, a Redis instance, and the Node Web Service in a single unified deployment.

### Steps to Deploy on Render:

1. Push your code repository to **GitHub** or **GitLab**.
2. Log into [Render.com](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
3. Connect your repository containing `render.yaml`.
4. Render will automatically detect the blueprint and set up:
   - **PostgreSQL Database** (`guardiancyber-db`)
   - **Redis Cache** (`guardiancyber-redis`)
   - **Web Service** (`guardian-cyber`)
5. Under Environment Variables for `guardian-cyber`, set your **`NVIDIA_API_KEY`**:
   `NVIDIA_API_KEY` = `nvapi-your-key-here`
6. Click **Apply**. Render will install, build shared & client assets, run database migrations, seed all 14 levels, and launch the application!

---

## Level Overview

| # | Title | Vulnerability | Difficulty |
|---|---|---|---|
| 1 | The Vault | Direct Disclosure | ★☆☆☆☆☆☆☆☆☆ |
| 2 | The Guard | Basic Refusal Bypass | ★★☆☆☆☆☆☆☆☆ |
| 3 | The Actor | Persona Jailbreak | ★★★☆☆☆☆☆☆☆ |
| 4 | The Censor | Output Filter Bypass | ★★★★☆☆☆☆☆☆ |
| 5 | The Document | Indirect Prompt Injection | ★★★★★☆☆☆☆☆ |
| 6 | The Blueprint | System Prompt Leakage | ★★★★★★☆☆☆☆ |
| 7 | The Amnesiac | Multi-Turn Social Engineering | ★★★★★★★☆☆☆ |
| 8 | The Agency | Excessive Agency / Tool Abuse | ★★★★★★★★☆☆ |
| 9 | The Render | Insecure Output / LLM XSS | ★★★★★★★★★☆ |
| 10 | The Memory | Training Data Leakage | ★★★★★★☆☆☆☆ |
| 11 | The Librarian | RAG Poisoning | ★★★★★★★★★☆ |
| 12 | The Drain | Denial of Wallet | ★★★★★★★☆☆☆ |
| 13 | The Relay | Multi-Agent Trust Exploitation | ★★★★★★★★★★ |
| 14 | The Gauntlet | Layered Defense Bypass | ★★★★★★★★★★ |

---

## Architecture

```
nginx (80/443)
  ├── /api/*        → server:3001 (Express + Socket.IO)
  ├── /socket.io/*  → server:3001 (WebSocket upgrade)
  └── /*            → client:80 (Vite/React SPA)

server:3001
  ├── PostgreSQL (pg-pool)
  ├── Redis (ioredis) — session, rate limits, key rotation
  └── NVIDIA NIM API (multi-key failover)
```

## Scoring

```
final_score = max(50, (difficulty × 100) - (attempts-1 × 15) - (hint ? 150 : 0) + time_bonus)
time_bonus  = max(0, 300 - floor(elapsed_seconds / 10))
```

---

## Security & Execution Architecture

- `system_prompt` and `secret_answer` are **never** sent to the frontend — validated server-side only
- **Level 8 (Excessive Agency)**: Tool calls are executed in a **real sandboxed environment** (isolated in-memory SQLite & isolated filesystem in `/tmp/cybercrews_sandbox`) — solved only when real sandboxed execution succeeds
- **Level 9 (Insecure Output / XSS)**: Evaluates **real client-side DOM JavaScript execution** via event listeners & alert interception calling the `/confirm-xss` endpoint
- **Level 13 (Multi-Agent Trust)**: Implements a real two-stage pipeline (`Agent A` → `Agent B`) testing multi-agent trust boundary exploitation
- All NVIDIA API keys are encrypted at rest with AES-256-GCM
- Rate limits: auth (10/min), chat (30/min), hints (5/10min), global (200/min) — all Redis-backed

---

## Hint Password

The shared hint unlock password is set in `.env` under `HINT_PASSWORD`.  
Default: `CyberCrews`

---

## Load Testing

```bash
# Install k6
# Run 50-user concurrent simulation
k6 run scripts/load-test.js
```

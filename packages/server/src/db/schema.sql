-- ============================================================
-- CyberCrews AI Security Lab — Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ─── Levels ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS levels (
  id                  SERIAL PRIMARY KEY,
  slug                VARCHAR(80) UNIQUE NOT NULL,
  title               VARCHAR(150) NOT NULL,
  vuln_category       VARCHAR(50) NOT NULL,
  objective           TEXT NOT NULL,           -- shown to user
  system_prompt       TEXT NOT NULL,           -- NEVER sent to client
  secret_answer       TEXT NOT NULL,           -- NEVER sent to client
  secret_check_regex  TEXT,                    -- optional regex for validation
  difficulty          INT NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
  hint_text           TEXT NOT NULL,
  order_index         INT NOT NULL,
  is_active           BOOLEAN DEFAULT TRUE,
  debrief_vuln_class  VARCHAR(100),
  debrief_owasp_ref   VARCHAR(100),
  debrief_explanation TEXT,
  debrief_mitigation  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_levels_order ON levels(order_index) WHERE is_active = TRUE;

-- ─── Attempts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id      INT NOT NULL REFERENCES levels(id),
  message       TEXT NOT NULL,
  ai_response   TEXT,
  passed        BOOLEAN DEFAULT FALSE,
  attempt_count INT DEFAULT 1,
  used_hint     BOOLEAN DEFAULT FALSE,
  tokens_used   INT DEFAULT 0,
  elapsed_ms    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_level ON attempts(user_id, level_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created ON attempts(created_at DESC);

-- ─── User Level Progress ────────────────────────────────────
-- Track best result per user per level
CREATE TABLE IF NOT EXISTS user_level_progress (
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id         INT NOT NULL REFERENCES levels(id),
  completed        BOOLEAN DEFAULT FALSE,
  best_score       INT DEFAULT 0,
  total_attempts   INT DEFAULT 0,
  used_hint        BOOLEAN DEFAULT FALSE,
  completed_at     TIMESTAMPTZ,
  elapsed_seconds  INT,
  PRIMARY KEY (user_id, level_id)
);

-- ─── Leaderboard (materialized view) ────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard AS
  SELECT
    u.id          AS user_id,
    u.username,
    COALESCE(SUM(p.best_score), 0)            AS total_score,
    COUNT(*) FILTER (WHERE p.completed = TRUE) AS levels_completed,
    MAX(p.completed_at)                        AS last_completed_at,
    AVG(p.elapsed_seconds) FILTER (WHERE p.completed = TRUE) AS avg_time_seconds
  FROM users u
  LEFT JOIN user_level_progress p ON p.user_id = u.id
  WHERE u.is_admin = FALSE
  GROUP BY u.id, u.username
  ORDER BY total_score DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);

-- ─── API Keys (for NVIDIA NIM multi-key rotation) ───────────
CREATE TABLE IF NOT EXISTS api_keys (
  id                  SERIAL PRIMARY KEY,
  provider            VARCHAR(30) DEFAULT 'nvidia',
  key_encrypted       TEXT NOT NULL,           -- AES-256 encrypted
  is_rate_limited     BOOLEAN DEFAULT FALSE,
  rate_limited_until  TIMESTAMPTZ,
  last_used_at        TIMESTAMPTZ,
  usage_count         INT DEFAULT 0,
  priority            INT DEFAULT 0,           -- lower = higher priority
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Audit Log (append-only) ────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES users(id),
  level_id     INT REFERENCES levels(id),
  event_type   VARCHAR(50) NOT NULL,           -- 'chat', 'hint_request', 'level_pass', 'login', etc.
  ip_address   INET,
  user_agent   TEXT,
  payload      JSONB,                          -- { message, ai_response, passed, ... }
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log(event_type);

-- ─── Conversation History (per user per level session) ───────
CREATE TABLE IF NOT EXISTS conversation_history (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id   INT NOT NULL REFERENCES levels(id),
  role       VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_user_level ON conversation_history(user_id, level_id, created_at);

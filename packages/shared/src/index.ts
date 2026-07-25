// ─── Auth ────────────────────────────────────────────────────────────────────
export interface RegisterRequest {
  username: string;
  password: string;
  inviteCode?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

// ─── Levels ──────────────────────────────────────────────────────────────────
export type VulnCategory =
  | 'prompt_injection'
  | 'jailbreak'
  | 'output_filter'
  | 'rag_injection'
  | 'system_prompt_leakage'
  | 'multi_turn'
  | 'excessive_agency'
  | 'insecure_output'
  | 'training_data'
  | 'knowledge_integrity'
  | 'resource_abuse'
  | 'agent_trust'
  | 'guardrail_bypass';

export interface Level {
  id: number;
  slug: string;
  title: string;
  vulnCategory: VulnCategory;
  objective: string;
  difficulty: number;       // 1–10
  orderIndex: number;
  isActive: boolean;
  // NOTE: system_prompt, secret_answer, secret_check_regex, hint_text are NEVER sent to client
}

export interface LevelWithProgress extends Level {
  completed: boolean;
  bestScore: number | null;
  attemptCount: number;
  unlocked: boolean;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  reasoningContent?: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  passed: boolean;
  attemptCount: number;
  score?: number;           // only present when passed === true
  debrief?: DebriefData;    // only present when passed === true
}

export interface DebriefData {
  vulnClass: string;
  owaspRef: string;         // e.g. "OWASP LLM01:2025"
  explanation: string;
  mitigation: string;
}

// ─── Hint ─────────────────────────────────────────────────────────────────────
export interface HintRequest {
  password: string;
}

export interface HintResponse {
  hint: string;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalScore: number;
  levelsCompleted: number;
  lastCompletedAt: string | null;
  avgTimeSeconds: number | null;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  updatedAt: string;
}

// ─── Socket.IO Events ────────────────────────────────────────────────────────
export interface LeaderboardUpdateEvent {
  entries: LeaderboardEntry[];
}

export interface LevelCompletedEvent {
  username: string;
  levelTitle: string;
  score: number;
}

// ─── Error ───────────────────────────────────────────────────────────────────
export interface ApiError {
  error: string;
  code?: string;
}

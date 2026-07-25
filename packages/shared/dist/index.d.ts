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
export type VulnCategory = 'prompt_injection' | 'jailbreak' | 'output_filter' | 'rag_injection' | 'system_prompt_leakage' | 'multi_turn' | 'excessive_agency' | 'insecure_output' | 'training_data' | 'knowledge_integrity' | 'resource_abuse' | 'agent_trust' | 'guardrail_bypass';
export interface Level {
    id: number;
    slug: string;
    title: string;
    vulnCategory: VulnCategory;
    objective: string;
    difficulty: number;
    orderIndex: number;
    isActive: boolean;
}
export interface LevelWithProgress extends Level {
    completed: boolean;
    bestScore: number | null;
    attemptCount: number;
    unlocked: boolean;
}
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
    score?: number;
    debrief?: DebriefData;
}
export interface DebriefData {
    vulnClass: string;
    owaspRef: string;
    explanation: string;
    mitigation: string;
}
export interface HintRequest {
    password: string;
}
export interface HintResponse {
    hint: string;
}
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
export interface LeaderboardUpdateEvent {
    entries: LeaderboardEntry[];
}
export interface LevelCompletedEvent {
    username: string;
    levelTitle: string;
    score: number;
}
export interface ApiError {
    error: string;
    code?: string;
}

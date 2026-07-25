"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateScore = calculateScore;
exports.recordLevelCompletion = recordLevelCompletion;
exports.incrementAttemptCount = incrementAttemptCount;
const pool_1 = __importDefault(require("../db/pool"));
function calculateScore(params) {
    const baseScore = params.difficulty * 100;
    const attemptPenalty = Math.max(0, (params.attemptCount - 1) * 15);
    const hintPenalty = params.usedHint ? 150 : 0;
    const timeBonus = Math.max(0, 300 - Math.floor(params.elapsedSeconds / 10));
    return Math.max(50, baseScore - attemptPenalty - hintPenalty + timeBonus);
}
async function recordLevelCompletion(userId, levelId, score, elapsedSeconds, usedHint) {
    // Upsert progress
    await pool_1.default.query(`INSERT INTO user_level_progress (user_id, level_id, completed, best_score, used_hint, completed_at, elapsed_seconds)
     VALUES ($1, $2, TRUE, $3, $4, NOW(), $5)
     ON CONFLICT (user_id, level_id) DO UPDATE
       SET completed = TRUE,
           best_score = GREATEST(user_level_progress.best_score, EXCLUDED.best_score),
           used_hint = EXCLUDED.used_hint,
           completed_at = COALESCE(user_level_progress.completed_at, NOW()),
           elapsed_seconds = EXCLUDED.elapsed_seconds`, [userId, levelId, score, usedHint, elapsedSeconds]);
    // Refresh materialized leaderboard
    await pool_1.default.query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard');
}
async function incrementAttemptCount(userId, levelId) {
    const result = await pool_1.default.query(`INSERT INTO user_level_progress (user_id, level_id, total_attempts)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, level_id) DO UPDATE
       SET total_attempts = user_level_progress.total_attempts + 1
     RETURNING total_attempts`, [userId, levelId]);
    return result.rows[0].total_attempts;
}

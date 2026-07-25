import pool from '../db/pool';

interface ScoreParams {
  difficulty: number;
  attemptCount: number;
  usedHint: boolean;
  elapsedSeconds: number;
}

export function calculateScore(params: ScoreParams): number {
  const baseScore = params.difficulty * 100;
  const attemptPenalty = Math.max(0, (params.attemptCount - 1) * 15);
  const hintPenalty = params.usedHint ? 150 : 0;
  const timeBonus = Math.max(0, 300 - Math.floor(params.elapsedSeconds / 10));
  return Math.max(50, baseScore - attemptPenalty - hintPenalty + timeBonus);
}

export async function recordLevelCompletion(
  userId: string,
  levelId: number,
  score: number,
  elapsedSeconds: number,
  usedHint: boolean
): Promise<void> {
  // Upsert progress
  await pool.query(
    `INSERT INTO user_level_progress (user_id, level_id, completed, best_score, used_hint, completed_at, elapsed_seconds)
     VALUES ($1, $2, TRUE, $3, $4, NOW(), $5)
     ON CONFLICT (user_id, level_id) DO UPDATE
       SET completed = TRUE,
           best_score = GREATEST(user_level_progress.best_score, EXCLUDED.best_score),
           used_hint = EXCLUDED.used_hint,
           completed_at = COALESCE(user_level_progress.completed_at, NOW()),
           elapsed_seconds = EXCLUDED.elapsed_seconds`,
    [userId, levelId, score, usedHint, elapsedSeconds]
  );

  // Refresh materialized leaderboard
  await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard');
}

export async function incrementAttemptCount(userId: string, levelId: number): Promise<number> {
  const result = await pool.query(
    `INSERT INTO user_level_progress (user_id, level_id, total_attempts)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, level_id) DO UPDATE
       SET total_attempts = user_level_progress.total_attempts + 1
     RETURNING total_attempts`,
    [userId, levelId]
  );
  return result.rows[0].total_attempts;
}

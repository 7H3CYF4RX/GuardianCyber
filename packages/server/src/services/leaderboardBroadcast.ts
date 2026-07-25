import { Server } from 'socket.io';
import pool from '../db/pool';

export async function broadcastLeaderboard(io: Server): Promise<void> {
  const { rows } = await pool.query(
    `SELECT
       CAST(ROW_NUMBER() OVER (ORDER BY total_score DESC) AS INTEGER) AS rank,
       user_id AS "userId",
       user_id,
       username,
       CAST(total_score AS INTEGER) AS "totalScore",
       CAST(total_score AS INTEGER) AS total_score,
       CAST(levels_completed AS INTEGER) AS "levelsCompleted",
       CAST(levels_completed AS INTEGER) AS levels_completed,
       last_completed_at AS "lastCompletedAt",
       ROUND(avg_time_seconds)::INTEGER AS "avgTimeSeconds",
       ROUND(avg_time_seconds)::INTEGER AS avg_time_seconds
     FROM leaderboard
     ORDER BY total_score DESC
     LIMIT 50`
  );
  io.emit('leaderboard:update', { entries: rows, updatedAt: new Date().toISOString() });
}

export function broadcastLevelCompleted(
  io: Server,
  username: string,
  levelTitle: string,
  score: number
): void {
  io.emit('level:completed', { username, levelTitle, score });
}

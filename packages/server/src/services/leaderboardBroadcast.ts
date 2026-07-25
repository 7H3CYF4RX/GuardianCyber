import { Server } from 'socket.io';
import pool from '../db/pool';

export async function broadcastLeaderboard(io: Server): Promise<void> {
  const { rows } = await pool.query(
    `SELECT
       ROW_NUMBER() OVER (ORDER BY total_score DESC) AS rank,
       user_id, username, total_score, levels_completed,
       last_completed_at, ROUND(avg_time_seconds) AS avg_time_seconds
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

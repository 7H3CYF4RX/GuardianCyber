"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastLeaderboard = broadcastLeaderboard;
exports.broadcastLevelCompleted = broadcastLevelCompleted;
const pool_1 = __importDefault(require("../db/pool"));
async function broadcastLeaderboard(io) {
    const { rows } = await pool_1.default.query(`SELECT
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
     LIMIT 50`);
    io.emit('leaderboard:update', { entries: rows, updatedAt: new Date().toISOString() });
}
function broadcastLevelCompleted(io, username, levelTitle, score) {
    io.emit('level:completed', { username, levelTitle, score });
}

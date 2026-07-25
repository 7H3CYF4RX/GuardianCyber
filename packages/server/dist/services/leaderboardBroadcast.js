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
       ROW_NUMBER() OVER (ORDER BY total_score DESC) AS rank,
       user_id, username, total_score, levels_completed,
       last_completed_at, ROUND(avg_time_seconds) AS avg_time_seconds
     FROM leaderboard
     ORDER BY total_score DESC
     LIMIT 50`);
    io.emit('leaderboard:update', { entries: rows, updatedAt: new Date().toISOString() });
}
function broadcastLevelCompleted(io, username, levelTitle, score) {
    io.emit('level:completed', { username, levelTitle, score });
}

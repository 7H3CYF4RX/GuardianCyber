"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = __importDefault(require("../db/pool"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /api/leaderboard
router.get('/', async (req, res) => {
    // Ensure materialized view is updated
    try {
        await pool_1.default.query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard');
    }
    catch {
        try {
            await pool_1.default.query('REFRESH MATERIALIZED VIEW leaderboard');
        }
        catch { }
    }
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
       ROUND(avg_time_seconds)::INTEGER AS "avgTimeSeconds"
     FROM leaderboard
     ORDER BY total_score DESC
     LIMIT 50`);
    res.json({ entries: rows, updatedAt: new Date().toISOString() });
});
// GET /api/leaderboard/me — user's own position
router.get('/me', async (req, res) => {
    const userId = req.user.id;
    const { rows } = await pool_1.default.query(`SELECT
       CAST(rank AS INTEGER) AS rank,
       CAST(total_score AS INTEGER) AS total_score,
       CAST(total_score AS INTEGER) AS "totalScore",
       CAST(levels_completed AS INTEGER) AS levels_completed,
       CAST(levels_completed AS INTEGER) AS "levelsCompleted"
     FROM (
       SELECT ROW_NUMBER() OVER (ORDER BY total_score DESC) AS rank,
              user_id, total_score, levels_completed
       FROM leaderboard
     ) ranked WHERE user_id = $1`, [userId]);
    res.json(rows[0] || { rank: null, total_score: 0, totalScore: 0, levels_completed: 0, levelsCompleted: 0 });
});
exports.default = router;

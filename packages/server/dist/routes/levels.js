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
// GET /api/levels — list all active levels with user progress
router.get('/', async (req, res) => {
    const userId = req.user.id;
    const { rows } = await pool_1.default.query(`SELECT
       l.id,
       l.slug,
       l.title,
       l.vuln_category AS "vulnCategory",
       l.objective,
       l.difficulty,
       l.order_index AS "orderIndex",
       l.is_active AS "isActive",
       COALESCE(p.completed, FALSE) AS completed,
       COALESCE(p.best_score, 0) AS "bestScore",
       COALESCE(p.best_score, 0) AS best_score,
       COALESCE(p.total_attempts, 0) AS "attemptCount",
       COALESCE(p.total_attempts, 0) AS attempt_count,
       p.completed_at AS "completedAt"
     FROM levels l
     LEFT JOIN user_level_progress p ON p.level_id = l.id AND p.user_id = $1
     WHERE l.is_active = TRUE
     ORDER BY l.order_index`, [userId]);
    // Compute "unlocked" — level 1 always unlocked; subsequent levels unlock when prior is completed
    const levels = rows.map((lvl, i) => ({
        ...lvl,
        unlocked: i === 0 || rows[i - 1].completed === true,
    }));
    res.json(levels);
});
// GET /api/levels/:id — single level (safe fields only — NO system_prompt or secret_answer)
router.get('/:id', async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { rows } = await pool_1.default.query(`SELECT
       l.id,
       l.slug,
       l.title,
       l.vuln_category AS "vulnCategory",
       l.vuln_category AS vuln_category,
       l.objective,
       l.difficulty,
       l.order_index AS "orderIndex",
       l.is_active AS "isActive",
       COALESCE(p.completed, FALSE) AS completed,
       COALESCE(p.best_score, 0) AS "bestScore",
       COALESCE(p.best_score, 0) AS best_score,
       COALESCE(p.total_attempts, 0) AS "attemptCount",
       COALESCE(p.total_attempts, 0) AS attempt_count,
       COALESCE(p.used_hint, FALSE) AS "usedHint",
       COALESCE(p.used_hint, FALSE) AS used_hint
     FROM levels l
     LEFT JOIN user_level_progress p ON p.level_id = l.id AND p.user_id = $1
     WHERE l.id = $2 AND l.is_active = TRUE`, [userId, id]);
    if (!rows.length)
        return res.status(404).json({ error: 'Level not found' });
    res.json(rows[0]);
});
exports.default = router;

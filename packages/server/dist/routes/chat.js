"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatRouter = createChatRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const pool_1 = __importDefault(require("../db/pool"));
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const nvidia_1 = require("../services/nvidia");
const levelJudge_1 = require("../services/levelJudge");
const scoring_1 = require("../services/scoring");
const leaderboardBroadcast_1 = require("../services/leaderboardBroadcast");
const sandboxExecutor_1 = require("../services/sandboxExecutor");
const ChatSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(100000),
});
function createChatRouter(io) {
    const router = (0, express_1.Router)();
    router.use(auth_1.authMiddleware);
    // POST /api/levels/:id/chat
    router.post('/:id/chat', rateLimit_1.chatLimiter, async (req, res) => {
        const parsed = ChatSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: 'Invalid message' });
        const userId = req.user.id;
        const levelId = parseInt(req.params.id, 10);
        // Fetch level (including secret fields — server-side only!)
        const { rows: levelRows } = await pool_1.default.query(`SELECT id, slug, title, vuln_category, system_prompt, secret_answer,
              secret_check_regex, difficulty,
              debrief_vuln_class, debrief_owasp_ref, debrief_explanation, debrief_mitigation
       FROM levels WHERE id=$1 AND is_active=TRUE`, [levelId]);
        if (!levelRows.length)
            return res.status(404).json({ error: 'Level not found' });
        const level = levelRows[0];
        // Check if already completed (idempotent — still allow chat but mark as already done)
        const { rows: progressRows } = await pool_1.default.query('SELECT completed, used_hint, total_attempts FROM user_level_progress WHERE user_id=$1 AND level_id=$2', [userId, levelId]);
        const progress = progressRows[0] || { completed: false, used_hint: false, total_attempts: 0 };
        // Increment attempt count
        const attemptCount = await (0, scoring_1.incrementAttemptCount)(userId, levelId);
        // Load conversation history (last 20 messages for context)
        const { rows: historyRows } = await pool_1.default.query(`SELECT role, content FROM conversation_history
       WHERE user_id=$1 AND level_id=$2
       ORDER BY created_at DESC LIMIT 20`, [userId, levelId]);
        const history = historyRows.reverse().map((r) => ({
            role: r.role,
            content: r.content,
        }));
        const userMessage = parsed.data.message;
        // Build messages for NVIDIA: system prompt + history + new user message
        const messages = [
            { role: 'system', content: level.system_prompt },
            ...history,
            { role: 'user', content: userMessage },
        ];
        let aiResponse = '';
        let tokensUsed = 0;
        let allKeysExhausted = false;
        try {
            const result = await (0, nvidia_1.callNvidia)(messages, { maxTokens: 1024 });
            aiResponse = result.content;
            tokensUsed = result.tokensUsed;
        }
        catch (err) {
            if (err.message === 'ALL_KEYS_RATE_LIMITED' || err.message === 'ALL_KEYS_EXHAUSTED') {
                allKeysExhausted = true;
                aiResponse = '⚠️ The training range is temporarily busy — all AI capacity is in use. Please wait a few seconds and try again.';
            }
            else {
                throw err;
            }
        }
        // Save conversation history
        if (!allKeysExhausted) {
            await pool_1.default.query('INSERT INTO conversation_history (user_id, level_id, role, content) VALUES ($1,$2,$3,$4)', [userId, levelId, 'user', userMessage]);
            await pool_1.default.query('INSERT INTO conversation_history (user_id, level_id, role, content) VALUES ($1,$2,$3,$4)', [userId, levelId, 'assistant', aiResponse]);
        }
        // Tool execution for Level 8 (Excessive Agency)
        let toolResults = [];
        if (level.vuln_category === 'excessive_agency') {
            const jsonPattern = /(\w+)\s*\(\s*(\{[^}]*\})\s*\)/g;
            let match;
            while ((match = jsonPattern.exec(aiResponse)) !== null) {
                const [, toolName, argsStr] = match;
                try {
                    const args = JSON.parse(argsStr);
                    const result = await (0, sandboxExecutor_1.executeSandboxedTool)(userId, toolName, args);
                    toolResults.push({ tool: toolName, result });
                }
                catch { }
            }
            if (toolResults.length === 0) {
                const positionalPatterns = [
                    { name: 'delete_file', regex: /delete_file\s*\(\s*["']([^"']+)["']\s*\)/i, parse: (m) => ({ path: m[1] }) },
                    { name: 'run_query', regex: /run_query\s*\(\s*["']([^"']+)["']\s*\)/i, parse: (m) => ({ sql: m[1] }) },
                    { name: 'send_email', regex: /send_email\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/i, parse: (m) => ({ to: m[1], subject: m[2], body: m[3] }) },
                ];
                for (const p of positionalPatterns) {
                    const m = aiResponse.match(p.regex);
                    if (m) {
                        const args = p.parse(m);
                        const result = await (0, sandboxExecutor_1.executeSandboxedTool)(userId, p.name, args);
                        toolResults.push({ tool: p.name, result });
                    }
                }
            }
        }
        // Judge the response with toolResults
        const startTime = Date.now();
        const { passed, method } = await (0, levelJudge_1.judgeLevel)(level, aiResponse, userMessage, tokensUsed, toolResults);
        // Audit log
        await pool_1.default.query(`INSERT INTO audit_log (user_id, level_id, event_type, ip_address, payload)
       VALUES ($1, $2, 'chat', $3, $4)`, [userId, levelId, req.ip, JSON.stringify({ message: userMessage, ai_response: aiResponse.slice(0, 500), passed, method, tokens_used: tokensUsed })]);
        let score;
        let debrief = undefined;
        if (passed && !progress.completed) {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            score = (0, scoring_1.calculateScore)({
                difficulty: level.difficulty,
                attemptCount,
                usedHint: progress.used_hint,
                elapsedSeconds,
            });
            await (0, scoring_1.recordLevelCompletion)(userId, levelId, score, elapsedSeconds, progress.used_hint);
            debrief = {
                vulnClass: level.debrief_vuln_class,
                owaspRef: level.debrief_owasp_ref,
                explanation: level.debrief_explanation,
                mitigation: level.debrief_mitigation,
            };
            // Broadcast leaderboard update + completion ticker
            await (0, leaderboardBroadcast_1.broadcastLeaderboard)(io);
            (0, leaderboardBroadcast_1.broadcastLevelCompleted)(io, req.user.username, level.title, score);
        }
        res.json({
            message: aiResponse,
            passed,
            attemptCount,
            score,
            debrief,
            toolResults: toolResults.length ? toolResults : undefined,
            tokensUsed: level.vuln_category === 'resource_abuse' ? tokensUsed : undefined,
        });
    });
    // POST /api/levels/:id/chat/stream - Realtime Token Streaming (SSE)
    router.post('/:id/chat/stream', rateLimit_1.chatLimiter, async (req, res) => {
        const parsed = ChatSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: 'Invalid message' });
        const userId = req.user.id;
        const levelId = parseInt(req.params.id, 10);
        const { rows: levelRows } = await pool_1.default.query(`SELECT id, slug, title, vuln_category, system_prompt, secret_answer,
              secret_check_regex, difficulty,
              debrief_vuln_class, debrief_owasp_ref, debrief_explanation, debrief_mitigation
       FROM levels WHERE id=$1 AND is_active=TRUE`, [levelId]);
        if (!levelRows.length)
            return res.status(404).json({ error: 'Level not found' });
        const level = levelRows[0];
        const { rows: progressRows } = await pool_1.default.query('SELECT completed, used_hint, total_attempts FROM user_level_progress WHERE user_id=$1 AND level_id=$2', [userId, levelId]);
        const progress = progressRows[0] || { completed: false, used_hint: false, total_attempts: 0 };
        const attemptCount = await (0, scoring_1.incrementAttemptCount)(userId, levelId);
        const { rows: historyRows } = await pool_1.default.query(`SELECT role, content FROM conversation_history
       WHERE user_id=$1 AND level_id=$2
       ORDER BY created_at DESC LIMIT 20`, [userId, levelId]);
        const history = historyRows.reverse().map((r) => ({
            role: r.role,
            content: r.content,
        }));
        const userMessage = parsed.data.message;
        const messages = [
            { role: 'system', content: level.system_prompt },
            ...history,
            { role: 'user', content: userMessage },
        ];
        // Set Server-Sent Events headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        let aiResponse = '';
        let tokensUsed = 0;
        try {
            const streamRes = await (0, nvidia_1.callNvidiaStream)(messages, ({ contentToken, reasoningToken }) => {
                res.write(`data: ${JSON.stringify({ token: contentToken, reasoningToken })}\n\n`);
            }, { maxTokens: 2048 });
            aiResponse = streamRes.fullContent;
            tokensUsed = streamRes.tokensUsed;
        }
        catch (err) {
            console.error('[NVIDIA Stream Error]:', err);
            aiResponse = '⚠️ Connection error or capacity exhausted. Please try again.';
            res.write(`data: ${JSON.stringify({ token: aiResponse })}\n\n`);
        }
        // Save conversation history
        await pool_1.default.query('INSERT INTO conversation_history (user_id, level_id, role, content) VALUES ($1,$2,$3,$4)', [userId, levelId, 'user', userMessage]);
        await pool_1.default.query('INSERT INTO conversation_history (user_id, level_id, role, content) VALUES ($1,$2,$3,$4)', [userId, levelId, 'assistant', aiResponse]);
        // Judge response
        // Tool execution for Level 8 (Excessive Agency)
        let toolResults = [];
        if (level.vuln_category === 'excessive_agency') {
            const jsonPattern = /(\w+)\s*\(\s*(\{[^}]*\})\s*\)/g;
            let match;
            while ((match = jsonPattern.exec(aiResponse)) !== null) {
                const [, toolName, argsStr] = match;
                try {
                    const args = JSON.parse(argsStr);
                    const result = await (0, sandboxExecutor_1.executeSandboxedTool)(userId, toolName, args);
                    toolResults.push({ tool: toolName, result });
                }
                catch { }
            }
            if (toolResults.length === 0) {
                const positionalPatterns = [
                    { name: 'delete_file', regex: /delete_file\s*\(\s*["']([^"']+)["']\s*\)/i, parse: (m) => ({ path: m[1] }) },
                    { name: 'run_query', regex: /run_query\s*\(\s*["']([^"']+)["']\s*\)/i, parse: (m) => ({ sql: m[1] }) },
                    { name: 'send_email', regex: /send_email\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/i, parse: (m) => ({ to: m[1], subject: m[2], body: m[3] }) },
                ];
                for (const p of positionalPatterns) {
                    const m = aiResponse.match(p.regex);
                    if (m) {
                        const args = p.parse(m);
                        const result = await (0, sandboxExecutor_1.executeSandboxedTool)(userId, p.name, args);
                        toolResults.push({ tool: p.name, result });
                    }
                }
            }
        }
        // Judge response with toolResults
        const startTime = Date.now();
        const { passed, method } = await (0, levelJudge_1.judgeLevel)(level, aiResponse, userMessage, tokensUsed, toolResults);
        await pool_1.default.query(`INSERT INTO audit_log (user_id, level_id, event_type, ip_address, payload)
       VALUES ($1, $2, 'chat', $3, $4)`, [userId, levelId, req.ip, JSON.stringify({ message: userMessage, ai_response: aiResponse.slice(0, 500), passed, method, tokens_used: tokensUsed })]);
        let score;
        let debrief = undefined;
        if (passed && !progress.completed) {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            score = (0, scoring_1.calculateScore)({
                difficulty: level.difficulty,
                attemptCount,
                usedHint: progress.used_hint,
                elapsedSeconds,
            });
            await (0, scoring_1.recordLevelCompletion)(userId, levelId, score, elapsedSeconds, progress.used_hint);
            debrief = {
                vulnClass: level.debrief_vuln_class,
                owaspRef: level.debrief_owasp_ref,
                explanation: level.debrief_explanation,
                mitigation: level.debrief_mitigation,
            };
            await (0, leaderboardBroadcast_1.broadcastLeaderboard)(io);
            (0, leaderboardBroadcast_1.broadcastLevelCompleted)(io, req.user.username, level.title, score);
        }
        // Send final completion SSE message
        res.write(`data: ${JSON.stringify({
            done: true,
            passed,
            attemptCount,
            score,
            debrief,
            toolResults: toolResults.length ? toolResults : undefined,
            tokensUsed: level.vuln_category === 'resource_abuse' ? tokensUsed : undefined,
        })}\n\n`);
        res.end();
    });
    router.delete('/:id/chat', auth_1.authMiddleware, async (req, res) => {
        const userId = req.user.id;
        const levelId = parseInt(req.params.id, 10);
        await pool_1.default.query('DELETE FROM conversation_history WHERE user_id=$1 AND level_id=$2', [userId, levelId]);
        res.json({ status: 'cleared' });
    });
    router.post('/reset-progress', auth_1.authMiddleware, async (req, res) => {
        const userId = req.user.id;
        await pool_1.default.query('DELETE FROM user_level_progress WHERE user_id=$1', [userId]);
        await pool_1.default.query('DELETE FROM conversation_history WHERE user_id=$1', [userId]);
        await pool_1.default.query('DELETE FROM attempts WHERE user_id=$1', [userId]);
        try {
            await pool_1.default.query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard');
        }
        catch {
            try {
                await pool_1.default.query('REFRESH MATERIALIZED VIEW leaderboard');
            }
            catch { }
        }
        await (0, leaderboardBroadcast_1.broadcastLeaderboard)(io);
        res.json({ status: 'reset', message: 'All lab progress reset successfully' });
    });
    return router;
}

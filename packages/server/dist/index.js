"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const rateLimit_1 = require("./middleware/rateLimit");
const auth_1 = __importDefault(require("./routes/auth"));
const levels_1 = __importDefault(require("./routes/levels"));
const hint_1 = __importDefault(require("./routes/hint"));
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
const ocr_1 = __importDefault(require("./routes/ocr"));
const chat_1 = require("./routes/chat");
const nvidia_1 = require("./services/nvidia");
const leaderboardBroadcast_1 = require("./services/leaderboardBroadcast");
const redis_1 = __importDefault(require("./lib/redis"));
const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
async function main() {
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    // ─── Socket.IO ─────────────────────────────────────────────
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN ? true : CLIENT_ORIGIN,
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });
    io.on('connection', (socket) => {
        console.log(`[WS] Client connected: ${socket.id}`);
        (0, leaderboardBroadcast_1.broadcastLeaderboard)(io);
        socket.on('disconnect', () => {
            console.log(`[WS] Client disconnected: ${socket.id}`);
        });
    });
    // ─── Security middleware ───────────────────────────────────
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
    }));
    app.use((0, cors_1.default)({
        origin: process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN ? true : CLIENT_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
    app.use((0, cookie_parser_1.default)());
    app.use(rateLimit_1.globalLimiter);
    // Trust proxy (for correct IP behind proxies / Render)
    app.set('trust proxy', 1);
    // ─── Routes ────────────────────────────────────────────────
    app.use('/api/auth', auth_1.default);
    app.use('/api/levels', levels_1.default);
    app.use('/api/levels', (0, chat_1.createChatRouter)(io));
    app.use('/api/levels', hint_1.default);
    app.use('/api/leaderboard', leaderboard_1.default);
    app.use('/api/ocr', ocr_1.default);
    // Health check
    app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
    // ─── Static files for production (Render / Single Service deployment) ───
    const clientDistDir = path_1.default.resolve(process.cwd(), 'packages/client/dist');
    if (fs_1.default.existsSync(clientDistDir)) {
        console.log(`[Static] Serving client build from ${clientDistDir}`);
        app.use(express_1.default.static(clientDistDir));
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
                return next();
            }
            res.sendFile(path_1.default.join(clientDistDir, 'index.html'));
        });
    }
    // Global error handler (must be after routes)
    app.use(rateLimit_1.errorHandler);
    // ─── Bootstrap ─────────────────────────────────────────────
    await redis_1.default.connect().catch(() => console.warn('[Redis] Using lazy connection'));
    await (0, nvidia_1.initKeyRotation)();
    (0, nvidia_1.startKeySweeper)();
    httpServer.listen(PORT, () => {
        console.log(`🚀 Guardian Cyber server running on port ${PORT}`);
        console.log(`   Client origin: ${CLIENT_ORIGIN}`);
    });
}
main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

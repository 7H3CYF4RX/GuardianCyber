import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { globalLimiter, errorHandler } from './middleware/rateLimit';
import authRouter from './routes/auth';
import levelsRouter from './routes/levels';
import hintRouter from './routes/hint';
import leaderboardRouter from './routes/leaderboard';
import ocrRouter from './routes/ocr';
import { createChatRouter } from './routes/chat';
import { initKeyRotation, startKeySweeper } from './services/nvidia';
import { broadcastLeaderboard } from './services/leaderboardBroadcast';
import redis from './lib/redis';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

async function main() {
  const app = express();
  const httpServer = createServer(app);

  // ─── Socket.IO ─────────────────────────────────────────────
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN ? true : CLIENT_ORIGIN,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);
    broadcastLeaderboard(io);
    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  // ─── Security middleware ───────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  app.use(cors({
    origin: process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN ? true : CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());
  app.use(globalLimiter);

  // Trust proxy (for correct IP behind proxies / Render)
  app.set('trust proxy', 1);

  // ─── Routes ────────────────────────────────────────────────
  app.use('/api/auth', authRouter);
  app.use('/api/levels', levelsRouter);
  app.use('/api/levels', createChatRouter(io));
  app.use('/api/levels', hintRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/ocr', ocrRouter);

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // ─── Static files for production (Render / Single Service deployment) ───
  const clientDistDir = path.resolve(process.cwd(), 'packages/client/dist');
  if (fs.existsSync(clientDistDir)) {
    console.log(`[Static] Serving client build from ${clientDistDir}`);
    app.use(express.static(clientDistDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  // Global error handler (must be after routes)
  app.use(errorHandler);

  // ─── Bootstrap ─────────────────────────────────────────────
  await redis.connect().catch(() => console.warn('[Redis] Using lazy connection'));
  await initKeyRotation();
  startKeySweeper();

  httpServer.listen(PORT, () => {
    console.log(`🚀 Guardian Cyber server running on port ${PORT}`);
    console.log(`   Client origin: ${CLIENT_ORIGIN}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

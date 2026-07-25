import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../db/pool';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters long')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
  inviteCode: z.string().optional(),
});

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const JWT_SECRET = process.env.JWT_SECRET || 'cybercrews_jwt_secret_minimum_32_characters_long';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'cybercrews_jwt_refresh_secret_minimum_32_chars';

function generateTokens(userId: string, username: string, isAdmin: boolean) {
  const accessToken = jwt.sign(
    { sub: userId, username, isAdmin },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: userId },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Invalid registration details';
    return res.status(400).json({ error: message });
  }

  const { username, password, inviteCode } = parsed.data;

  if (process.env.INVITE_CODE_REQUIRED === 'true') {
    if (inviteCode !== process.env.INVITE_CODE) {
      return res.status(403).json({ error: 'Invalid invite code' });
    }
  }

  const existing = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
  if (existing.rows.length) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, is_admin, created_at',
    [username, hash]
  );
  const user = rows[0];

  res.status(201).json({
    message: 'User registered successfully. Please log in.',
    user: { id: user.id, username: user.username, isAdmin: user.is_admin, createdAt: user.created_at },
  });
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Invalid username or password';
    return res.status(400).json({ error: message });
  }

  const { username, password } = parsed.data;
  const { rows } = await pool.query(
    'SELECT id, username, password_hash, is_admin FROM users WHERE username=$1',
    [username]
  );

  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const user = rows[0];
  const { accessToken, refreshToken } = generateTokens(user.id, user.username, user.is_admin);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    accessToken,
    user: { id: user.id, username: user.username, isAdmin: user.is_admin },
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    const { rows } = await pool.query(
      'SELECT id, username, is_admin FROM users WHERE id=$1',
      [payload.sub]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });

    const user = rows[0];
    const { accessToken, refreshToken: newRefresh } = generateTokens(user.id, user.username, user.is_admin);

    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, user: { id: user.id, username: user.username, isAdmin: user.is_admin } });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

export default router;

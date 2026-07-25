import { Router, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { hintLimiter } from '../middleware/rateLimit';

const router = Router();
router.use(authMiddleware);

const HintSchema = z.object({
  password: z.string().min(1).max(100),
});

// POST /api/levels/:id/hint
router.post('/:id/hint', hintLimiter, async (req: AuthRequest, res: Response) => {
  const parsed = HintSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

  const userId = req.user!.id;
  const levelId = parseInt(req.params.id, 10);

  // Validate hint password (compare against env var, never the raw string)
  if (parsed.data.password !== process.env.HINT_PASSWORD) {
    await pool.query(
      `INSERT INTO audit_log (user_id, level_id, event_type, ip_address, payload)
       VALUES ($1, $2, 'hint_fail', $3, $4)`,
      [userId, levelId, req.ip, JSON.stringify({ attempt: true })]
    );
    return res.status(403).json({ error: 'Incorrect hint password' });
  }

  const { rows } = await pool.query('SELECT hint_text FROM levels WHERE id=$1 AND is_active=TRUE', [levelId]);
  if (!rows.length) return res.status(404).json({ error: 'Level not found' });

  // Mark hint as used
  await pool.query(
    `INSERT INTO user_level_progress (user_id, level_id, used_hint)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (user_id, level_id) DO UPDATE SET used_hint = TRUE`,
    [userId, levelId]
  );

  await pool.query(
    `INSERT INTO audit_log (user_id, level_id, event_type, ip_address, payload)
     VALUES ($1, $2, 'hint_granted', $3, $4)`,
    [userId, levelId, req.ip, JSON.stringify({})]
  );

  res.json({ hint: rows[0].hint_text });
});

export default router;

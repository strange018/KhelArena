import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, execute } from '../db/index.js';
import { generateToken, authenticateToken, AuthenticatedRequest, logAudit } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['PLAYER', 'VENUE_OWNER']).default('PLAYER'),
  city_id: z.string().optional()
});

const loginSchema = z.object({
  identifier: z.string().min(3), // phone or email
  password: z.string().min(1)
});

// Register
router.post('/register', async (req, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Check if phone or email exists
    const existing = await queryOne('SELECT id FROM users WHERE phone = ? OR email = ?', [data.phone, data.email]);
    if (existing) {
      res.status(400).json({ error: 'USER_EXISTS', message: 'User with this phone or email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    await execute(
      `INSERT INTO users (id, name, phone, email, password_hash, role, status, city_id) 
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [userId, data.name, data.phone, data.email, passwordHash, data.role, data.city_id || 'city_patna']
    );

    const newUser = {
      id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role as any,
      status: 'ACTIVE' as const,
      city_id: data.city_id || 'city_patna'
    };

    const token = generateToken(newUser);
    await logAudit(userId, data.role, 'USER_REGISTER', 'USER', userId, { email: data.email }, req.ip);

    res.json({ token, user: newUser });
  } catch (err: any) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: err.message || 'Invalid input' });
  }
});

// Login
router.post('/login', async (req, res: Response): Promise<void> => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    const user = await queryOne(
      'SELECT id, name, email, phone, password_hash, role, status, city_id FROM users WHERE email = ? OR phone = ?',
      [identifier, identifier]
    );

    if (!user) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended or blocked' });
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
      return;
    }

    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      city_id: user.city_id
    };

    const token = generateToken(authUser);
    await logAudit(user.id, user.role, 'USER_LOGIN', 'USER', user.id, {}, req.ip);

    res.json({ token, user: authUser });
  } catch (err: any) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: err.message || 'Invalid request' });
  }
});

// Current User Profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) return;
  const user = await queryOne('SELECT id, name, email, phone, role, status, reliability_score, avatar_url, city_id FROM users WHERE id = ?', [req.user.id]);
  res.json({ user });
});

// Demo Quick Login Switcher for Testing/Role Previews
router.post('/demo-login', async (req, res: Response): Promise<void> => {
  const { role } = req.body;
  let targetUser: any = null;

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    targetUser = await queryOne("SELECT * FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1");
  } else if (role === 'VENUE_OWNER') {
    targetUser = await queryOne("SELECT * FROM users WHERE role = 'VENUE_OWNER' LIMIT 1");
  } else {
    targetUser = await queryOne("SELECT * FROM users WHERE role = 'PLAYER' LIMIT 1");
  }

  if (!targetUser) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Demo user not found' });
    return;
  }

  const authUser = {
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    phone: targetUser.phone,
    role: targetUser.role,
    status: targetUser.status,
    city_id: targetUser.city_id
  };

  const token = generateToken(authUser);
  res.json({ token, user: authUser });
});

export default router;

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne, execute } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'khelarena-patna-prod-secret-key-2026';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'PLAYER' | 'VENUE_OWNER' | 'VENUE_MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  city_id?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Check if user is active in DB
    const dbUser = await queryOne('SELECT id, name, email, phone, role, status FROM users WHERE id = ?', [decoded.id]);
    if (!dbUser || dbUser.status !== 'ACTIVE') {
      res.status(403).json({ error: 'FORBIDDEN', message: 'User account suspended or inactive' });
      return;
    }

    req.user = dbUser as AuthUser;
    next();
  } catch (err) {
    res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired session token' });
    return;
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'FORBIDDEN', 
        message: `Insufficient privileges. Role ${req.user.role} cannot perform this action.` 
      });
      return;
    }

    next();
  };
}

export function requirePermission(permissionCode: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      return;
    }

    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    const perm = await queryOne(
      'SELECT permission_code FROM role_permissions WHERE role = ? AND permission_code = ?',
      [req.user.role, permissionCode]
    );

    if (!perm) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Missing required permission: ${permissionCode}`
      });
      return;
    }

    next();
  };
}

export async function checkVenueOwnership(userId: string, userRole: string, venueId: string): Promise<boolean> {
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
  const venue = await queryOne('SELECT owner_id FROM venues WHERE id = ?', [venueId]);
  return !!(venue && venue.owner_id === userId);
}

export async function logAudit(
  actorId: string | null,
  actorRole: string | null,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: any,
  ipAddress?: string
) {
  try {
    const id = 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await execute(
      `INSERT INTO audit_logs (id, actor_id, actor_role, action, resource, resource_id, metadata, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        actorId || 'SYSTEM',
        actorRole || 'SYSTEM',
        action,
        resource,
        resourceId || null,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress || '127.0.0.1'
      ]
    );
  } catch (err) {
    console.error('Audit log failure:', err);
  }
}

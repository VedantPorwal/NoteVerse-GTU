import type { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';

export type AuthUser = { id: number; role: Role };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signToken(userId: number, role: Role): string {
  const signOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId, role }, getSecret(), signOptions);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: { message: 'Authentication required' } });
    return;
  }
  try {
    const decoded = jwt.verify(token, getSecret());
    if (typeof decoded === 'string' || decoded === null || typeof decoded !== 'object') {
      res.status(401).json({ error: { message: 'Invalid token' } });
      return;
    }
    const payload = decoded as JwtPayload & { role?: string };
    const sub = typeof payload.sub === 'string' ? Number(payload.sub) : payload.sub;
    const role = payload.role === Role.ADMIN || payload.role === Role.USER ? payload.role : null;
    if (typeof sub !== 'number' || !Number.isFinite(sub) || !role) {
      res.status(401).json({ error: { message: 'Invalid token' } });
      return;
    }
    req.user = { id: sub, role };
    next();
  } catch {
    res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { message: 'Authentication required' } });
    return;
  }
  if (req.user.role !== Role.ADMIN) {
    res.status(403).json({ error: { message: 'Admin access required' } });
    return;
  }
  next();
}

export function requireAuthThenAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => requireAdmin(req, res, next));
}

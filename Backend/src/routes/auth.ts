import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { registerSchema, loginSchema } from '../validators/schemas.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const hash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        password: hash,
        role: Role.USER,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    const token = signToken(user.id, user.role);
    res.status(201).json({ user, token });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      res.status(409).json({ error: { message: 'Registration failed' } });
      return;
    }
    next(e);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    const ok = user && (await bcrypt.compare(body.password, user.password));
    if (!ok) {
      res.status(401).json({ error: { message: 'Invalid email or password' } });
      return;
    }
    const token = signToken(user.id, user.role);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) {
      res.status(401).json({ error: { message: 'User no longer exists' } });
      return;
    }
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

export default router;

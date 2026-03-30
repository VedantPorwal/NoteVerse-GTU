import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { branchCreateSchema, branchUpdateSchema, idOnlyParamSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    res.json({ branches });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = branchCreateSchema.parse(req.body);
    const branch = await prisma.branch.create({
      data: {
        name: body.name,
        code: body.code?.length ? body.code : null,
      },
    });
    res.status(201).json({ branch });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = idOnlyParamSchema.parse(req.params);
    const body = branchUpdateSchema.parse(req.body);
    if (Object.keys(body).length === 0) {
      res.status(400).json({ error: { message: 'No fields to update' } });
      return;
    }
    const data: { name?: string; code?: string | null } = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code?.length ? body.code : null;
    const branch = await prisma.branch.update({
      where: { id },
      data,
    });
    res.json({ branch });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = idOnlyParamSchema.parse(req.params);
    const count = await prisma.note.count({ where: { branchId: id } });
    if (count > 0) {
      res.status(409).json({
        error: {
          message: 'Cannot delete branch that has notes',
          dependentNoteCount: count,
        },
      });
      return;
    }
    await prisma.branch.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;

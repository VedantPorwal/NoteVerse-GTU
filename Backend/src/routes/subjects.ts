import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { subjectCreateSchema, subjectUpdateSchema, idOnlyParamSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    res.json({ subjects });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = subjectCreateSchema.parse(req.body);
    const subject = await prisma.subject.create({
      data: {
        name: body.name,
        code: body.code?.length ? body.code : null,
      },
    });
    res.status(201).json({ subject });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = idOnlyParamSchema.parse(req.params);
    const body = subjectUpdateSchema.parse(req.body);
    if (Object.keys(body).length === 0) {
      res.status(400).json({ error: { message: 'No fields to update' } });
      return;
    }
    const data: { name?: string; code?: string | null } = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code?.length ? body.code : null;
    const subject = await prisma.subject.update({
      where: { id },
      data,
    });
    res.json({ subject });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = idOnlyParamSchema.parse(req.params);
    const count = await prisma.note.count({ where: { subjectId: id } });
    if (count > 0) {
      res.status(409).json({
        error: {
          message: 'Cannot delete subject that has notes',
          dependentNoteCount: count,
        },
      });
      return;
    }
    await prisma.subject.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;

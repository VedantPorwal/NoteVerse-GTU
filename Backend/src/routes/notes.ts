import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  noteListQuerySchema,
  noteIdParamSchema,
  noteCreateFieldsSchema,
  noteUpdateFieldsSchema,
} from '../validators/schemas.js';
import { ALLOWED_MIME_TYPES, MAX_FILE_BYTES } from '../constants.js';

const router = Router();

const noteSelectPublic = {
  id: true,
  title: true,
  description: true,
  fileName: true,
  fileType: true,
  semester: true,
  createdAt: true,
  updatedAt: true,
  subject: { select: { id: true, name: true, code: true } },
  branch: { select: { id: true, name: true, code: true } },
  uploadedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.NoteSelect;

function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/[^\w.\- ()\[\]]+/g, '_');
  return base.slice(0, 255) || 'file';
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('FILE_TYPE_NOT_ALLOWED'));
    }
  },
});

function requireMultipart(req: Request, res: Response, next: NextFunction) {
  if (!req.is('multipart/form-data')) {
    res.status(415).json({ error: { message: 'Content-Type must be multipart/form-data' } });
    return;
  }
  next();
}

router.get('/', async (req, res, next) => {
  try {
    const parsed = noteListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Invalid query parameters', details: parsed.error.flatten() } });
      return;
    }
    const { subjectId, branchId, semester, page, limit, q, sort } = parsed.data;

    const where: Prisma.NoteWhereInput = {};
    if (subjectId !== undefined) where.subjectId = subjectId;
    if (branchId !== undefined) where.branchId = branchId;
    if (semester !== undefined) where.semester = semester;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.NoteOrderByWithRelationInput =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'title'
          ? { title: 'asc' }
          : { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [total, notes] = await Promise.all([
      prisma.note.count({ where }),
      prisma.note.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: noteSelectPublic,
      }),
    ]);

    res.json({
      notes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = noteIdParamSchema.parse(req.params);
    const note = await prisma.note.findUnique({
      where: { id },
      select: { fileName: true, fileType: true, fileData: true },
    });
    if (!note) {
      res.status(404).json({ error: { message: 'Note not found' } });
      return;
    }
    const filename = encodeURIComponent(sanitizeFileName(note.fileName));
    res.setHeader('Content-Type', note.fileType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send(Buffer.from(note.fileData));
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = noteIdParamSchema.parse(req.params);
    const note = await prisma.note.findUnique({
      where: { id },
      select: noteSelectPublic,
    });
    if (!note) {
      res.status(404).json({ error: { message: 'Note not found' } });
      return;
    }
    res.json({ note });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/',
  requireAuth,
  requireAdmin,
  requireMultipart,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file?.buffer?.length) {
        res.status(400).json({ error: { message: 'File is required' } });
        return;
      }
      const fields = noteCreateFieldsSchema.safeParse(req.body);
      if (!fields.success) {
        res.status(400).json({ error: { message: 'Invalid fields', details: fields.error.flatten() } });
        return;
      }
      const body = fields.data;

      const [subject, branch] = await Promise.all([
        prisma.subject.findUnique({ where: { id: body.subjectId } }),
        prisma.branch.findUnique({ where: { id: body.branchId } }),
      ]);
      if (!subject || !branch) {
        res.status(404).json({ error: { message: 'Subject or branch not found' } });
        return;
      }

      const note = await prisma.note.create({
        data: {
          title: body.title,
          description: body.description?.length ? body.description : null,
          fileName: sanitizeFileName(req.file.originalname),
          fileType: req.file.mimetype,
          fileData: req.file.buffer,
          semester: body.semester,
          subjectId: body.subjectId,
          branchId: body.branchId,
          uploadedById: req.user!.id,
        },
        select: noteSelectPublic,
      });
      res.status(201).json({ note });
    } catch (e) {
      next(e);
    }
  },
);

router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  requireMultipart,
  upload.single('file'),
  async (req, res, next) => {
    try {
      const { id } = noteIdParamSchema.parse(req.params);
      const fields = noteUpdateFieldsSchema.safeParse(req.body);
      if (!fields.success) {
        res.status(400).json({ error: { message: 'Invalid fields', details: fields.error.flatten() } });
        return;
      }
      const body = fields.data;
      const hasFile = Boolean(req.file?.buffer?.length);
      if (Object.keys(body).length === 0 && !hasFile) {
        res.status(400).json({ error: { message: 'No fields or file to update' } });
        return;
      }

      const existing = await prisma.note.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: { message: 'Note not found' } });
        return;
      }

      if (body.subjectId !== undefined || body.branchId !== undefined) {
        const sid = body.subjectId ?? existing.subjectId;
        const bid = body.branchId ?? existing.branchId;
        const [subject, branch] = await Promise.all([
          prisma.subject.findUnique({ where: { id: sid } }),
          prisma.branch.findUnique({ where: { id: bid } }),
        ]);
        if (!subject || !branch) {
          res.status(404).json({ error: { message: 'Subject or branch not found' } });
          return;
        }
      }

      const data: Prisma.NoteUpdateInput = {};
      if (body.title !== undefined) data.title = body.title;
      if (body.description !== undefined) data.description = body.description?.length ? body.description : null;
      if (body.semester !== undefined) data.semester = body.semester;
      if (body.subjectId !== undefined) data.subject = { connect: { id: body.subjectId } };
      if (body.branchId !== undefined) data.branch = { connect: { id: body.branchId } };
      if (hasFile && req.file) {
        data.fileName = sanitizeFileName(req.file.originalname);
        data.fileType = req.file.mimetype;
        data.fileData = req.file.buffer;
      }

      const note = await prisma.note.update({
        where: { id },
        data,
        select: noteSelectPublic,
      });
      res.json({ note });
    } catch (e) {
      next(e);
    }
  },
);

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = noteIdParamSchema.parse(req.params);
    await prisma.note.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;

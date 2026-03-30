import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import multer from 'multer';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof Error && err.message === 'FILE_TYPE_NOT_ALLOWED') {
    res.status(400).json({
      error: { message: 'File type not allowed. Allowed: PDF, DOC, DOCX, MP4.' },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: { message: 'File too large' } });
      return;
    }
    res.status(400).json({ error: { message: err.message } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { message: 'A record with this value already exists' } });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { message: 'Record not found' } });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({ error: { message: 'Invalid reference' } });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
}

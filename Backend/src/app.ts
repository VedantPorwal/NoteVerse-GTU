import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import subjectsRoutes from './routes/subjects.js';
import branchesRoutes from './routes/branches.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/branches', branchesRoutes);

app.use(errorHandler);

export default app;

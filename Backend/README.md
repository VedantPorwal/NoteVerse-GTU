# NoteVerse-GTU notes API

Express + Prisma + PostgreSQL. Note files are stored in the database (`BYTEA`), not external object storage.

## Roles

- **Anyone**: list/filter notes, get note metadata, download files, list subjects/branches.
- **Admin** (`role: ADMIN`): create/update/delete notes, subjects, branches. Upload uses `multipart/form-data`.

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `JWT_SECRET`, and optional `SEED_*` vars.
2. `npm install`
3. `npx prisma migrate deploy` (or `npx prisma migrate dev` during development)
4. `npm run db:seed` (optional admin + sample rows)
5. `npm run dev`

Server defaults to `http://localhost:4000`. Set `CORS_ORIGIN` to your Vite dev URL (e.g. `http://localhost:3000`).

## Main endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |
| GET | `/api/auth/me` | Bearer |
| GET | `/api/notes` | No (`subjectId`, `branchId`, `semester`, `page`, `limit`, `q`, `sort`) |
| GET | `/api/notes/:id` | No |
| GET | `/api/notes/:id/download` | No |
| POST | `/api/notes` | Admin, `multipart/form-data` |
| PUT | `/api/notes/:id` | Admin, `multipart/form-data` (file optional) |
| DELETE | `/api/notes/:id` | Admin |
| GET/POST | `/api/subjects` | POST: Admin |
| PUT/DELETE | `/api/subjects/:id` | Admin |
| GET/POST | `/api/branches` | POST: Admin |
| PUT/DELETE | `/api/branches/:id` | Admin |

Send `Authorization: Bearer <token>` for protected routes.

## Upload fields (create note)

`file` (required), `title`, `description` (optional), `subjectId`, `branchId`, `semester` (1–8). Allowed MIME types: PDF, DOC, DOCX, MP4. Max size 50 MB.

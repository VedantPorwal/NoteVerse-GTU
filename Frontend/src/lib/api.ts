import { getToken } from './authStorage';

/** In dev uses Vite proxy (empty string). In production falls back to API on Render. */
export const API_ROOT =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://noteverse-gtu-api.onrender.com';

type ApiErrorBody = { error?: { message?: string } };

export class ApiError extends(Error) {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_ROOT}${path}`;
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data
        ? (data as ApiErrorBody).error?.message ?? res.statusText
        : res.statusText;
    throw new ApiError(msg || 'Request failed', res.status, data);
  }

  return data as T;
}

// ─── Shapes matching backend ───────────────────────────────────────────────

export type ApiSubject = { id: number; name: string; code: string | null };
export type ApiBranch = { id: number; name: string; code: string | null };
export type ApiNoteUploadedBy = { id: number; name: string; email: string };

export type ApiNote = {
  id: number;
  title: string;
  description: string | null;
  fileName: string;
  fileType: string;
  semester: number;
  createdAt: string;
  updatedAt: string;
  subject: ApiSubject;
  branch: ApiBranch;
  uploadedBy: ApiNoteUploadedBy;
};

export type NotesListResponse = {
  notes: ApiNote[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function fetchAllNotes(): Promise<ApiNote[]> {
  const out: ApiNote[] = [];
  let page = 1;
  const limit = 100;
  for (;;) {
    const q = new URLSearchParams({ page: String(page), limit: String(limit), sort: 'newest' });
    const res = await fetchJson<NotesListResponse>(`/api/notes?${q}`);
    out.push(...res.notes);
    if (page >= res.pagination.totalPages) break;
    page += 1;
  }
  return out;
}

export async function fetchAllNotesFiltered(params: {
  semester?: number;
  branchId?: number;
  subjectId?: number;
}): Promise<ApiNote[]> {
  const out: ApiNote[] = [];
  let page = 1;
  const limit = 100;
  for (;;) {
    const res = await fetchNotesPage({ page, limit, sort: 'newest', ...params });
    out.push(...res.notes);
    if (page >= res.pagination.totalPages) break;
    page += 1;
  }
  return out;
}

export async function fetchNotesPage(params: {
  page: number;
  limit?: number;
  q?: string;
  sort?: 'newest' | 'oldest' | 'title' | 'name' | 'relevance';
  subjectId?: number;
  branchId?: number;
  semester?: number;
}): Promise<NotesListResponse> {
  const limit = params.limit ?? 12;
  const q = new URLSearchParams({
    page: String(params.page),
    limit: String(limit),
  });
  if (params.q?.trim()) q.set('q', params.q.trim());
  if (params.subjectId !== undefined) q.set('subjectId', String(params.subjectId));
  if (params.branchId !== undefined) q.set('branchId', String(params.branchId));
  if (params.semester !== undefined) q.set('semester', String(params.semester));

  let sortParam: 'newest' | 'oldest' | 'title' | undefined;
  if (params.sort === 'oldest') sortParam = 'oldest';
  else if (params.sort === 'name' || params.sort === 'title') sortParam = 'title';
  else if (params.sort === 'newest') sortParam = 'newest';
  if (sortParam) q.set('sort', sortParam);

  return fetchJson<NotesListResponse>(`/api/notes?${q}`);
}

export function noteDownloadUrl(noteId: number): string {
  const path = `/api/notes/${noteId}/download`;
  return path.startsWith('http') ? path : `${API_ROOT}${path}`;
}

/** Download a note file with correct filename and format using fetch + blob */
export async function downloadNote(noteId: number): Promise<void> {
  const url = noteDownloadUrl(noteId);
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new ApiError('Download failed', res.status, null);

  const blob = await res.blob();

  // Extract filename from Content-Disposition header
  const disposition = res.headers.get('Content-Disposition') || '';
  let filename = 'download';
  const utf8Match = disposition.match(/filename\*=UTF-8''(.+)/i);
  const plainMatch = disposition.match(/filename="?([^";\n]+)"?/i);
  if (utf8Match) filename = decodeURIComponent(utf8Match[1]);
  else if (plainMatch) filename = plainMatch[1];

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 100);
}

export async function loginRequest(email: string, password: string) {
  return fetchJson<{ user: StoredUserShape; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerRequest(name: string, email: string, password: string) {
  return fetchJson<{ user: StoredUserShape; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

type StoredUserShape = {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
};

export async function fetchSubjects(): Promise<ApiSubject[]> {
  const r = await fetchJson<{ subjects: ApiSubject[] }>('/api/subjects');
  return r.subjects;
}

export async function fetchBranches(): Promise<ApiBranch[]> {
  const r = await fetchJson<{ branches: ApiBranch[] }>('/api/branches');
  return r.branches;
}

export async function createBranch(name: string, code: string | null) {
  return fetchJson<{ branch: ApiBranch }>('/api/branches', {
    method: 'POST',
    body: JSON.stringify({ name, code: code || null }),
  });
}

export async function deleteBranch(id: number) {
  return fetchJson<null>(`/api/branches/${id}`, { method: 'DELETE' });
}

export async function createNoteUpload(body: FormData) {
  return fetchJson<{ note: ApiNote }>('/api/notes', {
    method: 'POST',
    body,
  });
}

export async function deleteNote(id: number) {
  return fetchJson<null>(`/api/notes/${id}`, { method: 'DELETE' });
}

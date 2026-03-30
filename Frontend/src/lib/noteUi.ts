import type { ElementType } from 'react';
import { BookOpen, Calendar, Database, FileCode, FileText, Network, Video } from 'lucide-react';
import type { ApiNote } from './api';

export function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function rawDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function mimeToFormat(fileType: string): string {
  const t = fileType.toLowerCase();
  if (t.includes('pdf')) return 'PDF';
  if (t.includes('video') || t === 'video/mp4') return 'Video';
  if (t.includes('word') || t.includes('msword') || t.includes('officedocument')) return 'DOCX';
  return 'FILE';
}

export function formatMetaLine(api: ApiNote): string {
  const fmt = mimeToFormat(api.fileType);
  return `${fmt} • ${api.fileName}`;
}

export function iconForFormat(format: string): ElementType {
  if (format === 'Video') return Video;
  if (format === 'DOCX') return FileCode;
  if (format === 'PDF') return FileText;
  return FileText;
}

export function iconColorForFormat(format: string): string {
  if (format === 'Video') return 'text-orange-600 bg-orange-50';
  if (format === 'DOCX') return 'text-slate-600 bg-slate-50';
  if (format === 'PDF') return 'text-blue-600 bg-blue-50';
  return 'text-primary bg-primary/10';
}

export function exploreIconBg(format: string): string {
  if (format === 'Video') return 'bg-orange-50';
  if (format === 'DOCX') return 'bg-slate-50';
  if (format === 'PDF') return 'bg-blue-50';
  return 'bg-indigo-50';
}

export function exploreTypeColor(format: string): string {
  if (format === 'Video') return 'bg-orange-100 text-orange-700';
  if (format === 'DOCX') return 'bg-slate-100 text-slate-700';
  if (format === 'PDF') return 'bg-blue-100 text-blue-700';
  return 'bg-indigo-100 text-indigo-700';
}

/** Card icon variety (match prior mock feel) */
export function exploreDecorIcon(index: number): ElementType {
  const icons = [BookOpen, Network, Database, Calendar];
  return icons[index % icons.length];
}

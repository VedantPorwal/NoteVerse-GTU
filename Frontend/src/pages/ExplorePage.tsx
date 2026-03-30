import { useState, useRef, useEffect, useMemo } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Sliders,
  LayoutGrid,
  LayoutList,
  Download,
  PlayCircle,
  Star,
  Network,
  Calendar,
  Database,
  BookOpen,
  ChevronDown,
  X,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { fetchNotesPage, downloadNote, type ApiNote } from '../lib/api';
import {
  exploreDecorIcon,
  exploreIconBg,
  exploreTypeColor,
  mimeToFormat,
  rawDateOnly,
} from '../lib/noteUi';

interface NoteItem {
  id: number;
  title: string;
  meta: string;
  subject: string;
  type: string;
  format: string;
  typeColor: string;
  icon: React.ElementType;
  iconBg: string;
  rating: string | null;
  size: string | null;
  date: string;
}

function toExploreItem(n: ApiNote, decorIndex: number): NoteItem {
  const format = mimeToFormat(n.fileType);
  return {
    id: n.id,
    title: n.title,
    meta: `Sem ${n.semester}`,
    subject: n.subject.name,
    type: n.branch.name,
    format,
    typeColor: exploreTypeColor(format),
    icon: exploreDecorIcon(decorIndex),
    iconBg: exploreIconBg(format),
    rating: null,
    size: n.description?.slice(0, 48) ? `${n.description!.slice(0, 48)}${n.description!.length > 48 ? '…' : ''}` : null,
    date: rawDateOnly(n.createdAt),
  };
}

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Name A→Z', value: 'name' },
];

const NoteCardGrid: React.FC<{ note: NoteItem; onAction: () => void }> = ({ note, onAction }) => (
  <motion.div
    whileHover={{ y: -8 }}
    className="group bg-white rounded-xl p-6 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(53,37,205,0.06)] relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-4">
      <span className={`px-2 py-1 rounded ${note.typeColor} text-[10px] font-bold uppercase tracking-tighter`}>{note.format}</span>
    </div>

    <div className="mb-4">
      <div className={`w-12 h-12 ${note.iconBg} rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform`}>
        <note.icon size={24} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1 leading-snug">{note.title}</h3>
      <p className="text-xs text-slate-400 font-medium">{note.subject} • {note.meta}</p>
    </div>

    <div className="flex items-center gap-3 mb-6">
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full">
        <Network size={12} className="text-primary" />
        <span className="text-[10px] font-bold text-slate-500">{note.type}</span>
      </div>
    </div>

    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
      {note.rating ? (
        <div className="flex items-center gap-1">
          <Star size={14} className="text-amber-500 fill-amber-500" />
          <span className="text-[10px] font-bold text-slate-900">{note.rating}</span>
        </div>
      ) : (
        <div className="text-[10px] text-slate-400 italic">{note.size}</div>
      )}
      <button
        type="button"
        onClick={onAction}
        className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all"
      >
        {note.format === 'Video' ? <PlayCircle size={14} /> : <Download size={14} />}
        {note.format === 'Video' ? 'Stream' : 'Download'}
      </button>
    </div>
  </motion.div>
);

const NoteCardList: React.FC<{ note: NoteItem; onAction: () => void }> = ({ note, onAction }) => (
  <motion.div
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    className="group bg-white rounded-xl px-6 py-4 flex items-center gap-5 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(53,37,205,0.06)]"
  >
    <div className={`w-11 h-11 shrink-0 ${note.iconBg} rounded-xl flex items-center justify-center text-primary`}>
      <note.icon size={22} />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-bold text-slate-900 truncate">{note.title}</h3>
      <p className="text-xs text-slate-400 font-medium mt-0.5">{note.subject} • {note.meta}</p>
    </div>
    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full shrink-0">
      <Network size={11} className="text-primary" />
      <span className="text-[10px] font-bold text-slate-500">{note.type}</span>
    </div>
    <span className={`hidden sm:block px-2 py-1 rounded ${note.typeColor} text-[10px] font-bold uppercase tracking-tighter shrink-0`}>{note.format}</span>
    {note.rating && (
      <div className="hidden md:flex items-center gap-1 shrink-0">
        <Star size={13} className="text-amber-500 fill-amber-500" />
        <span className="text-[10px] font-bold text-slate-700">{note.rating}</span>
      </div>
    )}
    <button
      type="button"
      onClick={onAction}
      className="shrink-0 flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all"
    >
      {note.format === 'Video' ? <PlayCircle size={14} /> : <Download size={14} />}
      {note.format === 'Video' ? 'Stream' : 'Download'}
    </button>
  </motion.div>
);

function useDebounced<T>(value: T, ms: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return d;
}

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const branchIdParam = searchParams.get('branchId');
  const semesterParam = searchParams.get('semester');
  const urlBranchId = branchIdParam ? Number(branchIdParam) : undefined;
  const urlSemester = semesterParam ? Number(semesterParam) : undefined;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 320);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortValue, setSortValue] = useState('relevance');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<NoteItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const apiSort = sortValue as 'relevance' | 'newest' | 'oldest' | 'name' | 'title';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchNotesPage({
          page: 1,
          limit: 12,
          q: debouncedSearch.trim() || undefined,
          sort: apiSort,
          branchId: urlBranchId,
          semester: urlSemester,
        });
        if (cancelled) return;
        setItems(res.notes.map((n, i) => toExploreItem(n, i)));
        setPage(1);
        setTotalPages(Math.max(1, res.pagination.totalPages));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, sortValue, urlBranchId, urlSemester]);

  const sortedNotes = useMemo(() => {
    let list = [...items];
    const q = search.toLowerCase();
    if (search.trim()) {
      list = list.filter(
        n =>
          n.title.toLowerCase().includes(q) ||
          n.subject.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q),
      );
    }
    if (sortValue === 'newest') list.sort((a, b) => b.date.localeCompare(a.date));
    else if (sortValue === 'oldest') list.sort((a, b) => a.date.localeCompare(b.date));
    else if (sortValue === 'name') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [items, search, sortValue]);

  const loadMore = async () => {
    if (page >= totalPages || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetchNotesPage({
        page: next,
        limit: 12,
        q: debouncedSearch.trim() || undefined,
        sort: apiSort,
        branchId: urlBranchId,
        semester: urlSemester,
      });
      setItems(prev => [...prev, ...res.notes.map((n, i) => toExploreItem(n, prev.length + i))]);
      setPage(next);
      setTotalPages(Math.max(1, res.pagination.totalPages));
    } finally {
      setLoadingMore(false);
    }
  };

  const openNote = (id: number) => {
    downloadNote(id).catch(() => window.alert('Download failed.'));
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortValue)?.label ?? 'Relevance';

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-10">
        <header className="mb-8 sm:mb-12 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Autumn Semester 2024 Updated
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-3 sm:mb-4 leading-tight">
            Your Curated <span className="text-primary italic">Academic</span> Knowledge Base.
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-slate-500 max-w-2xl leading-relaxed">
            Access premium peer-reviewed notes, research summaries, and lecture archives organized by your faculty branch.
          </p>
        </header>

        <div className="relative mb-8 max-w-2xl">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-12 py-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none shadow-sm transition-all"
            placeholder="Search by title, subject, or branch..."
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-slate-100">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setSortOpen(o => !o)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm hover:bg-slate-50 transition-all ring-1 ring-slate-200"
              >
                <Sliders size={16} />
                <span className="hidden sm:inline">Sort by:</span> {currentSortLabel}
                <ChevronDown size={14} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute left-0 top-12 bg-white rounded-xl shadow-xl border border-slate-100 py-2 min-w-[180px] z-20"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSortValue(opt.value);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${sortValue === opt.value ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-1 bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid size={16} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutList size={16} />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-slate-400">
            Showing <span className="font-bold text-slate-900">{sortedNotes.length}</span>{' '}
            {search ? 'results' : 'resources'}{search && <span> for "<span className="text-primary">{search}</span>"</span>}
          </div>
        </div>

        {loading ? (
          <p className="py-24 text-center text-slate-400 font-medium">Loading resources…</p>
        ) : sortedNotes.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {sortedNotes.map(note => (
                <NoteCardGrid key={note.id} note={note} onAction={() => openNote(note.id)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedNotes.map(note => (
                <NoteCardList key={note.id} note={note} onAction={() => openNote(note.id)} />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Search size={40} className="mb-4 opacity-40" />
            <p className="text-lg font-semibold">No results found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}

        {!loading && sortedNotes.length > 0 && (
          <div className="mt-20 flex flex-col items-center gap-6">
            {page < totalPages && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="px-10 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load More Resources'}
              </button>
            )}
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              End of Library • Page {page} of {totalPages}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

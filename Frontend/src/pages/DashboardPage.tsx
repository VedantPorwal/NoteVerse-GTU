import { useState, useRef, useEffect, useMemo, Fragment, type ElementType, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Upload,
  FileText,
  BookOpen,
  Network,
  Search,
  ArrowUpDown,
  FileCode,
  Video,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  fetchAllNotes,
  createNoteUpload,
  deleteNote,
  fetchSubjects,
  fetchBranches,
  type ApiNote,
  type ApiSubject,
  type ApiBranch,
  ApiError,
} from '../lib/api';
import { isAdmin } from '../lib/authStorage';
import {
  formatDisplayDate,
  rawDateOnly,
  initialsFromName,
  mimeToFormat,
  formatMetaLine,
  iconColorForFormat,
} from '../lib/noteUi';

type DashboardRow = {
  id: number;
  name: string;
  meta: string;
  subject: string;
  uploader: string;
  uploaderInitials: string;
  date: string;
  rawDate: string;
  icon: ElementType;
  iconColor: string;
};

function mapNoteToRow(n: ApiNote): DashboardRow {
  const format = mimeToFormat(n.fileType);
  const icon = format === 'Video' ? Video : format === 'DOCX' ? FileCode : FileText;
  return {
    id: n.id,
    name: n.title,
    meta: formatMetaLine(n),
    subject: n.subject.name,
    uploader: n.uploadedBy.name,
    uploaderInitials: initialsFromName(n.uploadedBy.name),
    date: formatDisplayDate(n.createdAt),
    rawDate: rawDateOnly(n.createdAt),
    icon,
    iconColor: iconColorForFormat(format),
  };
}

const StatCard = ({ icon: Icon, label, value, colorClass, bgColorClass }: any) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="p-4 sm:p-6 bg-white rounded-xl shadow-[0_12px_40px_rgba(53,37,205,0.06)] transition-all duration-300"
  >
    <div className="flex items-center justify-between mb-3 sm:mb-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColorClass} rounded-xl flex items-center justify-center ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</h3>
    <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
  </motion.div>
);

const TableRow = ({ note, onDelete }: { note: DashboardRow; onDelete: (id: number) => void | Promise<void> }) => (
  <tr className="hover:bg-slate-50/50 transition-colors group">
    <td className="py-5 px-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${note.iconColor}`}>
          <note.icon size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{note.name}</p>
          <p className="text-[11px] text-slate-400 font-medium">{note.meta}</p>
        </div>
      </div>
    </td>
    <td className="py-5 px-4 hidden sm:table-cell">
      <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider">{note.subject}</span>
    </td>
    <td className="py-5 px-4 hidden md:table-cell">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{note.uploaderInitials}</div>
        <span className="text-sm font-medium text-slate-700">{note.uploader}</span>
      </div>
    </td>
    <td className="py-5 px-4 text-sm text-slate-500 hidden lg:table-cell">{note.date}</td>
    <td className="py-5 px-4 text-right">
      <button type="button" onClick={() => onDelete(note.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors">
        <Trash2 size={18} />
      </button>
    </td>
  </tr>
);

const UploadModal = ({
  onClose,
  subjects,
  branches,
  onUploaded,
}: {
  onClose: () => void;
  subjects: ApiSubject[];
  branches: ApiBranch[];
  onUploaded: () => void;
}) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    subjectId: '',
    branchId: '',
    semester: '',
    file: null as File | null,
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.file) {
      setError('File is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      if (form.description.trim()) fd.append('description', form.description.trim());
      fd.append('subjectId', form.subjectId);
      fd.append('branchId', form.branchId);
      fd.append('semester', form.semester);
      fd.append('file', form.file);
      await createNoteUpload(fd);
      setSuccess(true);
      onUploaded();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Upload Note</h2>
            <p className="text-sm text-slate-400 mt-0.5">Add a new resource to the library</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <Check size={32} className="text-green-500" />
            </div>
            <p className="text-lg font-bold text-slate-900">Note uploaded successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 sm:px-8 py-5 sm:py-6 space-y-5">
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder:text-slate-400/60 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all"
                  placeholder="e.g. Advanced Linear Algebra Notes"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder:text-slate-400/60 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all resize-none"
                  placeholder="Brief description (optional)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Branch *</label>
                <select
                  required
                  value={form.branchId}
                  onChange={e => setForm(p => ({ ...p, branchId: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all appearance-none"
                >
                  <option value="">Select branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Semester *</label>
                <select
                  required
                  value={form.semester}
                  onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all appearance-none"
                >
                  <option value="">Select semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>
                      Semester {n}
                    </option>
                  ))}
                </select>
              </div>


              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Subject *</label>
                <select
                  required
                  value={form.subjectId}
                  onChange={e => setForm(p => ({ ...p, subjectId: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all appearance-none"
                >
                  <option value="">Select subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>




              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">File *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,.doc,.mp4"
                  onChange={e => setForm(p => ({ ...p, file: e.target.files?.[0] ?? null }))}
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Upload size={16} />
                {submitting ? 'Uploading…' : 'Upload Note'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

const useDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return { open, setOpen, ref };
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [notes, setNotes] = useState<DashboardRow[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      setLoadError('');
      const [noteList, subjectList, branchList] = await Promise.all([fetchAllNotes(), fetchSubjects(), fetchBranches()]);
      setSubjects(subjectList);
      setBranches(branchList);
      setNotes(noteList.map(n => mapNoteToRow(n)));
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Failed to load data.');
    }
  };

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/explore', { replace: true });
      return;
    }
    (async () => {
      setLoading(true);
      await refreshData();
      setLoading(false);
    })();
  }, [navigate]);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Notes' | 'Subjects' | 'Branches'>('Notes');

  const sortDropdown = useDropdown();
  const [sortOption, setSortOption] = useState<string>('Default');
  const SORT_OPTIONS = ['Default', 'Date ↑ (Newest)', 'Date ↓ (Oldest)', 'Name A→Z'];

  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const filtered = useMemo(() => {
    let list = [...notes];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        n =>
          n.name.toLowerCase().includes(q) ||
          n.subject.toLowerCase().includes(q) ||
          n.uploader.toLowerCase().includes(q),
      );
    }
    if (sortOption === 'Date ↑ (Newest)') list.sort((a, b) => b.rawDate.localeCompare(a.rawDate));
    else if (sortOption === 'Date ↓ (Oldest)') list.sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    else if (sortOption === 'Name A→Z') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [notes, search, sortOption]);

  useEffect(() => {
    setPage(1);
  }, [search, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalNotesCount = notes.length;
  const totalSubjectsCount = subjects.length;
  const totalBranchesCount = branches.length;

  const handleExport = () => {
    const data = filtered.map(({ id, name, subject, uploader, date }) => ({
      id,
      name,
      subject,
      uploader,
      date,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'noteverse-gtu-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : 'Delete failed.');
    }
  };

  if (!isAdmin()) return null;

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <header className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium">Global management of academic assets and users.</p>
          </div>
          <div className="flex gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={handleExport}
              className="px-3 sm:px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold text-xs sm:text-sm hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export Data</span>
            </button>
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="px-3 sm:px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Upload Note</span>
            </button>
          </div>
        </header>

        {loadError && (
          <p className="mb-4 text-sm text-red-600 font-medium">{loadError}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <StatCard
            icon={FileText}
            label="Total Notes"
            value={loading ? '…' : totalNotesCount.toLocaleString()}
            colorClass="text-primary"
            bgColorClass="bg-primary/10"
          />
          <StatCard
            icon={BookOpen}
            label="Active Subjects"
            value={loading ? '…' : totalSubjectsCount.toLocaleString()}
            colorClass="text-secondary"
            bgColorClass="bg-secondary/10"
          />
          <StatCard
            icon={Network}
            label="Total Branches"
            value={loading ? '…' : totalBranchesCount.toLocaleString()}
            colorClass="text-orange-600"
            bgColorClass="bg-orange-100"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(53,37,205,0.06)] overflow-hidden">
          <div className="flex overflow-x-auto bg-slate-50/50 px-4 sm:px-8 pt-4 sm:pt-6 gap-1">
            {(['Notes', 'Subjects', 'Branches'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 sm:px-8 py-3 sm:py-4 border-b-2 font-semibold text-xs sm:text-sm tracking-wide transition-all whitespace-nowrap ${activeTab === tab ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-primary'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                  placeholder="Search by title, subject, or uploader..."
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {activeTab === 'Notes' && (
                <div className="flex gap-2">
                  <div className="relative" ref={sortDropdown.ref}>
                    <button
                      type="button"
                      onClick={() => {
                        sortDropdown.setOpen(o => !o);
                      }}
                      className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-sm font-semibold ${sortOption !== 'Default' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      <ArrowUpDown size={18} />
                    </button>
                    <AnimatePresence>
                      {sortDropdown.open && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-slate-100 p-3 min-w-[180px] z-20"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-2">Sort By</p>
                          {SORT_OPTIONS.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setSortOption(opt);
                                sortDropdown.setOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${sortOption === opt ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'Notes' && (
              <>
                <div className="overflow-x-auto">
                  {loading ? (
                    <p className="py-16 text-center text-slate-400 text-sm font-medium">Loading notes…</p>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-bold text-slate-400 border-b border-slate-100 uppercase tracking-widest">
                          <th className="pb-4 px-4">Document Name</th>
                          <th className="pb-4 px-4 hidden sm:table-cell">Subject</th>
                          <th className="pb-4 px-4 hidden md:table-cell">Uploader</th>
                          <th className="pb-4 px-4 hidden lg:table-cell">Date</th>
                          <th className="pb-4 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {pageItems.length > 0 ? (
                          pageItems.map(note => (
                            <Fragment key={note.id}>
                              <TableRow note={note} onDelete={handleDelete} />
                            </Fragment>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-16 text-center text-slate-400 text-sm font-medium">
                              No notes match your search or filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs sm:text-sm text-slate-500">
                    Showing{' '}
                    <span className="font-bold">
                      {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1} – {Math.min(page * PER_PAGE, filtered.length)}
                    </span>{' '}
                    of <span className="font-bold">{filtered.length}</span> notes
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-400 disabled:opacity-40"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                      .map((n, idx, arr) => (
                        <Fragment key={n}>
                          {idx > 0 && arr[idx - 1] !== n - 1 && (
                            <span className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-400 text-sm">…</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setPage(n)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl font-bold text-xs sm:text-sm transition-colors ${page === n ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-500'}`}
                          >
                            {n}
                          </button>
                        </Fragment>
                      ))}
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-400 disabled:opacity-40"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'Subjects' && (
              <div className="overflow-x-auto">
                {loading ? (
                  <p className="py-16 text-center text-slate-400 text-sm font-medium">Loading subjects…</p>
                ) : subjects.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 border-b border-slate-100 uppercase tracking-widest">
                        <th className="pb-4 px-4">ID</th>
                        <th className="pb-4 px-4">Subject Name</th>
                        <th className="pb-4 px-4">Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {subjects.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 text-sm text-slate-500 font-medium">{s.id}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                                <BookOpen size={18} />
                              </div>
                              <span className="text-sm font-bold text-slate-900">{s.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              {s.code || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-16 text-center text-slate-400 text-sm font-medium">No subjects found.</div>
                )}
              </div>
            )}

            {activeTab === 'Branches' && (
              <div className="overflow-x-auto">
                {loading ? (
                  <p className="py-16 text-center text-slate-400 text-sm font-medium">Loading branches…</p>
                ) : branches.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-bold text-slate-400 border-b border-slate-100 uppercase tracking-widest">
                        <th className="pb-4 px-4">ID</th>
                        <th className="pb-4 px-4">Branch Name</th>
                        <th className="pb-4 px-4">Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {branches.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 text-sm text-slate-500 font-medium">{b.id}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                <Network size={18} />
                              </div>
                              <span className="text-sm font-bold text-slate-900">{b.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              {b.code || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-16 text-center text-slate-400 text-sm font-medium">No branches found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            subjects={subjects}
            branches={branches}
            onUploaded={refreshData}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

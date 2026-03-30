import { useState, useEffect, Fragment, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Network, Plus, Trash2, X, Check, BookOpen, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { fetchBranches, fetchAllNotes, createBranch, deleteBranch, ApiError } from '../lib/api';
import { isAdmin } from '../lib/authStorage';

interface Branch {
  id: number;
  name: string;
  code: string;
  noteCount: number;
  subjectCount: number;
  color: string;
  bgColor: string;
}

const STYLE_ROTATION: { color: string; bgColor: string }[] = [
  { color: 'text-primary', bgColor: 'bg-primary/10' },
  { color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { color: 'text-green-600', bgColor: 'bg-green-50' },
  { color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { color: 'text-pink-600', bgColor: 'bg-pink-50' },
  { color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { color: 'text-sky-600', bgColor: 'bg-sky-50' },
];

const AddBranchModal = ({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string, code: string) => Promise<void>;
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      await onAdd(name.trim(), code.trim().toUpperCase());
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add branch.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Add New Branch</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <Check size={28} className="text-green-500" />
            </div>
            <p className="font-bold text-slate-900">Branch added!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Branch Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder:text-slate-400/60 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all"
                placeholder="e.g. Computer Science & Engineering"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Branch Code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                maxLength={8}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder:text-slate-400/60 focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all uppercase"
                placeholder="e.g. CSE"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Plus size={16} />
                {pending ? 'Saving…' : 'Add Branch'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

const BranchCard = ({
  branch,
  onDelete,
  onClick,
  canMutate,
}: {
  branch: Branch;
  onDelete: (id: number) => void | Promise<void>;
  onClick: () => void;
  canMutate: boolean;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    whileHover={{ y: -4 }}
    onClick={onClick}
    className="group bg-white rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(53,37,205,0.06)] transition-all duration-300 relative cursor-pointer"
  >
    {canMutate && (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(branch.id);
        }}
        className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all z-20"
        title="Delete branch"
      >
        <Trash2 size={16} />
      </button>
    )}

    <div className={`w-12 h-12 ${branch.bgColor} rounded-xl flex items-center justify-center ${branch.color} mb-4`}>
      <Network size={24} />
    </div>

    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <h3 className="text-base font-bold text-slate-900 leading-tight">{branch.name}</h3>
      </div>
      {branch.code && (
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${branch.bgColor} ${branch.color}`}>
          {branch.code}
        </span>
      )}
    </div>

    <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-slate-400" />
        <span className="text-xs text-slate-500 font-medium">{branch.noteCount.toLocaleString()} Notes</span>
      </div>
      <div className="flex items-center gap-2">
        <BookOpen size={14} className="text-slate-400" />
        <span className="text-xs text-slate-500 font-medium">{branch.subjectCount} Subjects</span>
      </div>
    </div>
  </motion.div>
);

export default function BranchesPage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const admin = isAdmin();

  const refresh = async () => {
    const [list, allNotes] = await Promise.all([fetchBranches(), fetchAllNotes()]);
    const byBranch: Record<number, { notes: number; subjects: Set<number> }> = {};
    for (const n of allNotes) {
      const bid = n.branch.id;
      const sid = n.subject.id;
      if (!byBranch[bid]) byBranch[bid] = { notes: 0, subjects: new Set() };
      byBranch[bid].notes += 1;
      byBranch[bid].subjects.add(sid);
    }
    setBranches(
      list.map((b, i) => {
        const st = STYLE_ROTATION[i % STYLE_ROTATION.length];
        const agg = byBranch[b.id];
        return {
          id: b.id,
          name: b.name,
          code: b.code ?? '',
          noteCount: agg?.notes ?? 0,
          subjectCount: agg ? agg.subjects.size : 0,
          color: st.color,
          bgColor: st.bgColor,
        };
      }),
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch (e) {
        if (!cancelled) console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = async (name: string, code: string) => {
    await createBranch(name, code || null);
    await refresh();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this branch? Branches with notes cannot be deleted.')) return;
    try {
      await deleteBranch(id);
      setBranches(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : 'Could not delete branch.');
    }
  };

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <header className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Academic Structure</p>
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">Branches</h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium">Browse engineering and science branches. Click a branch to view its semesters.</p>
          </div>
          {admin && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="px-5 sm:px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
            >
              <Plus size={16} />
              Add Branch
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
          <div className="bg-white rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Network size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Branches</p>
              <p className="text-2xl font-bold text-slate-900">{loading ? '…' : branches.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-4">
            <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Notes</p>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '…' : branches.reduce((s, b) => s + b.noteCount, 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Subjects</p>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '…' : branches.reduce((s, b) => s + b.subjectCount, 0)}
              </p>
            </div>
          </div>
        </div>

        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          <AnimatePresence>
            {branches.map(branch => (
              <Fragment key={branch.id}>
                <BranchCard
                  branch={branch}
                  onDelete={handleDelete}
                  onClick={() => navigate(`/semesters?branchId=${branch.id}`)}
                  canMutate={admin}
                />
              </Fragment>
            ))}
          </AnimatePresence>
        </motion.div>

        {branches.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Network size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-semibold">No branches yet</p>
            <p className="text-sm mt-1">Add the first branch to get started</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddBranchModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      </AnimatePresence>
    </Layout>
  );
}

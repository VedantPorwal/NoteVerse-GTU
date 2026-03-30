import { useState, useEffect, Fragment, type ElementType } from 'react';
import { motion } from 'motion/react';
import { Calendar, FileText, BookOpen, Video, FileCode, Download, PlayCircle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { fetchAllNotesFiltered, fetchBranches, downloadNote, type ApiNote, type ApiBranch } from '../lib/api';
import { formatMetaLine, initialsFromName, mimeToFormat, iconColorForFormat } from '../lib/noteUi';

const SEMESTER_META = [
  { sem: 1, label: 'Foundation' },
  { sem: 2, label: 'Foundation' },
  { sem: 3, label: 'Intermediate' },
  { sem: 4, label: 'Intermediate' },
  { sem: 5, label: 'Advanced' },
  { sem: 6, label: 'Advanced' },
  { sem: 7, label: 'Capstone' },
  { sem: 8, label: 'Capstone' },
];

const LABEL_COLORS: Record<string, string> = {
  Foundation: 'bg-blue-50 text-blue-600',
  Intermediate: 'bg-indigo-50 text-indigo-600',
  Advanced: 'bg-violet-50 text-violet-600',
  Capstone: 'bg-orange-50 text-orange-600',
};

type SemCardData = {
  sem: number;
  label: string;
  noteCount: number;
  subjectCount: number;
};

type SemRow = {
  id: number;
  name: string;
  meta: string;
  subject: string;
  uploader: string;
  uploaderInitials: string;
  format: string;
  icon: ElementType;
  iconColor: string;
};

function mapApiToSemRow(n: ApiNote): SemRow {
  const format = mimeToFormat(n.fileType);
  const icon = format === 'Video' ? Video : format === 'DOCX' ? FileCode : FileText;
  return {
    id: n.id,
    name: n.title,
    meta: formatMetaLine(n),
    subject: n.subject.name,
    uploader: n.uploadedBy.name,
    uploaderInitials: initialsFromName(n.uploadedBy.name),
    format,
    icon,
    iconColor: iconColorForFormat(format),
  };
}

const SemCard = ({
  data,
  active,
  onClick,
}: {
  data: SemCardData;
  active: boolean;
  onClick: () => void | Promise<void>;
}) => (
  <motion.button
    type="button"
    whileHover={{ y: -4 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${active ? 'border-primary bg-primary/5 shadow-[0_8px_30px_rgba(53,37,205,0.12)]' : 'border-transparent bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-primary/20'}`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
        <Calendar size={20} />
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${LABEL_COLORS[data.label]}`}>
        {data.label}
      </span>
    </div>
    <p className={`text-lg font-bold mb-0.5 ${active ? 'text-primary' : 'text-slate-900'}`}>Semester {data.sem}</p>
    <div className="flex gap-3 mt-2">
      <div className="flex items-center gap-1.5">
        <FileText size={12} className="text-slate-400" />
        <span className="text-[11px] font-bold text-slate-500">{data.noteCount.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <BookOpen size={12} className="text-slate-400" />
        <span className="text-[11px] font-bold text-slate-500">{data.subjectCount} subjects</span>
      </div>
    </div>
  </motion.button>
);

const NoteRow = ({ note }: { note: SemRow }) => (
  <tr className="hover:bg-slate-50/50 transition-colors group">
    <td className="py-4 px-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${note.iconColor}`}>
          <note.icon size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{note.name}</p>
          <p className="text-[11px] text-slate-400">{note.meta}</p>
        </div>
      </div>
    </td>
    <td className="py-4 px-4 hidden sm:table-cell">
      <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider">{note.subject}</span>
    </td>
    <td className="py-4 px-4 hidden md:table-cell">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{note.uploaderInitials}</div>
        <span className="text-sm font-medium text-slate-700">{note.uploader}</span>
      </div>
    </td>
    <td className="py-4 px-4 text-right">
      <button
        type="button"
        onClick={() => downloadNote(note.id).catch(() => window.alert('Download failed.'))}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all ml-auto"
      >
        {note.format === 'Video' ? <PlayCircle size={13} /> : <Download size={13} />}
        {note.format === 'Video' ? 'Stream' : 'Download'}
      </button>
    </td>
  </tr>
);

export default function SemestersPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const branchIdParam = searchParams.get('branchId');
  const branchId = branchIdParam ? Number(branchIdParam) : undefined;

  const [selected, setSelected] = useState<number>(1);
  const [semData, setSemData] = useState<SemCardData[]>(
    SEMESTER_META.map(m => ({ ...m, noteCount: 0, subjectCount: 0 })),
  );
  const [rows, setRows] = useState<SemRow[]>([]);
  const [loadingSem, setLoadingSem] = useState(false);
  const [branchName, setBranchName] = useState<string>('');

  // Load branch name if branchId is provided
  useEffect(() => {
    if (!branchId) {
      setBranchName('');
      return;
    }
    (async () => {
      try {
        const branches = await fetchBranches();
        const found = branches.find((b: ApiBranch) => b.id === branchId);
        if (found) setBranchName(found.name);
      } catch {
        /* ignore */
      }
    })();
  }, [branchId]);

  // Load semester stats
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stats = await Promise.all(
        [1, 2, 3, 4, 5, 6, 7, 8].map(async sem => {
          const filterParams: { semester: number; branchId?: number } = { semester: sem };
          if (branchId) filterParams.branchId = branchId;
          const notes = await fetchAllNotesFiltered(filterParams);
          const subjectCount = new Set(notes.map(n => n.subject.id)).size;
          return { sem, noteCount: notes.length, subjectCount };
        }),
      );
      if (cancelled) return;
      setSemData(
        SEMESTER_META.map(m => {
          const s = stats.find(x => x.sem === m.sem)!;
          return { ...m, noteCount: s.noteCount, subjectCount: s.subjectCount };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  // Load notes for selected semester
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSem(true);
      const filterParams: { semester: number; branchId?: number } = { semester: selected };
      if (branchId) filterParams.branchId = branchId;
      const notes = await fetchAllNotesFiltered(filterParams);
      if (!cancelled) {
        setRows(notes.map(mapApiToSemRow));
        setLoadingSem(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, branchId]);

  const currentMeta = semData.find(s => s.sem === selected)!;

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <header className="mb-8 sm:mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Academic Structure</p>
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">
            {branchName ? `${branchName} — Semesters` : 'Semesters'}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium">
            {branchName
              ? `Browse notes and resources for ${branchName}, organized by semester.`
              : 'Browse notes and resources organized by semester.'}
          </p>
        </header>

        {/* 2×4 grid on md screens */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          {semData.map(s => (
            <Fragment key={s.sem}>
              <SemCard
                data={s}
                active={selected === s.sem}
                onClick={() => {
                  setSelected(s.sem);
                }}
              />
            </Fragment>
          ))}
        </div>

        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(53,37,205,0.06)] overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Semester {selected} — Resources</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {SEMESTER_META.find(m => m.sem === selected)?.label} level
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${LABEL_COLORS[currentMeta.label]}`}>{currentMeta.label}</div>
              <div className="text-xs text-slate-400 font-medium">
                {loadingSem ? '…' : `${rows.length} resources shown`}
              </div>
            </div>
          </div>

          {loadingSem ? (
            <div className="py-20 text-center text-slate-400 font-medium">Loading…</div>
          ) : rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 border-b border-slate-100 uppercase tracking-widest">
                    <th className="pb-4 pt-5 px-4">Document Name</th>
                    <th className="pb-4 pt-5 px-4 hidden sm:table-cell">Subject</th>
                    <th className="pb-4 pt-5 px-4 hidden md:table-cell">Uploaded By</th>
                    <th className="pb-4 pt-5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(note => (
                    <Fragment key={note.id}>
                      <NoteRow note={note} />
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <FileText size={40} className="mb-4 opacity-30" />
              <p className="font-semibold">No notes yet for Semester {selected}</p>
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}

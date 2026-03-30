import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Network,
  Calendar,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clearAuth, getStoredUser, isAdmin } from '../lib/authStorage';
import { initialsFromName } from '../lib/noteUi';

interface SidebarItemProps {
  icon: any;
  label: string;
  href: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, href, active, onClick }: SidebarItemProps) => (
  <Link
    to={href}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl transition-all duration-200 group ${active
        ? 'bg-primary/10 text-primary font-bold'
        : 'text-slate-500 hover:bg-white hover:translate-x-1'
      }`}
  >
    <Icon size={20} className={active ? 'text-primary' : 'text-slate-400 group-hover:text-primary'} />
    <span className="text-sm tracking-wide">{label}</span>
  </Link>
);

const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => {
  const location = useLocation();
  const admin = isAdmin();

  return (
    <>
      <div className="px-6 mb-8">
        <h2 className="text-slate-400 font-bold text-xs uppercase tracking-widest">Curated Library</h2>
        <p className="text-[10px] text-slate-400/60 uppercase">Academic Directory</p>
      </div>

      <nav className="flex-1 space-y-1">
        {admin && (
          <SidebarItem
            icon={LayoutDashboard}
            label="Dashboard"
            href="/dashboard"
            active={location.pathname === '/dashboard'}
            onClick={onItemClick}
          />
        )}
        <SidebarItem
          icon={Network}
          label="Branches"
          href="/branches"
          active={location.pathname === '/branches'}
          onClick={onItemClick}
        />
        <SidebarItem
          icon={Calendar}
          label="Semesters"
          href="/semesters"
          active={location.pathname === '/semesters'}
          onClick={onItemClick}
        />
        <SidebarItem
          icon={BookOpen}
          label="Subjects"
          href="/explore"
          active={location.pathname === '/explore'}
          onClick={onItemClick}
        />
      </nav>
    </>
  );
};

export const Sidebar = ({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) => {
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 pt-20 bg-slate-50 flex-col border-r border-slate-200/50 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-72 bg-white shadow-2xl z-[70] pt-6 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-6 mb-6">
                <span className="text-lg font-bold bg-linear-to-br from-primary to-primary-container bg-clip-text text-transparent">
                  NoteVerse-GTU
                </span>
                <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <SidebarContent onItemClick={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export const TopNav = ({ onMenuClick }: { onMenuClick: () => void }) => {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
      <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4 w-full max-w-[1440px] mx-auto">
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <Link to="/" className="text-xl sm:text-2xl font-bold bg-linear-to-br from-primary to-primary-container bg-clip-text text-transparent">
            NoteVerse-GTU
          </Link>


        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm font-bold text-primary border-2 border-white shadow-sm">
            {(() => {
              const user = getStoredUser();
              return user ? initialsFromName(user.name) : <User size={18} />;
            })()}
          </div>
          <Link
            to="/login"
            onClick={() => clearAuth()}
            className="text-slate-500 hover:text-primary"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </Link>
        </div>
      </div>
    </nav>
  );
};

export const Layout = ({ children, showSidebar = true }: { children: ReactNode, showSidebar?: boolean }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <TopNav onMenuClick={() => setMobileOpen(o => !o)} />
      {showSidebar && <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />}
      <main className={`${showSidebar ? 'lg:ml-64' : ''} pt-16 sm:pt-20 min-h-screen`}>
        {children}
      </main>
    </div>
  );
};

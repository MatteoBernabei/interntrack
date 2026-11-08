import React from 'react';
import { 
  Search, 
  Bell, 
  Plus, 
  Bookmark, 
  ChevronDown, 
  Sun,
  Moon
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';

export const TopBar: React.FC = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    setIsNewAppModalOpen, 
    setIsBookmarkletModalOpen,
    setIsPostaModalOpen,
    settings,
    updateSettings,
    urgentTasksCount
  } = useInternTrack();

  const isDark = settings?.theme === 'scuro';

  const toggleTheme = () => {
    updateSettings({ theme: isDark ? 'chiaro' : 'scuro' });
  };

  return (
    <header className="w-full px-6 py-3.5 flex items-center justify-between gap-6 border-b border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/50 backdrop-blur-2xl sticky top-0 z-30 select-none">
      
      {/* Brand & AI status badge (matching Stitch mock-up) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00d2ff] via-[#1890ff] to-[#3a86ff] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M4 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm10-2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white uppercase font-sans">
                INTERN TRACK
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#1890ff] text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                PRO
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Gemini 1.5 Pro Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pill Search Input with ⌘K badge */}
      <div className="relative flex-1 max-w-xl hidden md:block">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca azienda, ruolo, tecnologia... ⌘K"
          className="w-full pl-11 pr-14 py-2.5 rounded-full bg-white/70 dark:bg-slate-800/60 hover:bg-white/90 dark:hover:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-white/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#1890ff] shadow-inner backdrop-blur-md transition-all"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold pointer-events-none">
          ⌘K
        </div>
      </div>

      {/* Right Controls: Actions & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Quick Add Application button (Stitch style with Gemini AI) */}
        <button
          onClick={() => setIsNewAppModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#00b4d8] to-[#1890ff] hover:opacity-95 text-white font-bold text-xs shadow-[0_4px_18px_rgba(24,144,255,0.35)] transition-all cursor-pointer transform active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuova Candidatura con Gemini AI</span>
        </button>

        {/* Dark / Light Theme Toggle Switch */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
          className="relative w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 backdrop-blur-md flex items-center justify-center text-slate-600 dark:text-amber-400 transition-all shadow-xs cursor-pointer group"
          aria-label="Attiva/disattiva tema scuro"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform group-hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 transition-transform group-hover:-rotate-12" />
          )}
        </button>

        {/* Notification Bell with red alert dot */}
        <button
          onClick={() => setIsPostaModalOpen(true)}
          title="Notifiche e follow-up"
          className="relative w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 backdrop-blur-md flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all shadow-xs cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {urgentTasksCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff4d4f] ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>

      </div>

    </header>
  );
};

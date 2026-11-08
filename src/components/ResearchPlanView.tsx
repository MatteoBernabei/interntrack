import React, { useState } from 'react';
import { 
  Compass, 
  Copy, 
  Check, 
  RotateCcw, 
  ExternalLink, 
  Plus, 
  Clock, 
  Sparkles,
  MapPin,
  Search,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';

export const ResearchPlanView: React.FC = () => {
  const { 
    researchSessions, 
    toggleResearchPlatform, 
    completeResearchSession, 
    postponeResearchSession, 
    recalculatePlan, 
    setIsNewAppModalOpen,
    showToast 
  } = useInternTrack();

  const [activeTab, setActiveTab] = useState<'oggi' | 'tutte'>('oggi');

  // Daily budget calculations
  const totalMinutes = 120;
  const sessionsMinutes = researchSessions.filter(s => s.status !== 'fatta').reduce((acc, s) => acc + s.durationMin, 0);
  const siteCheckMinutes = 20; // 4 sites x 5 min
  const allocatedMinutes = sessionsMinutes + siteCheckMinutes;

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copiata negli appunti`, 'success');
  };

  const todaySessions = researchSessions.filter(s => s.date === '2026-10-28' || s.status === 'pianificata');

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & DAILY BUDGET SUMMARY
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight" style={{ fontWeight: 300 }}>
            Piano di Ricerca Quotidiano
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sessioni mirate per ruoli e città europee con query booleane ottimizzate
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={recalculatePlan}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/40 dark:bg-slate-900/50 hover:bg-white/70 dark:hover:bg-slate-800 backdrop-blur-xl border border-white/60 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>Ricalcola il piano</span>
          </button>

          <button
            onClick={() => setIsNewAppModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Aggiungi trovata</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MINUTE BUDGET PROGRESS CARD
          ───────────────────────────────────────────────────────────── */}
      <div className="p-5 rounded-[28px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              Budget tempo di oggi: {allocatedMinutes} min su {totalMinutes} min
            </span>
          </div>
          <p className="text-slate-500 font-mono">
            Sessioni ricerca: {sessionsMinutes} min · Controllo portali carriere: {siteCheckMinutes} min
          </p>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full sm:w-64 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              allocatedMinutes > totalMinutes ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500'
            }`}
            style={{ width: `${Math.min(100, (allocatedMinutes / totalMinutes) * 100)}%` }}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SESSIONS LIST (CARDS)
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {todaySessions.map((session) => {
          const isDone = session.status === 'fatta';
          return (
            <div
              key={session.id}
              className={`p-6 rounded-[28px] transition-all border ${
                isDone
                  ? 'bg-white/40 dark:bg-slate-900/40 border-slate-200/50 opacity-60'
                  : 'bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border-white/60 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.06)]'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {session.role}
                      <span className="text-xs font-normal text-slate-400">· {session.city} ({session.country})</span>
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      Stima: {session.durationMin} minuti · {session.platforms.length} canali
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => completeResearchSession(session.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isDone ? 'Completata' : 'Segna come fatta'}</span>
                  </button>

                  <button
                    onClick={() => postponeResearchSession(session.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all"
                  >
                    Rimanda
                  </button>
                </div>
              </div>

              {/* Boolean Search String (with Copy button) */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 mb-3 text-xs flex items-center justify-between gap-3">
                <div className="font-mono text-slate-700 dark:text-slate-300 truncate">
                  <span className="text-slate-400 font-sans font-semibold mr-2">Query booleana:</span>
                  {session.booleanQuery}
                </div>
                <button
                  onClick={() => handleCopyText(session.booleanQuery, 'Stringa booleana')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 border border-slate-200 dark:border-slate-600 font-medium flex items-center gap-1 shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copia</span>
                </button>
              </div>

              {/* Local keywords */}
              <div className="flex items-center gap-2 flex-wrap mb-4 text-xs">
                <span className="text-slate-400 font-medium">Parole chiave locali:</span>
                {session.localKeywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => handleCopyText(kw, `Parola chiave "${kw}"`)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/40 dark:border-blue-900/40 font-mono text-[11px] hover:bg-blue-100 flex items-center gap-1"
                  >
                    <span>{kw}</span>
                    <Copy className="w-2.5 h-2.5 opacity-60" />
                  </button>
                ))}
              </div>

              {/* Platforms checklist with found counters */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {session.platforms.map((plat) => (
                  <div
                    key={plat.platform}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleResearchPlatform(session.id, plat.platform)}
                        className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                          plat.checked ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {plat.checked && <Check className="w-3 h-3" />}
                      </button>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{plat.platform}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">{plat.timeMin}m</span>
                      {plat.searchUrl && (
                        <a href={plat.searchUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-500">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  LayoutGrid, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Bell, 
  ChevronDown, 
  FileText, 
  Target, 
  Building2, 
  FolderKanban, 
  CheckCircle2, 
  Layers, 
  Table as TableIcon,
  MessageSquare,
  Bot,
  Zap,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import { useInternTrack, ScreenId } from '../context/InternTrackContext';

export const Navigation: React.FC = () => {
  const { 
    activeScreen, 
    setActiveScreen, 
    applications,
    urgentTasksCount, 
    trackerViewMode,
    setTrackerViewMode,
    trackerFilter,
    setTrackerFilter,
    setSelectedAppId,
    setIsAiCopilotOpen,
    setIsNewAppModalOpen,
    setIsSettingsModalOpen,
    setIsPostaModalOpen
  } = useInternTrack();

  const [isTrackerSectionOpen, setIsTrackerSectionOpen] = useState(true);

  // Dynamic status counts
  const statusCounts = useMemo(() => {
    return {
      all: applications.length,
      colloqui: applications.filter(a => a.status === 'Colloquio').length,
      offerte: applications.filter(a => a.status === 'Offerta').length,
      inAttesa: applications.filter(a => a.status === 'Candidato').length,
      daInviare: applications.filter(a => a.status === 'Da candidarmi').length,
      milano: applications.filter(a => a.city.toLowerCase().includes('milano')).length,
      fintech: applications.filter(a => a.company.toLowerCase().includes('scalapay') || a.company.toLowerCase().includes('revolut') || a.company.toLowerCase().includes('satispay') || a.company.toLowerCase().includes('n26')).length,
    };
  }, [applications]);

  // Extract upcoming interviews
  const upcomingInterviews = useMemo(() => {
    const list: { appId: string; company: string; date: string; time: string; topic: string; badge: string; initial: string; color: string }[] = [];
    applications.forEach(a => {
      a.interviews.forEach(inv => {
        if (!inv.done) {
          let badge = inv.date ? inv.date : 'A breve';
          if (inv.date === '2026-10-29' || inv.date === '2026-10-30') badge = 'Domani 15:00';
          else if (inv.date === '2026-10-31') badge = 'Giovedì 11:30';
          
          let color = 'bg-[#ff2d55]';
          if (a.company.toLowerCase().includes('revolut')) color = 'bg-[#191919] border border-white/20';
          else if (a.company.toLowerCase().includes('bending')) color = 'bg-[#f59e0b]';
          else if (a.company.toLowerCase().includes('satispay')) color = 'bg-[#ef4444]';

          list.push({
            appId: a.id,
            company: a.company,
            date: inv.date,
            time: inv.time || '15:00',
            topic: inv.topic || `${inv.kind} Interview`,
            badge,
            initial: a.company.slice(0, 2).toUpperCase(),
            color
          });
        }
      });
    });
    return list.slice(0, 3);
  }, [applications]);

  return (
    <div className="flex shrink-0 select-none border-r border-white/60 dark:border-white/10">
      
      {/* ─────────────────────────────────────────────────────────────
          COLUMN 1: ULTRA-SLIM ICON RAIL (Main navigation + profile)
          ───────────────────────────────────────────────────────────── */}
      <aside className="w-16 shrink-0 bg-white/50 dark:bg-slate-900/70 backdrop-blur-2xl flex flex-col justify-between items-center py-5 border-r border-white/60 dark:border-white/10 z-20">
        
        {/* Top: User Avatar with PRO badge */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative group cursor-pointer" onClick={() => setIsSettingsModalOpen(true)}>
            <div className="w-10 h-10 rounded-2xl bg-[#1890ff] text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-500/20 ring-2 ring-white/80 dark:ring-white/10">
              MB
            </div>
            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full bg-[#1890ff] text-white text-[8px] font-extrabold tracking-tighter uppercase shadow-xs">
              PRO
            </span>
          </div>
        </div>

        {/* Middle: MAIN icon buttons */}
        <div className="flex flex-col items-center gap-3 my-auto">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
            MAIN
          </span>

          {/* Dashboard Icon */}
          <button
            onClick={() => setActiveScreen('dashboard')}
            title="Dashboard"
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeScreen === 'dashboard'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md shadow-slate-900/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {/* Tracker Icon */}
          <button
            onClick={() => setActiveScreen('tracker')}
            title="Tracker"
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
              activeScreen === 'tracker'
                ? 'bg-[#1890ff] text-white shadow-md shadow-blue-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {urgentTasksCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff4d4f]" />
            )}
          </button>

          {/* Calendar Icon */}
          <button
            onClick={() => setActiveScreen('calendar')}
            title="Calendario"
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeScreen === 'calendar'
                ? 'bg-[#1890ff] text-white shadow-md shadow-blue-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
          </button>

          {/* AI Copilot Sparkles */}
          <button
            onClick={() => setIsAiCopilotOpen(true)}
            title="Gemini AI Copilot"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#1890ff] hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsPostaModalOpen(true)}
            title="Centro Notifiche"
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {urgentTasksCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff4d4f]" />
            )}
          </button>
        </div>

        {/* Bottom: COLLOQUI circle badges matching the screenshot */}
        <div className="flex flex-col items-center gap-2 pt-3 border-t border-white/60 dark:border-white/10">
          <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
            COLLOQUI
          </span>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => {
                setActiveScreen('tracker');
                const app = applications.find(a => a.company.toLowerCase().includes('scalapay'));
                if (app) setSelectedAppId(app.id);
              }}
              title="Scalapay - Colloquio"
              className="w-7 h-7 rounded-full bg-[#ff2d55] text-white text-[9px] font-bold flex items-center justify-center shadow-xs hover:scale-110 transition-transform cursor-pointer"
            >
              SP
            </button>
            <button
              onClick={() => {
                setActiveScreen('tracker');
                const app = applications.find(a => a.company.toLowerCase().includes('revolut'));
                if (app) setSelectedAppId(app.id);
              }}
              title="Revolut - Colloquio"
              className="w-7 h-7 rounded-full bg-[#0a0f1d] text-white text-[9px] font-bold flex items-center justify-center shadow-xs border border-white/20 hover:scale-110 transition-transform cursor-pointer"
            >
              Rev
            </button>
            <button
              onClick={() => {
                setActiveScreen('tracker');
                const app = applications.find(a => a.company.toLowerCase().includes('bending'));
                if (app) setSelectedAppId(app.id);
              }}
              title="Bending Spoons - Colloquio"
              className="w-7 h-7 rounded-full bg-[#f59e0b] text-white text-[9px] font-bold flex items-center justify-center shadow-xs hover:scale-110 transition-transform cursor-pointer"
            >
              BS
            </button>
          </div>
        </div>

      </aside>

      {/* ─────────────────────────────────────────────────────────────
          COLUMN 2: SECONDARY WORKSPACE SIDEBAR (Sub-navigation)
          ───────────────────────────────────────────────────────────── */}
      <aside className="w-56 lg:w-64 shrink-0 bg-white/40 dark:bg-slate-900/50 backdrop-blur-2xl p-4 flex flex-col justify-between text-xs overflow-y-auto">
        <div className="space-y-5">
          
          {/* Header Workspace Badge */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              CAREER WORKSPACE
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100/70 dark:bg-blue-950/70 text-[#1890ff] dark:text-[#69b1ff] text-[10px] font-mono font-semibold border border-blue-200/50 dark:border-blue-900/50">
              Gemini 1.5
            </span>
          </div>

          {/* Section: TRACKER CANDIDATURE */}
          <div className="space-y-2">
            <button
              onClick={() => setIsTrackerSectionOpen(!isTrackerSectionOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/80 dark:border-white/10 text-slate-900 dark:text-white font-bold shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FolderKanban className="w-3.5 h-3.5 text-[#1890ff]" />
                <span className="text-xs">Tracker</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isTrackerSectionOpen ? '' : '-rotate-90'}`} />
            </button>

            {isTrackerSectionOpen && (
              <div className="pl-1.5 space-y-1">
                {/* 1. View Modes Switchers (Action Center, Schede, Tabella Pro) */}
                <div className="p-1 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/70 dark:border-white/10 mb-2 flex flex-col gap-0.5">
                  <button
                    onClick={() => {
                      setActiveScreen('tracker');
                      setTrackerViewMode('tabella');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeScreen === 'tracker' && trackerViewMode === 'tabella'
                        ? 'bg-[#1890ff] text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Tabella Pro</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveScreen('tracker');
                      setTrackerViewMode('action');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeScreen === 'tracker' && trackerViewMode === 'action'
                        ? 'bg-[#1890ff] text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Action Center</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveScreen('tracker');
                      setTrackerViewMode('schede');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeScreen === 'tracker' && trackerViewMode === 'schede'
                        ? 'bg-[#1890ff] text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Schede</span>
                    </div>
                  </button>
                </div>

                {/* 2. Status Breakdown Items */}
                <button
                  onClick={() => {
                    setActiveScreen('tracker');
                    setTrackerFilter('all');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeScreen === 'tracker' && trackerFilter === 'all'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>Tutte le Candidature</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${
                    activeScreen === 'tracker' && trackerFilter === 'all'
                      ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900 font-bold'
                      : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-white/80 dark:border-white/10'
                  }`}>
                    {statusCounts.all}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveScreen('tracker');
                    setTrackerFilter('Colloquio');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeScreen === 'tracker' && trackerFilter === 'Colloquio'
                      ? 'bg-orange-500 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>Fase Colloqui</span>
                  <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400 font-mono font-bold text-[10px] flex items-center justify-center">
                    {statusCounts.colloqui}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveScreen('tracker');
                    setTrackerFilter('Offerta');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeScreen === 'tracker' && trackerFilter === 'Offerta'
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>Offerte Ricevute</span>
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10px] flex items-center justify-center">
                    {statusCounts.offerte}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveScreen('tracker');
                    setTrackerFilter('Candidato');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeScreen === 'tracker' && trackerFilter === 'Candidato'
                      ? 'bg-[#1890ff] text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>In Attesa Esito</span>
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-mono font-bold text-[10px] flex items-center justify-center">
                    {statusCounts.inAttesa}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveScreen('tracker');
                    setTrackerFilter('Da candidarmi');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeScreen === 'tracker' && trackerFilter === 'Da candidarmi'
                      ? 'bg-slate-700 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span>Da Inviare</span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold text-[10px] flex items-center justify-center">
                    {statusCounts.daInviare}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Section: STRUMENTI IA */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono px-2">
              STRUMENTI IA
            </span>

            <button
              onClick={() => setIsAiCopilotOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-[#1890ff] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#1890ff]" />
                <span>Gemini CV Match</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#1890ff] text-[9px] font-bold font-mono">
                AI
              </span>
            </button>

            <button
              onClick={() => setIsAiCopilotOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-[#1890ff] transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Cover Letter Gen</span>
            </button>

            <button
              onClick={() => setIsAiCopilotOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-[#1890ff] transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>Simulatore Colloqui</span>
            </button>
          </div>

          {/* Section: CARTELLE & TARGET */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono px-2">
              CARTELLE & TARGET
            </span>

            <button
              onClick={() => {
                setActiveScreen('tracker');
                setTrackerFilter('all');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-[#1890ff] transition-all cursor-pointer"
            >
              <span>Top Startups Milano</span>
              <span className="text-slate-400 font-mono text-[10px]">{statusCounts.milano}</span>
            </button>

            <button
              onClick={() => {
                setActiveScreen('tracker');
                setTrackerFilter('all');
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-[#1890ff] transition-all cursor-pointer"
            >
              <span>Fintech Tier 1</span>
              <span className="text-slate-400 font-mono text-[10px]">{statusCounts.fintech}</span>
            </button>
          </div>

        </div>

        {/* Bottom Card: PROSSIMI COLLOQUI */}
        <div className="pt-3 border-t border-white/60 dark:border-white/10 mt-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
              PROSSIMI COLLOQUI
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-2">
            {upcomingInterviews.map((inv, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setActiveScreen('tracker');
                  setSelectedAppId(inv.appId);
                }}
                className="p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/80 dark:border-white/10 hover:bg-white/95 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#1890ff] transition-colors">
                    {inv.company}
                  </span>
                  <span className="text-[10px] font-semibold text-[#1890ff] dark:text-[#69b1ff] font-mono">
                    {inv.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {inv.topic}
                </p>
              </div>
            ))}
          </div>
        </div>

      </aside>

    </div>
  );
};

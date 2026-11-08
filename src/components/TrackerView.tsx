import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Table as TableIcon, 
  LayoutGrid,
  Zap,
  Link as LinkIcon, 
  Download, 
  Mail, 
  Calendar, 
  MapPin, 
  Building2, 
  ArrowRight, 
  Check, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  X,
  Bookmark,
  CheckCircle2,
  Sparkles,
  Briefcase,
  Layers,
  Coins,
  TrendingUp,
  FileCheck2,
  Share2,
  CheckSquare,
  Square
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';
import { Application, ApplicationStatus, WorkMode, PriorityLevel } from '../types/internTrack';
import { CompanyLogo } from './CompanyLogo';

const STAGES: ApplicationStatus[] = [
  'Da candidarmi',
  'Candidato',
  'Colloquio',
  'Offerta',
  'Rifiutato'
];

const COUNTRY_NAMES: Record<string, string> = {
  IT: 'Italia (IT) 🇮🇹',
  DE: 'Germania (DE) 🇩🇪',
  FR: 'Francia (FR) 🇫🇷',
  UK: 'Regno Unito (UK) 🇬🇧',
  ES: 'Spagna (ES) 🇪🇸',
  US: 'Stati Uniti (US) 🇺🇸',
  CH: 'Svizzera (CH) 🇨🇭',
  NL: 'Paesi Bassi (NL) 🇳🇱',
};

// Helper for initial badges matching the Stitch screenshot
const getCompanyBadgeStyle = (company: string) => {
  const c = company.toLowerCase();
  if (c.includes('scalapay')) return { label: 'SP', bg: 'bg-[#ff2d55] text-white shadow-rose-500/20' };
  if (c.includes('revolut')) return { label: 'R', bg: 'bg-[#191919] text-white ring-1 ring-white/20' };
  if (c.includes('satispay')) return { label: 'S', bg: 'bg-[#ef4444] text-white shadow-red-500/20' };
  if (c.includes('bending')) return { label: 'BS', bg: 'bg-[#f59e0b] text-white shadow-amber-500/20' };
  if (c.includes('casavo')) return { label: 'CA', bg: 'bg-[#8b5cf6] text-white shadow-purple-500/20' };
  if (c.includes('n26')) return { label: 'N26', bg: 'bg-[#0ea5e9] text-white shadow-cyan-500/20' };
  if (c.includes('docebo')) return { label: 'DOC', bg: 'bg-[#00c49f] text-white' };
  if (c.includes('jakala')) return { label: 'JAK', bg: 'bg-[#3b82f6] text-white' };
  
  // Default fallback badge
  const words = company.trim().split(/\s+/);
  const initials = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : company.slice(0, 2).toUpperCase();
  return { label: initials, bg: 'bg-gradient-to-tr from-slate-700 to-slate-900 text-white' };
};

// Fit match score calculation for visual fidelity
const getFitMatch = (app: Application) => {
  let score = 88;
  let text = 'Buon fit';
  if (app.company.toLowerCase().includes('scalapay')) { score = 96; text = 'Perfetto'; }
  else if (app.company.toLowerCase().includes('satispay')) { score = 95; text = 'Top Matching'; }
  else if (app.company.toLowerCase().includes('n26')) { score = 94; text = 'Forte Fit'; }
  else if (app.company.toLowerCase().includes('bending')) { score = 92; text = 'Elevato'; }
  else if (app.company.toLowerCase().includes('revolut')) { score = 90; text = 'Ottimo fit'; }
  else if (app.priority === 'Alta') { score = 93; text = 'Forte Fit'; }
  else if (app.priority === 'Media') { score = 87; text = 'Buon fit'; }
  else { score = 82; text = 'Match base'; }

  return { score, text };
};

// Next step pill calculation
const getNextStepInfo = (app: Application) => {
  const activeInterview = app.interviews.find(i => !i.done);
  if (activeInterview) {
    if (activeInterview.date) {
      return {
        label: `🕒 ${activeInterview.date} · ${activeInterview.kind || 'Meet'}`,
        style: 'bg-blue-500/10 text-[#1890ff] dark:text-[#69b1ff] border-blue-500/20'
      };
    }
    return {
      label: `🕒 5 Nov · Google Meet`,
      style: 'bg-blue-500/10 text-[#1890ff] dark:text-[#69b1ff] border-blue-500/20'
    };
  }
  if (app.status === 'Offerta') {
    return {
      label: `✓ Decisione entro 15gg`,
      style: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    };
  }
  if (app.company.toLowerCase().includes('revolut')) {
    return {
      label: `📄 Case Study Review`,
      style: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
    };
  }
  if (app.company.toLowerCase().includes('casavo')) {
    return {
      label: `Inviata con Referral`,
      style: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
    };
  }
  if (app.company.toLowerCase().includes('bending')) {
    return {
      label: `Follow-up tra 3 gg`,
      style: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20'
    };
  }
  if (app.deadline) {
    return {
      label: `Scadenza tra 5 gg`,
      style: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
    };
  }
  return {
    label: `In attesa di screening`,
    style: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
  };
};

export const TrackerView: React.FC = () => {
  const {
    applications,
    trackerFilter,
    setTrackerFilter,
    searchQuery,
    setSearchQuery,
    setSelectedAppId,
    setIsNewAppModalOpen,
    setIsBookmarkletModalOpen,
    setIsAiCopilotOpen,
    changeAppStatus,
    updateApplication,
    exportApplicationsCSV,
    trackerViewMode: viewMode,
    setTrackerViewMode: setViewMode
  } = useInternTrack();

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [geminiHighFitOnly, setGeminiHighFitOnly] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({
    '1': true,
    '3': true
  });
  
  // Link quick import modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [urlDetectedPlatform, setUrlDetectedPlatform] = useState('');

  // Table Pro controls
  const [sortField, setSortField] = useState<'company' | 'appliedAt' | 'priority' | 'status'>('appliedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tableGrouping, setTableGrouping] = useState<'none' | 'status' | 'priority' | 'workMode' | 'country' | 'city'>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Action Center archive toggle
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  // Filters state
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Dynamic list of countries present in data
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => {
      if (a.country) set.add(a.country);
    });
    return Array.from(set).sort();
  }, [applications]);

  // Dynamic list of cities, optionally constrained by selectedCountry
  const availableCities = useMemo(() => {
    const relevant = selectedCountry === 'all' 
      ? applications 
      : applications.filter(a => a.country === selectedCountry);
    const set = new Set<string>();
    relevant.forEach(a => {
      if (a.city?.trim()) set.add(a.city.trim());
    });
    return Array.from(set).sort();
  }, [applications, selectedCountry]);

  // Quick filter counts
  const quickCounts = useMemo(() => {
    return {
      all: applications.length,
      action_required: applications.filter(a => (a.status === 'Candidato' && !a.followDone) || (a.status === 'Da candidarmi' && a.deadline)).length,
      with_deadline: applications.filter(a => !!a.deadline).length,
      waiting_reply: applications.filter(a => a.status === 'Candidato').length,
      interviews_offers: applications.filter(a => a.status === 'Colloquio' || a.status === 'Offerta').length,
    };
  }, [applications]);

  const activeDetailedFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCountry !== 'all') count++;
    if (selectedCity !== 'all') count++;
    if (selectedWorkMode !== 'all') count++;
    if (selectedPriority !== 'all') count++;
    if (geminiHighFitOnly) count++;
    return count;
  }, [selectedCountry, selectedCity, selectedWorkMode, selectedPriority, geminiHighFitOnly]);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          app.company.toLowerCase().includes(q) ||
          app.role.toLowerCase().includes(q) ||
          app.city.toLowerCase().includes(q) ||
          app.notes.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Stage / Quick Filter
      if (trackerFilter === 'action_required') {
        const needsAction = (app.status === 'Candidato' && !app.followDone) || (app.status === 'Da candidarmi' && app.deadline);
        if (!needsAction) return false;
      } else if (trackerFilter === 'with_deadline') {
        if (!app.deadline) return false;
      } else if (trackerFilter === 'waiting_reply') {
        if (app.status !== 'Candidato') return false;
      } else if (trackerFilter === 'interviews_offers') {
        if (app.status !== 'Colloquio' && app.status !== 'Offerta') return false;
      } else if (trackerFilter !== 'all') {
        if (app.status !== trackerFilter) return false;
      }

      // 3. Country filter
      if (selectedCountry !== 'all' && app.country !== selectedCountry) return false;

      // 3b. City filter
      if (selectedCity !== 'all' && app.city?.toLowerCase() !== selectedCity.toLowerCase()) return false;

      // 4. WorkMode filter
      if (selectedWorkMode !== 'all' && app.workMode !== selectedWorkMode) return false;

      // 5. Priority filter
      if (selectedPriority !== 'all' && app.priority !== selectedPriority) return false;

      // 6. Gemini > 80% filter
      if (geminiHighFitOnly) {
        const fit = getFitMatch(app);
        if (fit.score < 80) return false;
      }

      return true;
    });
  }, [applications, searchQuery, trackerFilter, selectedCountry, selectedCity, selectedWorkMode, selectedPriority, geminiHighFitOnly]);

  // Table sorting
  const sortedTableApps = useMemo(() => {
    return [...filteredApps].sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'priority') {
        const pOrder: Record<string, number> = { Alta: 3, Media: 2, Bassa: 1 };
        valA = pOrder[a.priority] || 0;
        valB = pOrder[b.priority] || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredApps, sortField, sortOrder]);

  // Table Grouping
  const groupedTableApps = useMemo(() => {
    if (tableGrouping === 'none') {
      return { 'Tutte le candidature': sortedTableApps };
    }

    const groups: Record<string, Application[]> = {};
    sortedTableApps.forEach(app => {
      let key = '';
      if (tableGrouping === 'status') key = app.status;
      else if (tableGrouping === 'priority') key = `Priorità ${app.priority}`;
      else if (tableGrouping === 'workMode') key = `Modalità: ${app.workMode}`;
      else if (tableGrouping === 'country') key = app.country ? (COUNTRY_NAMES[app.country] || `Paese: ${app.country}`) : 'Paese non specificato';
      else if (tableGrouping === 'city') key = app.city ? `Città: ${app.city}` : 'Città non specificata';

      if (!groups[key]) groups[key] = [];
      groups[key].push(app);
    });

    return groups;
  }, [sortedTableApps, tableGrouping]);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSortToggle = (field: 'company' | 'appliedAt' | 'priority' | 'status') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAll = () => {
    const allSelected = filteredApps.every(a => selectedRowIds[a.id]);
    if (allSelected) {
      setSelectedRowIds({});
    } else {
      const next: Record<string, boolean> = {};
      filteredApps.forEach(a => { next[a.id] = true; });
      setSelectedRowIds(next);
    }
  };

  // Helper: days passed since applied
  const getDaysAgo = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const applied = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    const diffTime = today.getTime() - applied.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Action Center categorization
  const actionSections = useMemo(() => {
    const todayAction: { app: Application; reason: string; badge: string; color: string }[] = [];
    const waitingReply: Application[] = [];
    const warmPipelines: Application[] = [];
    const backlog: Application[] = [];
    const archivedRejected: Application[] = [];

    filteredApps.forEach(app => {
      if (app.status === 'Rifiutato') {
        archivedRejected.push(app);
        return;
      }

      const upcomingInterview = app.interviews.find(i => !i.done);
      const days = getDaysAgo(app.appliedAt);

      if (upcomingInterview) {
        todayAction.push({
          app,
          reason: `Colloquio fissato: ${upcomingInterview.kind} (${upcomingInterview.topic || 'Incontro'}) il ${upcomingInterview.date || 'a breve'}`,
          badge: 'Colloquio Imminente',
          color: 'bg-orange-50 text-orange-600 border-orange-200'
        });
      } else if (app.status === 'Candidato' && !app.followDone && days !== null && days >= 5) {
        todayAction.push({
          app,
          reason: `Inviata da ${days} giorni senza risposta. Tempo consigliato per il follow-up.`,
          badge: 'Follow-up Consigliato',
          color: 'bg-blue-50 text-[#1890ff] border-blue-200'
        });
      } else if (app.status === 'Da candidarmi' && app.deadline) {
        todayAction.push({
          app,
          reason: `Scadenza annuncio impostata al ${app.deadline}`,
          badge: 'Scadenza Vicina',
          color: 'bg-red-50 text-[#ff4d4f] border-red-200'
        });
      }

      if (app.status === 'Candidato') {
        waitingReply.push(app);
      } else if (app.status === 'Colloquio' || app.status === 'Offerta') {
        warmPipelines.push(app);
      } else if (app.status === 'Da candidarmi') {
        backlog.push(app);
      }
    });

    return {
      todayAction,
      waitingReply,
      warmPipelines,
      backlog,
      archivedRejected
    };
  }, [filteredApps]);

  return (
    <div className="space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP 4 KPI CARDS (Matching Stitch mock-up)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Bentornato Alex */}
        <div className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(20,60,120,0.06),0_1px_2px_rgba(255,255,255,0.85)_inset] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-500/20">
              AR
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[10px] font-bold tracking-tight border border-white/40 dark:border-white/10">
              MSc '24
            </span>
          </div>
          <div className="mt-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Bentornato, Alex
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {applications.length} attive · 3 colloqui in arrivo
            </p>
          </div>
        </div>

        {/* Card 2: Candidature Attive + Sparkline */}
        <div className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(20,60,120,0.06),0_1px_2px_rgba(255,255,255,0.85)_inset] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono">
                CANDIDATURE ATTIVE
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {applications.length}
              </div>
            </div>
            {/* Smooth neon green sparkline */}
            <div className="w-20 h-10 pt-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40">
                <path
                  d="M0,28 Q20,32 35,22 T70,12 T100,5"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
            <span className="text-slate-500 dark:text-slate-400">Trend candidature</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
              +14,2% mese
            </span>
          </div>
        </div>

        {/* Card 3: Tasso Colloqui */}
        <div className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(20,60,120,0.06),0_1px_2px_rgba(255,255,255,0.85)_inset] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono">
                TASSO COLLOQUI
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                28.5%
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
              6 su 21 inviate
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
            <span className="text-slate-500 dark:text-slate-400">Benchmark studenti</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
              Top 5% top business school
            </span>
          </div>
        </div>

        {/* Card 4: Media Indennità */}
        <div className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(20,60,120,0.06),0_1px_2px_rgba(255,255,255,0.85)_inset] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono">
                MEDIA INDENNITÀ
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                €1.330 <span className="text-xs font-semibold text-slate-500">/m</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
            <span className="text-slate-500 dark:text-slate-400">Picco offerta</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
              Max: €1.600 (Revolut)
            </span>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. UNIFIED FILTER & CONTROL BAR (Preserves user requirements)
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 p-3 sm:p-4 shadow-[0_8px_32px_rgba(20,60,120,0.06),0_1px_2px_rgba(255,255,255,0.85)_inset] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-3">
        {/* Row 1: Primary quick status filters + actions */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
            <button
              onClick={() => setTrackerFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all backdrop-blur-md cursor-pointer ${
                trackerFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 shadow-xs'
              }`}
            >
              Tutte ({quickCounts.all})
            </button>
            <button
              onClick={() => setTrackerFilter('action_required')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all backdrop-blur-md cursor-pointer ${
                trackerFilter === 'action_required'
                  ? 'bg-[#ff4d4f] text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 shadow-xs'
              }`}
            >
              Richiedono azione ({quickCounts.action_required})
            </button>
            <button
              onClick={() => setTrackerFilter('with_deadline')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all backdrop-blur-md cursor-pointer ${
                trackerFilter === 'with_deadline'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 shadow-xs'
              }`}
            >
              Con scadenza ({quickCounts.with_deadline})
            </button>
            <button
              onClick={() => setTrackerFilter('waiting_reply')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all backdrop-blur-md cursor-pointer ${
                trackerFilter === 'waiting_reply'
                  ? 'bg-[#1890ff] text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 shadow-xs'
              }`}
            >
              In attesa di risposta ({quickCounts.waiting_reply})
            </button>
            <button
              onClick={() => setTrackerFilter('interviews_offers')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all backdrop-blur-md cursor-pointer ${
                trackerFilter === 'interviews_offers'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 shadow-xs'
              }`}
            >
              Colloqui e offerte ({quickCounts.interviews_offers})
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto text-xs">
            {/* Reset all filters */}
            {(trackerFilter !== 'all' || activeDetailedFilterCount > 0) && (
              <button
                onClick={() => {
                  setTrackerFilter('all');
                  setSelectedCountry('all');
                  setSelectedCity('all');
                  setSelectedWorkMode('all');
                  setSelectedPriority('all');
                  setGeminiHighFitOnly(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/80 dark:border-red-900/60 font-semibold transition-all cursor-pointer shadow-xs"
                title="Azzera tutti i filtri"
              >
                <X className="w-3.5 h-3.5" />
                <span>Azzera filtri</span>
              </button>
            )}

            {/* Toggle Detailed Filters */}
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md font-semibold transition-all shadow-xs cursor-pointer ${
                isFilterPanelOpen || activeDetailedFilterCount > 0
                  ? 'bg-[#1890ff]/15 text-[#1890ff] dark:text-[#69b1ff] border-[#1890ff]/30 dark:border-[#1890ff]/40'
                  : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtri avanzati (Paese/Città)</span>
              {activeDetailedFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#1890ff] text-white text-[10px] flex items-center justify-center font-bold">
                  {activeDetailedFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Collapsible detailed filters for Country, City, WorkMode, Priority */}
        {isFilterPanelOpen && (
          <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Country */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">
                Paese
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  if (e.target.value !== 'all') setSelectedCity('all');
                }}
                className="w-full p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-white/80 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1890ff] shadow-xs"
              >
                <option value="all">Tutti i paesi ({applications.length})</option>
                {availableCountries.map(c => (
                  <option key={c} value={c}>
                    {COUNTRY_NAMES[c] || c} ({applications.filter(a => a.country === c).length})
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">
                Città
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-white/80 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1890ff] shadow-xs"
              >
                <option value="all">Tutte le città</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>
                    {city} ({applications.filter(a => a.city?.toLowerCase() === city.toLowerCase()).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">
                Modalità di lavoro
              </label>
              <select
                value={selectedWorkMode}
                onChange={(e) => setSelectedWorkMode(e.target.value)}
                className="w-full p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-white/80 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1890ff] shadow-xs"
              >
                <option value="all">Tutte le modalità</option>
                <option value="In sede">In sede</option>
                <option value="Ibrido">Ibrido</option>
                <option value="Remoto">Remoto</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">
                Priorità
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-white/80 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1890ff] shadow-xs"
              >
                <option value="all">Tutte le priorità</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Bassa">Bassa</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN TABLE CARD (STITCH MOCK-UP LAYOUT)
          ───────────────────────────────────────────────────────────── */}
      {viewMode === 'tabella' && (
        <div className="rounded-3xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(20,60,120,0.06),0_1px_2px_rgba(255,255,255,0.85)_inset] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
          
          {/* Card Header matching Stitch mock-up */}
          <div className="p-4 sm:px-6 sm:py-4.5 border-b border-white/60 dark:border-white/10 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white font-mono">
                TRACKER CANDIDATURE STAGE & GRADUATE
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] font-bold font-mono">
                {filteredApps.length} totali
              </span>
            </div>

            {/* View Switchers & Pill Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Switcher: Tabella | Kanban */}
              <div className="p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-white/40 dark:border-white/10 flex items-center text-xs">
                <button
                  onClick={() => setViewMode('tabella')}
                  className="px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                >
                  Tabella
                </button>
                <button
                  onClick={() => setViewMode('schede')}
                  className="px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Schede
                </button>
                <button
                  onClick={() => setViewMode('action')}
                  className="px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Action Center
                </button>
              </div>

              {/* Status pill button */}
              <button
                onClick={() => setTrackerFilter(trackerFilter === 'all' ? 'Colloquio' : 'all')}
                className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-white/60 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white transition-all shadow-xs cursor-pointer"
              >
                Stato: {trackerFilter === 'all' ? 'Tutti' : trackerFilter}
              </button>

              {/* Gemini > 80% Filter */}
              <button
                onClick={() => setGeminiHighFitOnly(!geminiHighFitOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                  geminiHighFitOnly
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-white/60 dark:border-white/10 hover:bg-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>✓ Gemini &gt; 80%</span>
              </button>

              {/* CSV Export */}
              <button
                onClick={exportApplicationsCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-white/60 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white transition-all shadow-xs cursor-pointer"
              >
                <span>Esporta CSV</span>
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Grouping bar selector */}
          <div className="px-6 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border-b border-white/40 dark:border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Aggruppa per:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {(['none', 'status', 'country', 'city', 'workMode', 'priority'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setTableGrouping(mode)}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      tableGrouping === mode
                        ? 'bg-[#1890ff] text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {mode === 'none' ? 'Nessuno' :
                     mode === 'status' ? 'Stato' :
                     mode === 'country' ? 'Paese' :
                     mode === 'city' ? 'Città' :
                     mode === 'workMode' ? 'Modalità' : 'Priorità'}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              Clicca su una riga per aprire il dettaglio completo
            </span>
          </div>

          {/* Main Table Body */}
          <div className="overflow-x-auto">
            {Object.entries(groupedTableApps).map(([groupTitle, appsInGroup]) => {
              const isCollapsed = collapsedGroups[groupTitle];

              return (
                <div key={groupTitle}>
                  {tableGrouping !== 'none' && (
                    <button
                      onClick={() => toggleGroupCollapse(groupTitle)}
                      className="w-full px-6 py-2 bg-slate-100/60 dark:bg-slate-800/60 border-b border-white/40 dark:border-white/5 flex items-center justify-between text-left hover:bg-slate-200/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase font-mono">
                          {groupTitle}
                        </span>
                        <span className="px-2 py-0.2 rounded-full bg-white/80 dark:bg-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                          {appsInGroup.length}
                        </span>
                      </div>
                    </button>
                  )}

                  {!isCollapsed && (
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                      <thead className="bg-slate-100/40 dark:bg-slate-900/40 border-b border-white/60 dark:border-white/10 text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="py-3 px-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={appsInGroup.length > 0 && appsInGroup.every(a => selectedRowIds[a.id])}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 rounded text-[#1890ff] focus:ring-0 cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-4 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => handleSortToggle('company')}>
                            Azienda & Ruolo
                          </th>
                          <th className="py-3 px-4 font-bold cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => handleSortToggle('status')}>
                            Stato Candidatura
                          </th>
                          <th className="py-3 px-4 font-bold">
                            Gemini Fit Match
                          </th>
                          <th className="py-3 px-4 font-bold">
                            Sede
                          </th>
                          <th className="py-3 px-4 font-bold">
                            Compenso
                          </th>
                          <th className="py-3 px-4 font-bold">
                            Prossimo Step
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/40 dark:divide-white/5">
                        {appsInGroup.map((app) => {
                          const badge = getCompanyBadgeStyle(app.company);
                          const fit = getFitMatch(app);
                          const nextStep = getNextStepInfo(app);
                          const isSelected = !!selectedRowIds[app.id];

                          return (
                            <tr
                              key={app.id}
                              onClick={() => setSelectedAppId(app.id)}
                              className={`transition-colors cursor-pointer group ${
                                isSelected 
                                  ? 'bg-blue-500/5 dark:bg-blue-500/10' 
                                  : 'hover:bg-white/60 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-3.5 px-4 text-center" onClick={(e) => toggleSelectRow(app.id, e)}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-[#1890ff] focus:ring-0 cursor-pointer"
                                />
                              </td>

                              {/* Azienda & Ruolo */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  {/* Stylized Badge (SP, R, S, BS, CA, N26, etc.) */}
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${badge.bg}`}>
                                    {badge.label}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-[#1890ff] transition-colors leading-tight">
                                      {app.company}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                      {app.role}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Stato Candidatura with Custom Pill */}
                              <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex">
                                  {app.status === 'Colloquio' ? (
                                    <span className="px-3 py-1 rounded-full text-[11px] font-bold border border-cyan-400/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 shadow-xs">
                                      Colloquio (Fase 2)
                                    </span>
                                  ) : app.status === 'Offerta' ? (
                                    <span className="px-3 py-1 rounded-full text-[11px] font-bold border border-amber-400/50 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-xs flex items-center gap-1">
                                      <span>🏆</span> Offerta Ricevuta
                                    </span>
                                  ) : app.status === 'Candidato' ? (
                                    <span className="px-3 py-1 rounded-full text-[11px] font-bold border border-purple-400/40 bg-purple-500/10 text-purple-600 dark:text-purple-300 shadow-xs flex items-center gap-1">
                                      <span>🚀</span> Candidato
                                    </span>
                                  ) : app.status === 'Da candidarmi' ? (
                                    <span className="px-3 py-1 rounded-full text-[11px] font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs flex items-center gap-1">
                                      <span>⏳</span> Da Candidarmi
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 rounded-full text-[11px] font-bold border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-xs">
                                      Rifiutata
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Gemini Fit Match: Horizontal Gradient Bar + % */}
                              <td className="py-3.5 px-4 min-w-[160px]">
                                <div className="flex items-center gap-3">
                                  <div className="w-20 h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#00f2fe] to-[#4facfe]"
                                      style={{ width: `${fit.score}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-extrabold text-[#00b4d8] dark:text-[#38bdf8] font-mono whitespace-nowrap">
                                    {fit.score}% {fit.text}
                                  </span>
                                </div>
                              </td>

                              {/* Sede */}
                              <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {app.city} {app.workMode ? `(${app.workMode})` : ''}
                              </td>

                              {/* Compenso */}
                              <td className="py-3.5 px-4 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {app.salary || '€1.200/m'}
                              </td>

                              {/* Prossimo Step */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${nextStep.style}`}>
                                  {nextStep.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Table Action Bar */}
          <div className="p-4 px-6 border-t border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={() => setIsNewAppModalOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-[#1890ff] dark:text-[#38bdf8] hover:underline cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-[#1890ff]/15 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-[#1890ff]" />
              </div>
              <span>+ Aggiungi candidatura o incolla link annuncio con Gemini AI...</span>
            </button>

            <span className="text-[11px] text-slate-400 font-mono">
              Sincronizzato con LinkedIn & Career Gateway
            </span>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VISTA 2: SCHEDE (Grid cards with progress bar)
          ───────────────────────────────────────────────────────────── */}
      {viewMode === 'schede' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => {
            const stepOrder: ApplicationStatus[] = ['Da candidarmi', 'Candidato', 'Colloquio', 'Offerta'];
            const currentIdx = stepOrder.indexOf(app.status);
            const badge = getCompanyBadgeStyle(app.company);
            const fit = getFitMatch(app);

            return (
              <div
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                className="p-5 rounded-3xl bg-white/50 dark:bg-slate-900/60 hover:bg-white/70 dark:hover:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(20,60,120,0.06),0_1px_2px_rgba(255,255,255,0.85)_inset] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${badge.bg}`}>
                        {badge.label}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#1890ff] transition-colors truncate">
                          {app.company}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{app.city} ({app.country})</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-[#00b4d8] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                      {fit.score}% Fit
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                      {app.role}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 font-mono">
                        {app.workMode}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{app.salary || '€1.200/m'}</span>
                    </div>
                  </div>

                  {/* Step bar */}
                  <div className="pt-2 pb-1">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute left-2 right-2 top-2.5 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
                      {stepOrder.map((step, idx) => {
                        const isPast = currentIdx > idx;
                        const isCurrent = currentIdx === idx;

                        return (
                          <div key={step} className="relative z-10 flex flex-col items-center gap-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isCurrent ? 'bg-[#1890ff] text-white ring-4 ring-blue-100 dark:ring-blue-900/40' :
                              isPast ? 'bg-emerald-500 text-white' :
                              'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}>
                              {isPast ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                            </div>
                            <span className="text-[9px] font-mono text-slate-400">
                              {step === 'Da candidarmi' ? 'Bozza' : step === 'Candidato' ? 'Inviata' : step === 'Colloquio' ? 'Colloquio' : 'Offerta'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {app.interviews.length > 0 ? `${app.interviews.length} colloqui fissati` : `Inviata: ${app.appliedAt || 'Recente'}`}
                  </span>
                  <span className="text-[#1890ff] font-semibold flex items-center gap-1">
                    Dettaglio <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VISTA 1: ACTION CENTER (Operational list for follow-ups)
          ───────────────────────────────────────────────────────────── */}
      {viewMode === 'action' && (
        <div className="space-y-6">
          {/* Section A: Today urgent actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff4d4f] animate-pulse" />
                <h3 className="text-xs font-bold tracking-wider text-slate-900 dark:text-white uppercase font-mono">
                  Richiedono azione urgente oggi ({actionSections.todayAction.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actionSections.todayAction.map(({ app, reason, badge, color }) => (
                <div
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className="p-4 rounded-3xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-sm transition-all cursor-pointer group flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <CompanyLogo company={app.company} domain={app.companyDomain} url={app.url} platform={app.platform} size="sm" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#1890ff] transition-colors truncate">
                        {app.company} · {app.role}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {reason}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${color}`}>
                    {badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. BOTTOM 2 WIDGETS (Matching Stitch mock-up)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Widget 1: Analisi Fit Competenze Gemini AI */}
        <div className="p-5 rounded-3xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(20,60,120,0.06),0_1px_2px_rgba(255,255,255,0.85)_inset] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                  ANALISI FIT COMPETENZE GEMINI AI
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold font-mono">
                  CV Match: 92%
                </span>
              </div>
              <button 
                onClick={() => setIsAiCopilotOpen(true)}
                className="text-[11px] font-bold text-[#1890ff] dark:text-[#38bdf8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Report AI Completo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Skill 1 */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800 dark:text-slate-200">SQL & Python for Data Analysis</span>
                  <span className="text-[#00b4d8] font-bold font-mono">96% (Allineato)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: '96%' }} />
                </div>
              </div>

              {/* Skill 2 */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800 dark:text-slate-200">Financial Modeling & KPI Tracking</span>
                  <span className="text-blue-500 font-bold font-mono">88% (Ottimo)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500" style={{ width: '88%' }} />
                </div>
              </div>

              {/* Skill 3 */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800 dark:text-slate-200">Problem Solving & Case Interviewing</span>
                  <span className="text-teal-500 font-bold font-mono">94% (Eccellente)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500" style={{ width: '94%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Distribuzione Candidature per Città */}
        <div className="p-5 rounded-3xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(20,60,120,0.06),0_1px_2px_rgba(255,255,255,0.85)_inset] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                DISTRIBUZIONE CANDIDATURE PER CITTÀ
              </span>
              <button
                onClick={() => {
                  setSelectedCountry('all');
                  setSelectedCity('all');
                }}
                className="text-[11px] font-bold text-[#1890ff] dark:text-[#38bdf8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Esplora Mappa</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table layout matching Stitch screenshot */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-[10px] uppercase font-mono text-slate-400 font-bold pb-1 border-b border-white/40 dark:border-white/10">
                <span>Hub & Modalità</span>
                <span className="text-center">Quota su 24</span>
                <span className="text-right">Trend di Risposta</span>
              </div>

              {/* Row 1: Milano */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#1890ff]" />
                  <span className="font-bold text-slate-800 dark:text-slate-100">Milano (In sede / Ibrido)</span>
                </div>
                <span className="font-mono text-slate-600 dark:text-slate-300 text-xs">70% (17 ruoli)</span>
                <span className="font-bold text-emerald-500 font-mono text-xs flex items-center gap-0.5">
                  ↑ +24% conv.
                </span>
              </div>

              {/* Row 2: Berlino */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-100">Berlino / Tier 1 EU</span>
                </div>
                <span className="font-mono text-slate-600 dark:text-slate-300 text-xs">18% (4 ruoli)</span>
                <span className="font-semibold text-slate-400 font-mono text-xs">
                  Stabile
                </span>
              </div>

              {/* Row 3: Remote Global */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="font-bold text-slate-800 dark:text-slate-100">Full Remote Global</span>
                </div>
                <span className="font-mono text-slate-600 dark:text-slate-300 text-xs">12% (3 ruoli)</span>
                <span className="font-bold text-cyan-500 font-mono text-xs">
                  +8%
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: PARTI DAL LINK
          ───────────────────────────────────────────────────────────── */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Parti dal link dell'annuncio
              </h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Incolla il link dell'annuncio (LinkedIn, Indeed, Joinrs o portale aziendale). Riconosciamo la piattaforma e creiamo la scheda.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); if (importUrl) { setIsLinkModalOpen(false); setIsNewAppModalOpen(true); } }} className="space-y-4">
              <div>
                <input
                  type="url"
                  required
                  placeholder="https://www.linkedin.com/jobs/view/..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1890ff] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs"
                >
                  Continua alla scheda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

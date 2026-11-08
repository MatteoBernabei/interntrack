import React, { useState } from 'react';
import { Search, ArrowRight, X } from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';

export const FloatingSearchBar: React.FC = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    setActiveScreen, 
    setTrackerFilter 
  } = useInternTrack();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setSearchQuery(localQuery.trim());
      setActiveScreen('tracker');
      setTrackerFilter('all');
    }
  };

  const handleSuggestionClick = (type: 'today' | 'no_reply' | 'interviews' | 'action') => {
    if (type === 'today') {
      setActiveScreen('dashboard');
      const taskSection = document.getElementById('task-per-oggi');
      if (taskSection) {
        taskSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (type === 'no_reply') {
      setSearchQuery('');
      setTrackerFilter('waiting_reply');
      setActiveScreen('tracker');
    } else if (type === 'interviews') {
      setSearchQuery('');
      setTrackerFilter('interviews_offers');
      setActiveScreen('tracker');
    } else if (type === 'action') {
      setSearchQuery('');
      setTrackerFilter('action_required');
      setActiveScreen('tracker');
    }
  };

  return (
    <div className="fixed bottom-5 left-0 right-0 z-30 pointer-events-none hidden md:flex flex-col items-center px-4">
      <div className="pointer-events-auto flex flex-col items-center gap-2 max-w-xl w-full">
        
        {/* Suggestion Pills */}
        <div className="flex items-center gap-2 flex-wrap justify-center animate-fade-in">
          <button
            onClick={() => handleSuggestionClick('today')}
            className="px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-xl border border-white/50 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5"
          >
            Cosa devo fare oggi?
          </button>
          <button
            onClick={() => handleSuggestionClick('no_reply')}
            className="px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-xl border border-white/50 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5"
          >
            Senza risposta
          </button>
          <button
            onClick={() => handleSuggestionClick('interviews')}
            className="px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-xl border border-white/50 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5"
          >
            Colloqui e offerte
          </button>
          <button
            onClick={() => handleSuggestionClick('action')}
            className="px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-xl border border-white/50 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5"
          >
            Richiedono azione
          </button>
        </div>

        {/* Floating Glass Search Input Pill */}
        <form
          onSubmit={handleSearchSubmit}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] focus-within:ring-2 focus-within:ring-blue-500/50 transition-all"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Cerca un'azienda o un ruolo…"
            className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => setLocalQuery('')}
              className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            aria-label="Cerca"
            className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition-all shadow-sm"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
};

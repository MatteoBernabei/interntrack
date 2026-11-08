import React, { useState } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  AlertCircle, 
  Save, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';

export const CvLettersView: React.FC = () => {
  const { applications, updateApplication, setSelectedAppId, showToast } = useInternTrack();

  const [selectedApp, setSelectedApp] = useState(applications[0] || null);
  const [activeLetterText, setActiveLetterText] = useState(selectedApp?.letter || '');
  const [activeCvNotes, setActiveCvNotes] = useState(selectedApp?.cvNotes || '');
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);

  const appsWithoutLetter = applications.filter(a => !a.letter || !a.letter.trim());
  
  const displayedApps = filterMissingOnly ? appsWithoutLetter : applications;

  const handleSelectApp = (app: typeof applications[0]) => {
    setSelectedApp(app);
    setActiveLetterText(app.letter || '');
    setActiveCvNotes(app.cvNotes || '');
  };

  const handleSave = () => {
    if (!selectedApp) return;
    updateApplication(selectedApp.id, {
      letter: activeLetterText.trim() || undefined,
      cvNotes: activeCvNotes.trim() || undefined,
    });
    showToast('Lettera di presentazione e note CV salvate', 'success');
  };

  const handleCopyLetter = () => {
    if (!activeLetterText) return;
    navigator.clipboard.writeText(activeLetterText);
    showToast('Lettera copiata negli appunti', 'success');
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & WARNING NOTICE
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight" style={{ fontWeight: 300 }}>
            CV & Lettere di Presentazione
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Archivio lettere personalizzate e note di adattamento del CV per ogni azienda
          </p>
        </div>

        {appsWithoutLetter.length > 0 && (
          <button
            onClick={() => setFilterMissingOnly(!filterMissingOnly)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterMissingOnly
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{appsWithoutLetter.length} candidature senza lettera</span>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN SPLIT: Applications list on Left, Editor on Right
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left List: Candidature (4 cols) */}
        <div className="lg:col-span-4 rounded-[28px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.06)] p-4 space-y-2 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-400">
            <span>Seleziona candidatura</span>
            <span>{displayedApps.length}</span>
          </div>

          {displayedApps.map((app) => {
            const isSelected = selectedApp?.id === app.id;
            const hasLetter = !!app.letter && app.letter.trim().length > 0;

            return (
              <div
                key={app.id}
                onClick={() => handleSelectApp(app)}
                className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between text-xs ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div>
                  <h4 className="font-bold truncate">{app.company}</h4>
                  <p className={`text-[11px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {app.role}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!hasLetter && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-orange-300' : 'bg-orange-500'}`} title="Senza lettera" />
                  )}
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Pane: Inline Editor (8 cols) */}
        <div className="lg:col-span-8 rounded-[28px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.06)] p-6 space-y-5">
          {selectedApp ? (
            <>
              {/* Target info */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedApp.company}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Posizione: {selectedApp.role} ({selectedApp.city})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLetter}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copia lettera</span>
                  </button>

                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salva modifiche</span>
                  </button>
                </div>
              </div>

              {/* Cover Letter Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lettera di motivazione / Cover letter
                </label>
                <textarea
                  rows={10}
                  placeholder="Incolla o redigi qui la lettera di presentazione specifica per questa azienda..."
                  value={activeLetterText}
                  onChange={(e) => setActiveLetterText(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                />
              </div>

              {/* CV Tailoring Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Note di adattamento del CV (punti da evidenziare per questo ruolo)
                </label>
                <textarea
                  rows={3}
                  placeholder="Es. Enfatizzare l'esperienza con modelli di pricing in Python e il case study universitario..."
                  value={activeCvNotes}
                  onChange={(e) => setActiveCvNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-xs text-slate-400">
              Seleziona una candidatura per visualizzare e modificare la lettera di presentazione.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

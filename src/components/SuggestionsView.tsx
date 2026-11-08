import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  ExternalLink, 
  Check, 
  RotateCcw, 
  Sparkles, 
  FileSpreadsheet, 
  Bell, 
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Wand2,
  Loader2
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';

export const SuggestionsView: React.FC = () => {
  const { 
    contacts, 
    toggleContactDone, 
    updateContact,
    settings, 
    sheetUpdates, 
    setIsSettingsModalOpen, 
    showToast 
  } = useInternTrack();

  const [activeTab, setActiveTab] = useState<'oggi' | 'tutte' | 'novita'>('oggi');
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);

  const todayStr = '2026-10-28';
  const todayContacts = contacts.filter(c => c.due === todayStr || !c.done);

  const handleCopyNote = (note?: string) => {
    if (!note) return;
    navigator.clipboard.writeText(note);
    showToast('Nota di connessione (≤ 300 caratteri) copiata!', 'success');
  };

  const handleGenerateAiNote = async (contact: typeof contacts[0]) => {
    setGeneratingForId(contact.id);
    try {
      const res = await fetch('/api/ai/connection-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personName: contact.name,
          personRole: contact.role,
          company: contact.company,
          language: contact.country && contact.country !== 'IT' ? 'EN' : 'IT',
        }),
      });
      const data = await res.json();
      if (data.ok && data.note) {
        updateContact(contact.id, { connectionNote: data.note });
        showToast('Nuova nota di connessione generata con Gemini AI!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Errore durante la generazione della nota', 'warning');
    } finally {
      setGeneratingForId(null);
    }
  };

  const handleRefreshSheet = () => {
    showToast('Aggiornamento dal foglio «Hub Networking LinkedIn» completato', 'success');
  };

  const handleOpenSheet = () => {
    if (settings.googleSheetId) {
      window.open(`https://docs.google.com/spreadsheets/d/${settings.googleSheetId}`, '_blank');
    } else {
      setIsSettingsModalOpen(true);
      showToast('Configura l\'ID del foglio nelle impostazioni', 'info');
    }
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & ACTIONS
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight" style={{ fontWeight: 300 }}>
            Suggerimenti & Networking Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Connessioni mirate con note generate automaticamente da Gemini AI (≤ 300 caratteri)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefreshSheet}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/40 dark:bg-slate-900/50 hover:bg-white/70 dark:hover:bg-slate-800 backdrop-blur-xl border border-white/60 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>Aggiorna dal foglio</span>
          </button>

          <button
            onClick={handleOpenSheet}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Apri lo Sheet</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TAB TOGGLE
          ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('oggi')}
            className={`px-4 py-1.5 rounded-full font-medium transition-all ${
              activeTab === 'oggi'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-white/70'
            }`}
          >
            Persone di oggi ({todayContacts.length})
          </button>
          <button
            onClick={() => setActiveTab('tutte')}
            className={`px-4 py-1.5 rounded-full font-medium transition-all ${
              activeTab === 'tutte'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-white/70'
            }`}
          >
            Tutti i contatti ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('novita')}
            className={`px-4 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'novita'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-white/70'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Novità controlli ({sheetUpdates.length})</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Regola: note ≤ 300 caratteri, nessuna formula fatta, tono diretto
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'novita' ? (
        <div className="space-y-3">
          {sheetUpdates.map((update) => (
            <div
              key={update.id}
              className="p-5 rounded-[28px] bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-2xl bg-orange-500/10 text-orange-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {update.title}
                    </h3>
                    {update.isNew && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                        Nuova
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {update.detail}
                  </p>
                  <span className="text-[11px] font-mono text-slate-400 block mt-1.5">
                    {update.timestamp} · {update.company}
                  </span>
                </div>
              </div>

              {update.url && (
                <a
                  href={update.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Visualizza
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(activeTab === 'oggi' ? todayContacts : contacts).map((person) => (
            <div
              key={person.id}
              className={`p-6 rounded-[28px] transition-all border flex flex-col justify-between ${
                person.done
                  ? 'bg-white/50 dark:bg-slate-900/50 border-slate-200/50 opacity-70'
                  : 'bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border-white/60 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.06)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {person.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {person.role} · <strong className="text-blue-600 dark:text-blue-400">{person.company}</strong>
                      {person.country && <span className="text-slate-400 font-mono"> ({person.country})</span>}
                    </p>
                  </div>

                  {person.link && (
                    <a
                      href={person.link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 flex items-center gap-1 shrink-0"
                    >
                      <span>LinkedIn</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Relevance explanation */}
                {person.notes && (
                  <p className="text-xs text-slate-500 mb-3 italic">
                    Perché è rilevante: {person.notes}
                  </p>
                )}

                {/* Pre-written connection note (< 300 char) */}
                {person.connectionNote && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 mb-4 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1.5 font-mono">
                      <span>Nota di connessione ({person.connectionNote.length}/300 car.)</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleGenerateAiNote(person)}
                          disabled={generatingForId === person.id}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-sans disabled:opacity-50"
                        >
                          {generatingForId === person.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          <span>Rigenera con AI</span>
                        </button>
                        <button
                          onClick={() => handleCopyNote(person.connectionNote)}
                          className="text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1 font-sans"
                        >
                          <Copy className="w-3 h-3" /> Copia
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                      {person.connectionNote}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  {person.due ? `Previsto: ${person.due}` : 'In coda'}
                </span>

                <button
                  onClick={() => toggleContactDone(person.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs transition-all ${
                    person.done
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{person.done ? 'Completato' : 'Segna come fatto'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

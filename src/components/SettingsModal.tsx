import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Moon, 
  Sun, 
  Laptop, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Key, 
  Check, 
  RotateCcw, 
  FileText,
  ShieldCheck,
  Database,
  Bookmark
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsModalOpen, 
    setIsSettingsModalOpen, 
    setIsBookmarkletModalOpen,
    settings, 
    updateSettings, 
    exportDataJSON, 
    importDataJSON, 
    exportApplicationsCSV,
    exportClaudeQueue,
    importClaudeResults,
    resetSampleData,
    showToast 
  } = useInternTrack();

  const [activeTab, setActiveTab] = useState<'generali' | 'google' | 'claude' | 'dati'>('generali');
  const [claudeInputJson, setClaudeInputJson] = useState('');
  const [jsonInput, setJsonInput] = useState('');

  if (!isSettingsModalOpen) return null;

  const handleGenerateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let token = '';
    for (let i = 0; i < 28; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateSettings({ googleToken: token });
    showToast('Nuovo token di sicurezza a 28 caratteri generato', 'success');
  };

  const handleImportJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonInput.trim()) return;
    const ok = importDataJSON(jsonInput.trim());
    if (ok) {
      setJsonInput('');
      setIsSettingsModalOpen(false);
    }
  };

  const handleImportClaudeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claudeInputJson.trim()) return;
    importClaudeResults(claudeInputJson.trim());
    setClaudeInputJson('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="max-w-2xl w-full my-auto rounded-[28px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Impostazioni Intern Track
              </h2>
              <p className="text-xs text-slate-500">
                Tema, sincronizzazione, collegamento Google e scambio dati
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-3 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('generali')}
            className={`pb-2.5 border-b-2 transition-all ${
              activeTab === 'generali'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Generali & Tema
          </button>
          <button
            onClick={() => setActiveTab('google')}
            className={`pb-2.5 border-b-2 transition-all ${
              activeTab === 'google'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Collegamento Google
          </button>
          <button
            onClick={() => setActiveTab('claude')}
            className={`pb-2.5 border-b-2 transition-all ${
              activeTab === 'claude'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Scambio con Claude
          </button>
          <button
            onClick={() => setActiveTab('dati')}
            className={`pb-2.5 border-b-2 transition-all ${
              activeTab === 'dati'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Backup & Dati
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* TAB 1: GENERALI */}
          {activeTab === 'generali' && (
            <div className="space-y-5">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-2">
                  Tema dell'interfaccia
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'chiaro', label: 'Chiaro', icon: Sun },
                    { id: 'scuro', label: 'Scuro', icon: Moon },
                    { id: 'sistema', label: 'Sistema', icon: Laptop },
                  ].map(t => {
                    const active = settings.theme === t.id;
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => updateSettings({ theme: t.id as any })}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                          active
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Giorni follow-up candidatura
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={settings.followUpDays}
                    onChange={(e) => updateSettings({ followUpDays: parseInt(e.target.value) || 7 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Predefinito: 7 giorni</p>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Siti carriere da controllare al giorno
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={settings.sitesPerDay}
                    onChange={(e) => updateSettings({ sitesPerDay: parseInt(e.target.value) || 4 })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Predefinito: 4 siti/giorno</p>
                </div>
              </div>

              {/* Sincronizzazione Supabase / Database */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-900 dark:text-white">Archiviazione & Offline-First</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 font-semibold">Attivo</span>
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  I dati sono salvati in modo sicuro e persistente sul dispositivo con sincronizzazione a delta timestamp. Funziona al 100% senza internet.
                </p>
              </div>

              {/* Segnalibro 1-Clic per Chrome */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-800/60 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Bookmark className="w-4 h-4 text-blue-600" />
                    <span>Segnalibro 1-Clic per Chrome (LinkedIn)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aggiungi il pulsante alla barra dei preferiti per importare qualsiasi annuncio in 1 clic.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    setIsBookmarkletModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Configura
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <span>
                  L'app usa Google Apps Script con accesso in sola lettura (Gmail, Calendar, Sheet). Nessuna email viene inviata o cancellata.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  ID Foglio Google «Hub Networking LinkedIn»
                </label>
                <input
                  type="text"
                  placeholder="Es. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={settings.googleSheetId || ''}
                  onChange={(e) => updateSettings({ googleSheetId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Parola d'ordine dello Script (Token di sicurezza)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.googleToken || ''}
                    onChange={(e) => updateSettings({ googleToken: e.target.value })}
                    className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                  <button
                    onClick={handleGenerateToken}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold"
                  >
                    Genera
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoCheckMailOnOpen}
                    onChange={(e) => updateSettings({ autoCheckMailOnOpen: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Controlla posta (Gmail) all'apertura dell'applicazione
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoCheckSheetTimes}
                    onChange={(e) => updateSettings({ autoCheckSheetTimes: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Aggiorna persone e novità dal foglio alle 8:00 e alle 18:00
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showGoogleCalendar}
                    onChange={(e) => updateSettings({ showGoogleCalendar: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Mostra impegni Google Calendar in sola lettura nel calendario
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: CLAUDE */}
          {activeTab === 'claude' && (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-300">
                Permette di far leggere gli annunci di lavoro e compilare automaticamente i campi tramite un assistente esterno (Claude), senza AI invasiva o costi di API dentro l'app.
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-slate-900 dark:text-white block">
                  1. Esporta la coda per Claude
                </span>
                <p className="text-[11px] text-slate-500">
                  Scarica il file <code>coda-per-claude-AAAA-MM-GG.json</code> con tutte le candidature che richiedono compilazione o analisi.
                </p>
                <button
                  onClick={exportClaudeQueue}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Scarica coda JSON
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-slate-900 dark:text-white block">
                  2. Importa risultati di Claude
                </span>
                <textarea
                  rows={4}
                  placeholder="Incolla qui il JSON restituito da Claude con i campi compilati..."
                  value={claudeInputJson}
                  onChange={(e) => setClaudeInputJson(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                />
                <button
                  onClick={handleImportClaudeSubmit}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Importa risultati elaborati
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DATI & BACKUP */}
          {activeTab === 'dati' && (
            <div className="space-y-5">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white block">Esporta Backup JSON</span>
                  <p className="text-[11px] text-slate-500">Salva l'intero database di Intern Track in un file JSON.</p>
                  <button
                    onClick={exportDataJSON}
                    className="w-full py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
                  >
                    Esporta JSON
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white block">Esporta foglio CSV</span>
                  <p className="text-[11px] text-slate-500">Scarica solo le candidature in formato foglio di calcolo.</p>
                  <button
                    onClick={exportApplicationsCSV}
                    className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-white font-semibold"
                  >
                    Esporta CSV
                  </button>
                </div>
              </div>

              {/* Import JSON Form */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white block">Importa copia JSON</span>
                <textarea
                  rows={3}
                  placeholder="Incolla il contenuto di un backup JSON valido..."
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                />
                <button
                  onClick={handleImportJsonSubmit}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-semibold"
                >
                  Ripristina da JSON
                </button>
              </div>

              {/* Ripristina dati di esempio */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Dati di esempio</span>
                  <span className="text-[11px] text-slate-500">Ricarica le candidature e i dati dimostrativi di portfolio</span>
                </div>
                <button
                  onClick={resetSampleData}
                  className="px-3.5 py-1.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40 text-xs font-semibold"
                >
                  Ripristina
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">Intern Track v2.0 · Liquid Glass Architecture</span>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
          >
            Fatto
          </button>
        </div>

      </div>
    </div>
  );
};

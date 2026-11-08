import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  ExternalLink, 
  Check, 
  RotateCcw, 
  Plus, 
  Search, 
  Calendar, 
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Folder
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';
import { CareerSite } from '../types/internTrack';

export const CareerSitesView: React.FC = () => {
  const { 
    careerSites, 
    checkCareerSite, 
    postponeCareerSite, 
    addCareerSite, 
    showToast 
  } = useInternTrack();

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [siteSearch, setSiteSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New site form state
  const [newCompany, setNewCompany] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newSector, setNewSector] = useState('Fintech');
  const [newEvery, setNewEvery] = useState<1 | 2 | 3 | 6>(1);
  const [newNotes, setNewNotes] = useState('');

  const todayStr = '2026-10-28';

  // Filtered sites
  const filteredSites = useMemo(() => {
    return careerSites.filter(s => {
      if (!siteSearch.trim()) return true;
      const q = siteSearch.toLowerCase();
      return s.company.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
    });
  }, [careerSites, siteSearch]);

  // Sites due today
  const dueToday = filteredSites.filter(s => s.next <= todayStr);
  const upcomingSites = filteredSites.filter(s => s.next > todayStr);

  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim() || !newUrl.trim()) return;
    addCareerSite({
      company: newCompany.trim(),
      url: newUrl.trim(),
      every: newEvery,
      next: todayStr,
      sector: newSector,
      notes: newNotes.trim() || undefined,
    });
    setIsAddModalOpen(false);
    setNewCompany('');
    setNewUrl('');
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & SUMMARY
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white tracking-tight" style={{ fontWeight: 300 }}>
            Portali Carriere Aziendali
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {careerSites.length} aziende monitorate · Quota: 4 siti/giorno (giro completo in circa 7,2 settimane)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View toggle */}
          <div className="p-1 rounded-full bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl border border-white/60 dark:border-white/10 flex items-center shadow-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 px-3 rounded-full text-xs font-medium transition-all ${
                viewMode === 'cards' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />
              <span>Schede</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 px-3 rounded-full text-xs font-medium transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 inline mr-1" />
              <span>Tabella</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuovo sito</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SEARCH BAR
          ───────────────────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={siteSearch}
          onChange={(e) => setSiteSearch(e.target.value)}
          placeholder="Filtra per azienda o settore..."
          className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SEZIONE: OGGI DA CONTROLLARE
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Da controllare oggi ({dueToday.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Progresso: {careerSites.filter(s => s.last === todayStr).length} di {dueToday.length} verificati
          </span>
        </div>

        {dueToday.length === 0 ? (
          <div className="p-8 rounded-[28px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-white/10 text-center text-xs text-slate-400">
            Tutti i portali previsti per oggi sono stati controllati!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dueToday.map((site) => (
              <div
                key={site.id}
                className="p-5 rounded-[28px] bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {site.company}
                    </h3>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                      title="Apri pagina carriere"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <span className="inline-block text-[11px] font-medium text-slate-500 mb-2">
                    {site.sector} · Cadenza: ogni {site.every} {site.every === 1 ? 'mese' : 'mesi'}
                  </span>

                  {site.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                      {site.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => checkCareerSite(site.id)}
                    className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Controllato</span>
                  </button>
                  <button
                    onClick={() => postponeCareerSite(site.id, 3)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all"
                  >
                    Rimanda
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. PROSSIMI GIORNI IN ROTAZIONE
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
          Prossimi siti in coda ({upcomingSites.length})
        </h2>

        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingSites.map((site) => (
              <div
                key={site.id}
                className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xs flex items-center justify-between text-xs"
              >
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">{site.company}</h4>
                  <p className="text-[11px] text-slate-500">{site.sector}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 block font-semibold">
                    {site.next}
                  </span>
                  <a href={site.url} target="_blank" rel="noreferrer" className="text-[10px] text-slate-400 hover:text-blue-500 inline-flex items-center gap-0.5 mt-0.5">
                    Apri <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 font-mono text-[11px] text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Azienda</th>
                  <th className="py-3 px-4">Settore</th>
                  <th className="py-3 px-4">Cadenza</th>
                  <th className="py-3 px-4">Ultimo controllo</th>
                  <th className="py-3 px-4">Prossimo</th>
                  <th className="py-3 px-4 text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSites.map((site) => (
                  <tr key={site.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{site.company}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{site.sector}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{site.every}m</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{site.last || '—'}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{site.next}</td>
                    <td className="py-3 px-4 text-right">
                      <a href={site.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        Visita
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL NUOVO SITO
          ───────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-[28px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Aggiungi sito carriere da monitorare
            </h3>
            <form onSubmit={handleCreateSite} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Azienda *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Vinted, Mistral AI"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">URL pagina carriere *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Settore</label>
                  <input
                    type="text"
                    value={newSector}
                    onChange={(e) => setNewSector(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Cadenza controllo</label>
                  <select
                    value={newEvery}
                    onChange={(e) => setNewEvery(parseInt(e.target.value) as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value={1}>Ogni mese</option>
                    <option value={2}>Ogni 2 mesi</option>
                    <option value={3}>Ogni 3 mesi</option>
                    <option value={6}>Ogni 6 mesi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Note / Ruoli cercati</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium shadow-sm"
                >
                  Aggiungi al monitoraggio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { HubCodaItem } from '../data/mockupData';

export interface DailyScoutingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: HubCodaItem[];
  recipientEmail: string;
  onSendTaskToGoogleTasks: (title: string, notes?: string, due?: string) => void;
  showToast: (msg: string) => void;
}

export const DailyScoutingReportModal: React.FC<DailyScoutingReportModalProps> = ({
  isOpen,
  onClose,
  items,
  recipientEmail,
  onSendTaskToGoogleTasks,
  showToast,
}) => {
  const [targetEmail, setTargetEmail] = useState(recipientEmail || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'Azienda' | 'Startup' | 'Venture'>('all');

  if (!isOpen) return null;

  // Prendi i primi 10 item per il report
  const reportItems = (filterCategory === 'all' ? items : items.filter(x => x.categoria === filterCategory)).slice(0, 10);

  const handleCopyNote = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('✓ Nota di connessione LinkedIn copiata negli appunti!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendEmailReport = () => {
    // Costruisci il corpo del testo dell'email formattato nel dettaglio
    const subject = encodeURIComponent(`Scouting Report InternTrack: 10 Aziende Target & Contatti Chiave LinkedIn`);
    
    let bodyText = `REPORT SCOUTING CANDIDATURE & NETWORKING LINKEDIN\n`;
    bodyText += `Data: ${new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    bodyText += `Destinatario: ${targetEmail}\n`;
    bodyText += `Numero Aziende Profilate: ${reportItems.length}\n`;
    bodyText += `======================================================\n\n`;

    reportItems.forEach((item, index) => {
      bodyText += `${index + 1}. ${item.company.toUpperCase()} (${item.settore} - ${item.country})\n`;
      bodyText += `   🏢 DESCRIZIONE AZIENDA: ${item.descrizioneAzienda}\n`;
      bodyText += `   🔗 LINKEDIN AZIENDA: ${item.linkedinAzienda}\n\n`;
      bodyText += `   👤 CONTATTO CHIAVE: ${item.name} (${item.role})\n`;
      bodyText += `   🎯 PROFILO E MOTIVO CONTATTO: ${item.motivo}\n`;
      bodyText += `   🔗 LINKEDIN PERSONA: ${item.linkedinSearchUrl}\n\n`;
      bodyText += `   💬 NOTA DI CONNESSIONE SUGGERITA:\n   "${item.notaConnessione}"\n`;
      bodyText += `------------------------------------------------------\n\n`;
    });

    bodyText += `Generato automaticamente dal tuo InternTrack Workspace Hub.\n`;

    // Apri client email nativo / Gmail web composer
    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    window.open(mailtoUrl, '_blank');
    showToast(`📧 Report aperto nel client di posta per ${targetEmail}!`);
  };

  const handleCopyEntireReport = () => {
    let fullReport = `REPORT SCOUTING INTERNTRACK: 10 AZIENDE E CONTATTI LINKEDIN\n\n`;
    reportItems.forEach((item, i) => {
      fullReport += `${i + 1}. ${item.company} | ${item.settore}\n`;
      fullReport += `Descrizione Azienda: ${item.descrizioneAzienda}\n`;
      fullReport += `LinkedIn Azienda: ${item.linkedinAzienda}\n`;
      fullReport += `Persona Chiave: ${item.name} - ${item.role}\n`;
      fullReport += `Descrizione Persona: ${item.motivo}\n`;
      fullReport += `LinkedIn Persona: ${item.linkedinSearchUrl}\n`;
      fullReport += `Nota di Connessione: "${item.notaConnessione}"\n\n`;
    });
    navigator.clipboard.writeText(fullReport);
    showToast('✓ Intero report delle 10 aziende copiato negli appunti!');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scouting-modal-title"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎯</span>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                Report Scouting Approfondito
              </span>
            </div>
            <h2 id="scouting-modal-title" className="text-xl font-bold text-white">
              10 Aziende Target &amp; Contatti Chiave LinkedIn
            </h2>
            <p className="text-xs text-blue-100 mt-1">
              Ogni azienda include descrizione dettagliata, link LinkedIn aziendale, profilo del contatto chiave e link LinkedIn personale con messaggio pronto.
            </p>
          </div>

          <button
            onClick={onClose}
            className="self-end sm:self-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        {/* Action Controls & Email Dispatcher Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Email input & Dispatch */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Invia a:</span>
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="Inserisci la tua email..."
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs w-56"
            />
            <button
              onClick={handleSendEmailReport}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <span>📧 Invia Report via Email</span>
            </button>
            <button
              onClick={handleCopyEntireReport}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
            >
              <span>📋 Copia Testo Completo</span>
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Filtra:</span>
            {(['all', 'Startup', 'Azienda', 'Venture'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filterCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat === 'all' ? 'Tutte (10)' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* 10 Companies and Contacts List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {reportItems.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 transition-all hover:border-blue-400 dark:hover:border-blue-500"
            >
              {/* Header: Company & Contact summary */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {item.company}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10.5px] font-semibold">
                        {item.categoria}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {item.settore} · {item.country}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2">
                  <a
                    href={item.linkedinAzienda}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-semibold text-[11px] flex items-center gap-1.5 hover:bg-sky-100 dark:hover:bg-sky-900 transition-all"
                  >
                    <span>🏢 LinkedIn Azienda ↗</span>
                  </a>
                  <button
                    onClick={() =>
                      onSendTaskToGoogleTasks(
                        `Contattare ${item.name} (${item.company})`,
                        `Ruolo: ${item.role}. LinkedIn: ${item.linkedinSearchUrl}`,
                        'Oggi'
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer"
                    title="Invia come attività sul telefono"
                  >
                    <span>📱 Invia a Google Tasks</span>
                  </button>
                </div>
              </div>

              {/* Company Description Box */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                  Descrizione Azienda &amp; Business Model:
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-xs">
                  {item.descrizioneAzienda}
                </p>
              </div>

              {/* Decision Maker & Contact Person Box */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">👤</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {item.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700">
                      {item.role}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">
                    💡 <b>Profilo &amp; Motivo:</b> {item.motivo}
                  </p>
                </div>

                <a
                  href={item.linkedinSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all"
                >
                  <span>🔗 LinkedIn Profilo ↗</span>
                </a>
              </div>

              {/* Personalized Connection Note */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-[11.5px]">
                <div className="min-w-0 flex-1">
                  <span className="text-slate-500 font-medium block text-[10.5px]">
                    Messaggio di connessione pronto da inviare:
                  </span>
                  <span className="italic text-slate-700 dark:text-slate-300 truncate block">
                    "{item.notaConnessione}"
                  </span>
                </div>
                <button
                  onClick={() => handleCopyNote(item.notaConnessione, item.id)}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold text-[11px] hover:bg-slate-50 dark:hover:bg-slate-600 shrink-0 cursor-pointer transition-all"
                >
                  {copiedId === item.id ? '✓ Copiato!' : 'Copia Nota'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-slate-500 text-xs">
            Mostrate <strong>{reportItems.length}</strong> aziende con profili e link verificati
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs cursor-pointer shadow-xs"
          >
            Chiudi Report
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Bookmark, Copy, Check, Sparkles, ShieldCheck, AlertTriangle, Chrome, ArrowRight, Zap, FileText } from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';

interface BookmarkletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookmarkletModal: React.FC<BookmarkletModalProps> = ({ isOpen, onClose }) => {
  const { showToast, setIsNewAppModalOpen } = useInternTrack();
  const [activeTab, setActiveTab] = useState<'fast' | 'extension' | 'bookmarklet'>('extension');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Base URL of the app
  const appOrigin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('null') && window.location.origin.startsWith('http')
    ? window.location.origin
    : 'https://YOUR-APP.vercel.app';

  // JavaScript code of the bookmarklet
  const bookmarkletCode = `javascript:(function(){try{var u=window.location.href;var el=document.querySelector('#job-details')||document.querySelector('.jobs-search__job-details')||document.querySelector('.jobs-description')||document.querySelector('.job-details-jobs-unified-top-card')||document.querySelector('.jobs-box__html-content')||document.querySelector('main')||document.body;var txt=el?el.innerText.replace(/\\s+/g,' ').trim():'';try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt.slice(0,6000));}}catch(e){}var base='${appOrigin}';var cleanUrl=u.split('&trackingId=')[0].split('&refId=')[0];var target=base+'/?action=new_job&import_url='+encodeURIComponent(cleanUrl)+'&import_text='+encodeURIComponent(txt.slice(0,1400));window.open(target,'_blank');}catch(err){alert('Errore segnalibro: '+err.message);}})();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    showToast('Codice segnalibro copiato negli appunti!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenAiModal = () => {
    onClose();
    setIsNewAppModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="max-w-xl w-full my-auto rounded-[28px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Importazione Annunci LinkedIn & Web</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Come importare qualsiasi annuncio con estrazione automatica di dati e logo aziendale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Why LinkedIn blocks bookmarklets callout */}
        <div className="px-5 sm:px-6 pt-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Perché su LinkedIn non succede nulla cliccando il segnalibro?</strong>
              <p className="mt-1 text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                LinkedIn applica una rigida protezione di sicurezza del browser (<strong>CSP - Content Security Policy</strong>) che blocca all'origine qualsiasi segnalibro JavaScript. Inoltre, per ragioni di sicurezza e privacy del tuo computer, nessun server esterno o IA può telecomandare il tuo Chrome locale dall'esterno.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 sm:px-6 pt-4">
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('fast')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'fast'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Consigliato (3 sec)</span>
            </button>
            <button
              onClick={() => setActiveTab('extension')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'extension'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Chrome className="w-3.5 h-3.5 text-blue-500" />
              <span>Estensione Chrome 1-Clic</span>
            </button>
            <button
              onClick={() => setActiveTab('bookmarklet')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'bookmarklet'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Segnalibro Web</span>
            </button>
          </div>
        </div>

        {/* Content depending on Tab */}
        <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-600 dark:text-slate-300">

          {activeTab === 'fast' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50/50 dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-800/80 border border-blue-200 dark:border-blue-900/40 space-y-3">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                  Il metodo più veloce, affidabile e senza installazioni (3 secondi):
                </span>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                    <p className="text-[11px] leading-relaxed">
                      Su <strong>LinkedIn</strong>, seleziona e copia (<kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Ctrl + C</kbd>) il testo dell'annuncio o della job description.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                    <p className="text-[11px] leading-relaxed">
                      In <strong>Intern Track</strong>, apri il modulo nuova candidatura e incolla (<kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Ctrl + V</kbd>) nel riquadro AI.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                    <p className="text-[11px] leading-relaxed">
                      Clicca <strong>"Estrai con Gemini AI"</strong>: compila automaticamente tutti i 15 campi (ruolo, azienda, città, stipendio, note) e recupera il <strong>logo ufficiale dell'azienda</strong> con il badge LinkedIn!
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleOpenAiModal}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Apri subito il modulo di inserimento AI</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-start gap-2.5 text-[11px] text-emerald-900 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero rischi di ban o blocchi:</strong> Non utilizza bot o scraping server-side che potrebbero allarmare i sistemi di controllo di LinkedIn.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'extension' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Download Hero Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wide uppercase">
                      Pronta all'uso
                    </span>
                    <span className="text-[11px] text-blue-100">Bypassa la protezione di LinkedIn al 100%</span>
                  </div>
                  <Chrome className="w-5 h-5 text-blue-200" />
                </div>
                
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-snug">
                    Estensione 1-Clic Chrome per LinkedIn
                  </h3>
                  <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                    Scarica il pacchetto ZIP già configurato con l'indirizzo della tua applicazione.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    try {
                      const { downloadExtensionZip } = await import('../utils/downloadExtension');
                      await downloadExtensionZip(appOrigin);
                      showToast('Archivio zip scaricato! Estrailo e caricalo in Chrome', 'success');
                    } catch (e: any) {
                      showToast('Errore durante il download: ' + e.message, 'warning');
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>📥 Scarica Estensione (.zip) per Chrome</span>
                </button>
              </div>

              {/* 3 Steps Guide */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                  Come attivarla in 30 secondi:
                </span>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white block text-[11px]">Estrai il file ZIP</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Fai clic destro sul file scaricato <code>intern-track-extension.zip</code> e scegli <strong>"Estrai tutto"</strong> in una cartella a piacere (es. sul Desktop o in Download).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white block text-[11px]">Apri le estensioni di Chrome</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Nella barra di Chrome digita <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">chrome://extensions</kbd> e attiva la levetta in alto a destra <strong>"Modalità sviluppatore"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white block text-[11px]">Carica la cartella</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Clicca in alto a sinistra su <strong>"Carica estensione non pacchettizzata"</strong> (Load unpacked) e seleziona la cartella estratta.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-start gap-2.5 text-[11px] text-emerald-900 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Come provarla subito:</strong> Vai su LinkedIn su un qualsiasi annuncio di lavoro, clicca l'icona di Intern Track in alto a destra su Chrome e premi <strong>"✦ Invia a Intern Track"</strong>.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'bookmarklet' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-slate-900 dark:text-white block">
                  Segnalibro per portali generici (Indeed, Glassdoor, Career page aziendali):
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sui siti aziendali e portali che non hanno la CSP di LinkedIn, il segnalibro funziona normalmente leggendo il testo della pagina:
                </p>

                <div className="py-2 flex justify-center">
                  <a
                    href={bookmarkletCode}
                    onClick={(e) => {
                      e.preventDefault();
                      showToast('Trascina questo pulsante nella barra dei preferiti di Chrome!', 'info');
                    }}
                    title="Trascina nella barra dei preferiti"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md cursor-grab active:cursor-grabbing hover:scale-105 transition-transform select-none"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>✦ Invia a Intern Track</span>
                  </a>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500">Oppure copia il codice:</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copiato' : 'Copia'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={handleOpenAiModal}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Inserisci annuncio con Gemini AI</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium text-xs transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};


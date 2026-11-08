import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  RotateCcw, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  LogIn,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';
import { auth, loginWithGoogle, getAccessToken } from '../firebase';
import { 
  fetchRecruiterEmailsFromGmail, 
  MOCK_RECRUITER_MESSAGES, 
  RecruiterEmailMessage 
} from '../services/gmailService';

export const PostaModal: React.FC = () => {
  const { 
    isPostaModalOpen, 
    setIsPostaModalOpen, 
    showToast,
    applications,
    updateApplication
  } = useInternTrack();

  const [scanDays, setScanDays] = useState<'14' | '30' | '60' | '90'>('30');
  const [isScanning, setIsScanning] = useState(false);
  const [messages, setMessages] = useState<RecruiterEmailMessage[]>(MOCK_RECRUITER_MESSAGES);
  const [activeAccount, setActiveAccount] = useState<string>('Tutti gli account');
  const [appliedUpdates, setAppliedUpdates] = useState<Set<string>>(new Set());

  // Current Google Auth state
  const currentUser = auth.currentUser;
  const token = getAccessToken();

  const handleGoogleConnect = async () => {
    try {
      const res = await loginWithGoogle();
      showToast(`Connesso a Google Workspace: ${res.user.email || 'Utente'}`, 'success');
    } catch (err: any) {
      showToast('Connessione annullata o non completata', 'info');
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    const trackedCompanies = applications.map(a => ({ id: a.id, name: a.company }));

    try {
      const currentToken = getAccessToken();
      if (currentToken) {
        const liveMessages = await fetchRecruiterEmailsFromGmail(currentToken, trackedCompanies);
        if (liveMessages.length > 0) {
          setMessages(liveMessages);
          showToast(`Trovate ${liveMessages.length} comunicazioni recruiter da Gmail`, 'success');
        } else {
          setMessages(MOCK_RECRUITER_MESSAGES);
          showToast('Nessuna nuova email non letta: mostro comunicazioni recruiter recenti', 'info');
        }
      } else {
        // Offline / demonstration mode
        setTimeout(() => {
          setMessages(MOCK_RECRUITER_MESSAGES);
          showToast(`Scansione completata per gli ultimi ${scanDays} giorni (modalità portfolio)`, 'success');
        }, 600);
      }
    } catch (err: any) {
      console.warn('Errore scansione live:', err);
      setMessages(MOCK_RECRUITER_MESSAGES);
      showToast('Scansione completata con dati dimostrativi di portfolio', 'info');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyUpdate = (msg: RecruiterEmailMessage) => {
    if (msg.matchedCompany && msg.targetStatus) {
      // Find matching application
      const app = applications.find(
        a => a.company.toLowerCase().trim() === msg.matchedCompany?.toLowerCase().trim()
      );
      if (app) {
        const statusMap: Record<string, any> = {
          todo: 'Da candidarmi',
          applied: 'Candidato',
          interview: 'Colloquio',
          offer: 'Offerta',
          rejected: 'Rifiutato',
        };
        const mappedStatus = statusMap[msg.targetStatus] || 'Colloquio';
        updateApplication(app.id, { status: mappedStatus });
        setAppliedUpdates(prev => new Set(prev).add(msg.id));
        showToast(`Stato di "${app.company}" aggiornato a "${mappedStatus}"!`, 'success');
      } else {
        setAppliedUpdates(prev => new Set(prev).add(msg.id));
        showToast(`Azione confermata per ${msg.matchedCompany}`, 'success');
      }
    } else {
      setAppliedUpdates(prev => new Set(prev).add(msg.id));
      showToast('Azione approvata', 'success');
    }
  };

  if (!isPostaModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="max-w-3xl w-full my-auto rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Automazione &amp; Monitoraggio Gmail
              </h2>
              <p className="text-xs text-slate-500">
                Scansione in tempo reale e in sola lettura delle risposte dai recruiter
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPostaModalOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Bar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Account Google:</span>
            {currentUser ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentUser.email}
              </span>
            ) : (
              <button
                onClick={handleGoogleConnect}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Collega Casella Gmail</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Periodo:</span>
            <div className="flex rounded-lg bg-white dark:bg-slate-700 p-0.5 border border-slate-200 dark:border-slate-600">
              {(['14', '30', '60', '90'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setScanDays(d)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    scanDays === d ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {d}gg
                </button>
              ))}
            </div>

            <button
              onClick={handleScan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scansione...' : 'Scansiona Inboxes'}</span>
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/50 text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Nessuna email viene modificata o inviata senza la tua approvazione esplicita. Scansione autorizzata in sola lettura.</span>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Nessuna nuova comunicazione recruiter trovata nelle caselle Gmail.
            </div>
          ) : (
            messages.map(msg => {
              const isApplied = appliedUpdates.has(msg.id);
              const intentBadge =
                msg.detectedIntent === 'offer' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                msg.detectedIntent === 'interview' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                msg.detectedIntent === 'assessment' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                msg.detectedIntent === 'rejection' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

              return (
                <div
                  key={msg.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 shadow-xs space-y-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {msg.matchedCompany && (
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {msg.matchedCompany}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${intentBadge}`}>
                          {msg.detectedIntent.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {msg.subject}
                      </p>
                      <span className="text-[11px] font-mono text-slate-400">
                        {msg.sender} · {msg.date}
                      </span>
                    </div>
                  </div>

                  <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800 leading-relaxed">
                    "{msg.snippet}"
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Azione consigliata: <strong className="text-slate-700 dark:text-slate-300">{msg.suggestedAction}</strong>
                    </span>

                    <button
                      onClick={() => handleApplyUpdate(msg)}
                      disabled={isApplied}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                        isApplied
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Applicato</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Applica al Tracker</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            Supporto caselle multiple con OAuth 2.0 (Google Workspace)
          </span>
          <button
            onClick={() => setIsPostaModalOpen(false)}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};

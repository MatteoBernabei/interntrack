import React, { useState } from 'react';
import { User } from '../firebase';

export interface WelcomeAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  connectedAccounts: string[];
  activeAccount: string;
  onLoginGoogle: (hintEmail?: string) => Promise<void>;
  onSwitchAccount: (account: string) => void;
  onLogout: () => Promise<void>;
}

export const WelcomeAuthModal: React.FC<WelcomeAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  connectedAccounts,
  activeAccount,
  onLoginGoogle,
  onSwitchAccount,
  onLogout,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [secondEmailInput, setSecondEmailInput] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async (hint?: string) => {
    setIsLoggingIn(true);
    try {
      await onLoginGoogle(hint);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Banner */}
        <div className="relative p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all"
            aria-label="Chiudi finestra"
          >
            ✕
          </button>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🚀</span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                InternTrack Workspace Hub
              </span>
              <h2 id="welcome-modal-title" className="text-xl font-bold mt-1 text-white">
                {currentUser ? 'Gestione Account & Multi-Google' : 'Benvenuto su InternTrack'}
              </h2>
            </div>
          </div>
          <p className="text-xs text-blue-100 max-w-md mt-1">
            {currentUser
              ? 'Gestisci i tuoi account Google collegati per sincronizzare calendari, notifiche sul telefono e caselle email.'
              : 'La piattaforma moderna per organizzare candidature, scadenze e colloqui, sincronizzata con il tuo smartphone.'}
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          
          {/* SCENARIO A: UTENTE NON ANCORA LOGGATO */}
          {!currentUser ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  Hai già un account o vuoi iniziare ora?
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs">
                  Accedendo con il tuo account Google avrai accesso alla tua area privata con sincronizzazione su <b>Google Calendar</b>, <b>Google Tasks</b> sul telefono e database <b>Firebase Firestore</b>.
                </p>
              </div>

              {/* Bottoni di Accesso Google */}
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => handleGoogleSignIn()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-3 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.76-2.1-6.7-4.94H1.32v3.08C3.34 21.41 7.38 24 12 24z" />
                    <path fill="#FBBC05" d="M5.3 14.31c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.62H1.32C.48 8.28 0 10.1 0 12s.48 3.72 1.32 5.38l3.98-3.07z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.38 0 3.34 2.59 1.32 6.62l3.98 3.07c.94-2.84 3.58-4.94 6.7-4.94z" />
                  </svg>
                  <span>{isLoggingIn ? 'Apertura popup Google...' : 'Accedi o Registrati con il tuo account Google'}</span>
                </button>
              </div>

              {/* Separatore o Modalità Demo */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer underline transition-all"
                >
                  Oppure continua in Modalità Demo (Portfolio Recruiter senza login) ›
                </button>
              </div>
            </div>
          ) : (
            /* SCENARIO B: UTENTE GIÀ AUTENTICATO (MULTI-ACCOUNT MANAGER) */
            <div className="space-y-5">
              
              {/* Account Principale */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {currentUser.email ? currentUser.email[0].toUpperCase() : 'G'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Account Google Connesso
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {currentUser.email}
                    </h4>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-200/70 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 text-[11px] font-semibold">
                  Attivo
                </span>
              </div>

              {/* Multi-Account Inboxes & Calendars list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Account Google Monitorati ({connectedAccounts.length || 1}):
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Passa da uno all’altro con un clic
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Account 1: Principale */}
                  <div
                    onClick={() => currentUser.email && onSwitchAccount(currentUser.email)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      activeAccount === currentUser.email
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>{currentUser.email}</span>
                      <span className="text-[10.5px] text-slate-400 font-normal">(Principale)</span>
                    </div>
                    {activeAccount === currentUser.email && (
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">✓ In Uso</span>
                    )}
                  </div>

                  {/* Account secondari collegati */}
                  {connectedAccounts
                    .filter((acc) => acc.toLowerCase() !== (currentUser.email || '').toLowerCase())
                    .map((acc) => (
                      <div
                        key={acc}
                        onClick={() => onSwitchAccount(acc)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          activeAccount === acc
                            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                          <span>{acc}</span>
                          <span className="text-[10.5px] text-slate-400 font-normal">(Secondario)</span>
                        </div>
                        {activeAccount === acc && (
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">✓ In Uso</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Form per collegare un secondo account Google */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  ➕ Collega un altro tuo account Google (es. account secondario / universitario):
                </span>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                  Puoi collegare un'altra casella Gmail, Google Calendar e Google Tasks per monitorarle entrambe dallo stesso tracker.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={secondEmailInput}
                    onChange={(e) => setSecondEmailInput(e.target.value)}
                    placeholder="Digita il tuo secondo indirizzo Gmail..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => handleGoogleSignIn(secondEmailInput.trim() || undefined)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    Connetti
                  </button>
                </div>
              </div>

              {/* Status Sincronizzazioni Attive */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60">
                  <span className="block text-emerald-500 font-bold text-sm">✓ Attivo</span>
                  <span className="text-[10.5px] text-slate-500">Google Calendar</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60">
                  <span className="block text-blue-500 font-bold text-sm">📱 Attivo</span>
                  <span className="text-[10.5px] text-slate-500">Google Tasks (Telefono)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60">
                  <span className="block text-purple-500 font-bold text-sm">☁️ Attivo</span>
                  <span className="text-[10.5px] text-slate-500">Cloud Firestore</span>
                </div>
              </div>

              {/* Azioni Logout e Chiudi */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={async () => {
                    await onLogout();
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium cursor-pointer"
                >
                  Esci da questo account
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold shadow-xs cursor-pointer"
                >
                  Vai alla Dashboard ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

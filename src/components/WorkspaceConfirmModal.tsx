import React from 'react';

export interface WorkspaceConfirmDetail {
  label: string;
  value: string;
}

export interface WorkspaceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  service: 'tasks' | 'calendar';
  title: string;
  subtitle?: string;
  account: string;
  details: WorkspaceConfirmDetail[];
  isSubmitting?: boolean;
}

export const WorkspaceConfirmModal: React.FC<WorkspaceConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  service,
  title,
  subtitle,
  account,
  details,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header with Service Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                service === 'tasks'
                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {service === 'tasks' ? '📱' : '📅'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {service === 'tasks' ? 'Google Tasks (Smartphone)' : 'Google Calendar'}
                </span>
              </div>
              <h3
                id="confirm-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white mt-1"
              >
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {subtitle && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
            {subtitle}
          </p>
        )}

        {/* Account indicator */}
        <div className="mb-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs flex items-center justify-between">
          <span className="text-slate-500 font-medium">Account di destinazione:</span>
          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
            {account}
          </span>
        </div>

        {/* Details List */}
        <div className="space-y-2 mb-6 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-xs">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between items-start gap-3 py-1 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 shrink-0 font-medium">{d.label}:</span>
              <span className="text-slate-900 dark:text-slate-100 font-medium text-right break-words">
                {d.value}
              </span>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-[11.5px] mb-5 flex items-center gap-2">
          <span>ℹ️</span>
          <span>
            {service === 'tasks'
              ? 'L’attività verrà sincronizzata istantaneamente con l’app Google Tasks sul tuo smartphone.'
              : 'L’evento verrà inserito nel tuo Google Calendar con data e orario selezionati.'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md flex items-center gap-2 cursor-pointer ${
              service === 'tasks'
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Invio in corso...</span>
              </>
            ) : (
              <>
                <span>✓ Conferma e Invia</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

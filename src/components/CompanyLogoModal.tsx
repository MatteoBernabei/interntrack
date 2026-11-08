import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Trash2, Check, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ini, grad } from '../data/mockupData';

interface CompanyLogoModalProps {
  isOpen: boolean;
  companyName: string;
  currentLogoUrl?: string;
  allUsedLogos: { company: string; logoUrl: string }[];
  onSaveLogo: (company: string, logoUrl: string) => void;
  onRemoveLogo: (company: string) => void;
  onClose: () => void;
}

export const CompanyLogoModal: React.FC<CompanyLogoModalProps> = ({
  isOpen,
  companyName,
  currentLogoUrl = '',
  allUsedLogos,
  onSaveLogo,
  onRemoveLogo,
  onClose,
}) => {
  const [selectedUrl, setSelectedUrl] = useState<string>(currentLogoUrl);
  const [urlInput, setUrlInput] = useState<string>(currentLogoUrl.startsWith('data:') ? '' : currentLogoUrl);
  const [previewError, setPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const initials = ini(companyName) || 'EL';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSelectedUrl(result);
        setPreviewError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlApply = () => {
    if (urlInput.trim()) {
      setSelectedUrl(urlInput.trim());
      setPreviewError(false);
    }
  };

  const handleSave = () => {
    if (selectedUrl.trim()) {
      onSaveLogo(companyName, selectedUrl.trim());
    } else {
      onRemoveLogo(companyName);
    }
    onClose();
  };

  const handleRemove = () => {
    onRemoveLogo(companyName);
    onClose();
  };

  // Filter unique logos already in database
  const uniqueUsedLogos = Array.from(
    new Map(allUsedLogos.filter((l) => l.logoUrl && l.company !== companyName).map((item) => [item.logoUrl, item])).values()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="max-w-lg w-full my-auto rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Personalizza Logo Azienda
              </h3>
              <p className="text-xs text-slate-500">
                Imposta o carica la foto per <strong className="text-slate-800 dark:text-slate-200">{companyName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-4">
            <div className="relative shrink-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-md overflow-hidden"
                style={{ background: grad(companyName) }}
              >
                {initials}
                {selectedUrl && !previewError && (
                  <img
                    src={selectedUrl}
                    alt={companyName}
                    className="w-full h-full object-contain p-1.5 bg-white dark:bg-slate-900"
                    onError={() => setPreviewError(true)}
                  />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{companyName}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedUrl && !previewError
                  ? 'Foto personalizzata selezionata. Verrà usata su tutte le schede di questa azienda.'
                  : `Nessuna foto nel database: viene mostrata la sigla "${initials}" con tasto +.`}
              </p>
            </div>
          </div>

          {/* Option 1: Upload from local file */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Carica foto dal tuo dispositivo</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Scegli immagine da PC / Telefono (PNG, JPG, SVG)</span>
            </button>
          </div>

          {/* Option 2: Image URL */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-indigo-600" />
              <span>Oppure incolla il link diretto dell'immagine</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://example.com/logo.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleUrlApply}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Applica
              </button>
            </div>
          </div>

          {/* Option 3: Already used in database */}
          {uniqueUsedLogos.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Foto già usate nel database</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1">
                {uniqueUsedLogos.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedUrl(item.logoUrl);
                      setPreviewError(false);
                    }}
                    title={item.company}
                    className={`h-12 rounded-xl border p-1 bg-white dark:bg-slate-800 flex items-center justify-center transition-all ${
                      selectedUrl === item.logoUrl
                        ? 'border-blue-600 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <img src={item.logoUrl} alt={item.company} className="max-h-full max-w-full object-contain" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            {currentLogoUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Rimuovi foto</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Salva Logo Azienda</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Building2, Wand2, Loader2, Bookmark } from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';
import { ApplicationStatus, JobKind, ContractType, WorkMode, PriorityLevel, PlatformName } from '../types/internTrack';
import { CompanyLogo } from './CompanyLogo';

// Helper to detect platform from URL
const detectPlatformFromUrl = (targetUrl: string): PlatformName => {
  const u = targetUrl.toLowerCase();
  if (u.includes('linkedin.com')) return 'LinkedIn';
  if (u.includes('indeed.')) return 'Indeed';
  if (u.includes('joinrs.com')) return 'Joinrs';
  if (u.includes('careeros.')) return 'CareerOS';
  if (u.includes('flexa.careers')) return 'Flexa';
  return 'Sito aziendale';
};

export const NewApplicationModal: React.FC = () => {
  const { 
    isNewAppModalOpen, 
    setIsNewAppModalOpen, 
    addApplication, 
    showToast,
    setIsBookmarkletModalOpen 
  } = useInternTrack();

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [city, setCity] = useState('Milano');
  const [country, setCountry] = useState('IT');
  const [kind, setKind] = useState<JobKind>('Lavoro');
  const [contract, setContract] = useState<ContractType>('Indeterminato');
  const [workMode, setWorkMode] = useState<WorkMode>('Ibrido');
  const [salary, setSalary] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Da candidarmi');
  const [priority, setPriority] = useState<PriorityLevel>('Alta');
  const [platform, setPlatform] = useState<PlatformName>('LinkedIn');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [notes, setNotes] = useState('');
  const [grp, setGrp] = useState<'Business Development e Growth' | 'Founder Associate' | 'Growth' | 'Strategia e analisi' | 'Altro'>('Founder Associate');
  const [companyDomain, setCompanyDomain] = useState('');

  // AI parsing state
  const [jobTextToParse, setJobTextToParse] = useState('');
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [showAiBox, setShowAiBox] = useState(false);
  const [aiWarningMessage, setAiWarningMessage] = useState<string | null>(null);

  // Consume deep-link / bookmarklet imported data if available
  useEffect(() => {
    if (isNewAppModalOpen) {
      try {
        const pending = sessionStorage.getItem('pending_job_import');
        if (pending) {
          sessionStorage.removeItem('pending_job_import');
          const { url: pUrl, text: pText } = JSON.parse(pending);
          if (pUrl) {
            setUrl(pUrl);
            setPlatform(detectPlatformFromUrl(pUrl));
          }
          const rawContent = pText || pUrl || '';
          if (rawContent) {
            setJobTextToParse(rawContent);
            setShowAiBox(true);
            // Automatically launch Gemini AI extraction with zero clicks required
            setTimeout(() => {
              handleAiParse(rawContent, pUrl || '');
            }, 100);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, [isNewAppModalOpen]);

  if (!isNewAppModalOpen) return null;

  const handleAiParse = async (overrideInput?: string, overrideUrl?: string) => {
    const input = (overrideInput !== undefined ? overrideInput : jobTextToParse).trim();
    if (!input) {
      showToast('Incolla il link dell\'annuncio o il testo della job description', 'info');
      return;
    }

    setAiWarningMessage(null);
    setIsParsingAI(true);
    const isUrl = input.startsWith('http://') || input.startsWith('https://') || (!input.includes(' ') && input.includes('.com/'));

    const effectiveUrl = overrideUrl || (isUrl ? input : (url || ''));
    if (effectiveUrl) {
      setUrl(effectiveUrl);
      setPlatform(detectPlatformFromUrl(effectiveUrl));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('/api/ai/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ 
          text: isUrl ? '' : input,
          url: effectiveUrl
        })
      });
      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.requiresManualText) {
        setAiWarningMessage(data.message || 'Questo link richiede login. Copia e incolla il testo dell\'annuncio per estrarre tutti i campi.');
        showToast('Link protetto da login: incolla il testo per compilare tutti i campi', 'warning');
        return;
      }

      if (data.ok && data.data) {
        const d = data.data;
        if (d.company) setCompany(d.company);
        if (d.companyDomain) setCompanyDomain(d.companyDomain);
        if (d.role) setRole(d.role);
        if (d.city) setCity(d.city);
        if (d.country) setCountry(d.country);
        if (d.salary) setSalary(d.salary);
        if (d.deadline) setDeadline(d.deadline);
        if (d.workMode) setWorkMode(d.workMode as any);
        if (d.kind) setKind(d.kind as any);
        if (d.contract) setContract(d.contract as any);
        if (d.grp) setGrp(d.grp as any);
        if (d.priority) setPriority(d.priority as any);
        if (d.description) setDescription(d.description);
        if (d.requirements) setRequirements(d.requirements);
        if (d.platform) {
          const matchedPlatform: PlatformName = ['LinkedIn', 'Indeed', 'Joinrs', 'CareerOS', 'Flexa', 'Sito aziendale', 'Altro'].includes(d.platform) 
            ? (d.platform as PlatformName) 
            : detectPlatformFromUrl(input);
          setPlatform(matchedPlatform);
        }
        if (data.detectedUrl) {
          setUrl(data.detectedUrl);
        }
        if (d.keyAdvice || d.description) {
          setNotes(`Punti chiave annuncio:\n${d.description || ''}${d.keyAdvice ? `\n\nConsiglio strategico AI per il tuo profilo:\n${d.keyAdvice}` : ''}`);
        }
        showToast('✨ Scheda compilata automaticamente con Gemini AI!', 'success');
        setShowAiBox(false);
      } else {
        showToast('Impossibile estrarre automaticamente i campi', 'warning');
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') {
        showToast('Tempo di attesa scaduto (15s). Riprova.', 'warning');
      } else {
        showToast('Errore durante l\'analisi AI', 'warning');
      }
    } finally {
      setIsParsingAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    addApplication({
      company: company.trim(),
      companyDomain: companyDomain.trim() || undefined,
      role: role.trim(),
      location: `${city}, ${country}`,
      city,
      country,
      kind,
      contract,
      workMode,
      salary: salary.trim() || undefined,
      deadline: deadline || undefined,
      description: description.trim() || undefined,
      requirements: requirements.trim() || undefined,
      status,
      priority,
      platform,
      url: url.trim() || undefined,
      notes: notes.trim(),
      grp,
      interviews: [],
      appliedAt: status === 'Candidato' ? new Date().toISOString().split('T')[0] : undefined,
    });

    setIsNewAppModalOpen(false);
    setCompany('');
    setCompanyDomain('');
    setRole('');
    setDescription('');
    setRequirements('');
    setSalary('');
    setDeadline('');
    setUrl('');
    setNotes('');
    setJobTextToParse('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-md overflow-y-auto">
      <div className="max-w-xl w-full my-auto rounded-[32px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_25px_80px_rgba(20,60,120,0.18),0_1px_2px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_25px_80px_rgba(0,0,0,0.6),0_1px_2px_rgba(255,255,255,0.1)_inset] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/70 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#1890ff] text-white flex items-center justify-center shadow-xs">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Nuova Candidatura
              </h2>
              <p className="text-xs text-slate-500">
                Inserimento manuale o estrazione rapida con Gemini AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiBox(!showAiBox)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/60 text-[#1890ff] dark:text-[#69b1ff] border border-blue-200/60 dark:border-blue-900/40 text-xs font-semibold hover:bg-blue-100 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1890ff]" />
              <span>{showAiBox ? 'Chiudi AI' : 'Compila con AI'}</span>
            </button>

            <button
              onClick={() => setIsNewAppModalOpen(false)}
              className="w-8 h-8 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Parse Quick Box */}
        {showAiBox && (
          <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-blue-100 dark:border-blue-900/60 space-y-3 text-xs">
            <div className="flex items-center justify-between text-blue-900 dark:text-blue-200 font-semibold">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-blue-600" />
                <span>Incolla il link dell'annuncio o il testo della job description</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
                Gemini AI
              </span>
            </div>

            {aiWarningMessage && (
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                <span className="text-sm">⚠️</span>
                <div>
                  <span className="font-semibold block">{aiWarningMessage}</span>
                  <span className="text-[11px] opacity-90 block mt-0.5">
                    Il link è già stato inserito nel form. Seleziona il testo della job description su LinkedIn, incollalo qui sotto e clicca di nuovo su Estrai.
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBookmarkletModalOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>Usa il Segnalibro 1-Clic Chrome (evita copia-incolla)</span>
                  </button>
                </div>
              </div>
            )}

            <textarea
              rows={3}
              placeholder="Incolla qui l'URL (es. https://jobs.lever.co/... o link sito carriere) oppure il testo copiato dall'annuncio... Gemini compilerà automaticamente tutti i campi della scheda."
              value={jobTextToParse}
              onChange={(e) => setJobTextToParse(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            />
            
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Supporta link diretti o testo copiato da qualsiasi piattaforma
              </span>
              <button
                type="button"
                onClick={() => handleAiParse()}
                disabled={isParsingAI || !jobTextToParse.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isParsingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini sta analizzando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Compila scheda con Gemini</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1 flex items-center justify-between">
                <span>Azienda *</span>
                {company.trim() && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">Logo sincronizzato</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                {company.trim() && (
                  <CompanyLogo company={company} domain={companyDomain} url={url} platform={platform} size="sm" />
                )}
                <input
                  type="text"
                  required
                  placeholder="Es. Bending Spoons, Stripe, Scalapay"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="flex-1 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Ruolo *</label>
              <input
                type="text"
                required
                placeholder="Es. Founder Associate, Growth Manager"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Famiglia di ruolo</label>
              <select
                value={grp}
                onChange={(e) => setGrp(e.target.value as any)}
                className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
              >
                <option value="Founder Associate">Founder Associate</option>
                <option value="Growth">Growth</option>
                <option value="Business Development e Growth">Business Development e Growth</option>
                <option value="Strategia e analisi">Strategia e analisi</option>
                <option value="Altro">Altro</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Stato iniziale</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
              >
                <option value="Da candidarmi">Da candidarmi</option>
                <option value="Candidato">Candidato</option>
                <option value="Colloquio">Colloquio</option>
                <option value="Offerta">Offerta</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Città</label>
              <input
                type="text"
                placeholder="Es. Milano, Berlino, Londra, Parigi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Paese</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
              >
                <option value="IT">Italia (IT)</option>
                <option value="DE">Germania (DE)</option>
                <option value="ES">Spagna (ES)</option>
                <option value="FR">Francia (FR)</option>
                <option value="UK">Regno Unito (UK)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Modalità</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as any)}
                className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
              >
                <option value="Ibrido">Ibrido</option>
                <option value="Remoto">Remoto</option>
                <option value="In sede">In sede</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Priorità</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
              >
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Bassa">Bassa</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Piattaforma</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
              >
                <option value="LinkedIn">LinkedIn</option>
                <option value="Indeed">Indeed</option>
                <option value="Joinrs">Joinrs</option>
                <option value="CareerOS">CareerOS</option>
                <option value="Flexa">Flexa</option>
                <option value="Sito aziendale">Sito aziendale</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Scadenza</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Salario / Retribuzione indicativa</label>
              <input
                type="text"
                placeholder="Es. 35.000€ - 42.000€ o 1.000€/mese"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Link annuncio</label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Job description completa</label>
            <textarea
              rows={3}
              placeholder="Sintesi delle responsabilità, del contesto aziendale e delle attività del ruolo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Note e punti chiave sull'annuncio</label>
            <textarea
              rows={3}
              placeholder="Requisiti, referral, contatti o note strategiche sul candidato..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
            />
          </div>

          <div className="pt-3 border-t border-white/60 dark:border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewAppModalOpen(false)}
              className="px-4 py-2 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800 transition-all cursor-pointer font-medium"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-[#1890ff] hover:bg-blue-600 text-white font-semibold shadow-[0_4px_14px_rgba(24,144,255,0.3)] transition-all cursor-pointer"
            >
              Crea candidatura
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

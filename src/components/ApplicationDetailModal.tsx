import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Trash2, 
  Check, 
  Clock, 
  Plus, 
  Copy, 
  Mail, 
  FileText, 
  ChevronRight,
  Sparkles,
  Share2,
  Wand2,
  Loader2,
  BrainCircuit,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { useInternTrack } from '../context/InternTrackContext';
import { Application, ApplicationStatus, InterviewKind, Interview } from '../types/internTrack';
import { CompanyLogo } from './CompanyLogo';

const STAGES: ApplicationStatus[] = [
  'Da candidarmi',
  'Candidato',
  'Colloquio',
  'Offerta',
  'Rifiutato'
];

export const ApplicationDetailModal: React.FC = () => {
  const { 
    applications, 
    selectedAppId, 
    setSelectedAppId, 
    updateApplication, 
    deleteApplication,
    changeAppStatus,
    addInterview,
    updateInterview,
    deleteInterview,
    showToast,
    logs
  } = useInternTrack();

  const app = applications.find(a => a.id === selectedAppId);
  const [activeTab, setActiveTab] = useState<'info' | 'interviews' | 'email' | 'ai_prep' | 'history'>('info');

  // New interview form state
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [invKind, setInvKind] = useState<InterviewKind>('Tecnico');
  const [invDate, setInvDate] = useState('2026-10-30');
  const [invTime, setInvTime] = useState('15:00');
  const [invTopic, setInvTopic] = useState('');
  const [invWho, setInvWho] = useState('');

  // Email draft language selector
  const [emailLang, setEmailLang] = useState<'IT' | 'EN'>('IT');
  const [emailType, setEmailType] = useState<'followup_app' | 'thank_you' | 'status_check'>('followup_app');

  // AI Generation States
  const [isGeneratingAiLetter, setIsGeneratingAiLetter] = useState(false);
  const [customAiDraft, setCustomAiDraft] = useState<string | null>(null);

  // AI Interview Prep States
  const [isGeneratingAiPrep, setIsGeneratingAiPrep] = useState(false);
  const [aiPrepData, setAiPrepData] = useState<any>(null);

  if (!app) return null;

  // Next Step determination
  const getNextStep = () => {
    if (app.status === 'Da candidarmi') {
      return app.deadline 
        ? `Inviare candidatura entro il ${app.deadline}` 
        : 'Completare e inviare candidatura';
    }
    if (app.status === 'Candidato') {
      return app.followDone 
        ? 'In attesa di riscontro dal team di talent acquisition' 
        : 'Inviare email di follow-up dopo 7 giorni dall\'invio';
    }
    if (app.status === 'Colloquio') {
      const upcoming = app.interviews.find(i => !i.done);
      return upcoming 
        ? `Preparare colloquio: ${upcoming.kind} (${upcoming.topic || 'Incontro'}) il ${upcoming.date || 'a breve'}` 
        : 'In attesa di esito dal colloquio precedente';
    }
    if (app.status === 'Offerta') {
      return 'Revisionare proposta economica e negoziare entro la scadenza';
    }
    return 'Candidatura archiviata';
  };

  // Pre-compiled email drafts
  const getEmailDraft = () => {
    if (customAiDraft) {
      return {
        subject: `Candidatura: ${app.role} - Alex Rossi`,
        body: customAiDraft
      };
    }

    const candidateName = 'Alex Rossi';
    const contactGreeting = app.referent ? (emailLang === 'IT' ? `Gentile ${app.referent}` : `Dear ${app.referent}`) : (emailLang === 'IT' ? 'Gentile Team di Selezione' : 'Dear Hiring Team');

    if (emailType === 'followup_app') {
      if (emailLang === 'IT') {
        return {
          subject: `Follow-up candidatura: ${app.role} - ${candidateName}`,
          body: `${contactGreeting},\n\nLe scrivo con riferimento alla mia recente candidatura per la posizione di ${app.role} presso ${app.company}.\n\nDesidero confermare il mio forte interesse per il ruolo e per i progetti di crescita di ${app.company}. Concludendo il mio Master in Innovation & Entrepreneurship presso una business school europea con background in Ingegneria Gestionale, resto a completa disposizione per un breve confronto qualora fossero necessari ulteriori chiarimenti sul mio percorso.\n\nLa ringrazio per l'attenzione e le auguro una buona giornata.\n\nCordiali saluti,\n${candidateName}`
        };
      } else {
        return {
          subject: `Application Follow-up: ${app.role} - ${candidateName}`,
          body: `${contactGreeting},\n\nI am writing to politely follow up on my recent application for the ${app.role} position at ${app.company}.\n\nI remain very enthusiastic about ${app.company}'s trajectory and culture. Completing my MSc in Innovation & Entrepreneurship at a European business school with an engineering background, I would welcome the opportunity to discuss how my profile aligns with your team's objectives.\n\nThank you for your time and consideration.\n\nBest regards,\n${candidateName}`
        };
      }
    } else if (emailType === 'thank_you') {
      if (emailLang === 'IT') {
        return {
          subject: `Ringraziamento colloquio: ${app.role} - ${candidateName}`,
          body: `${contactGreeting},\n\nDesidero ringraziarla per il tempo dedicato oggi durante il nostro colloquio per la posizione di ${app.role}.\n\nIl confronto sui progetti attuali e sulle sfide di ${app.company} ha ulteriormente rafforzato la mia motivazione a contribuire al vostro team. Resto volentieri a disposizione per i prossimi passi del processo.\n\nCordiali saluti,\n${candidateName}`
        };
      } else {
        return {
          subject: `Thank you - Interview for ${app.role} - ${candidateName}`,
          body: `${contactGreeting},\n\nThank you very much for taking the time to speak with me today regarding the ${app.role} position at ${app.company}.\n\nOur conversation further confirmed my excitement about your mission and growth priorities. I look forward to the next steps in the selection process.\n\nBest regards,\n${candidateName}`
        };
      }
    } else {
      if (emailLang === 'IT') {
        return {
          subject: `Richiesta di aggiornamento: ${app.role} - ${candidateName}`,
          body: `${contactGreeting},\n\nSpero stia trascorrendo una buona settimana. Le scrivo per verificare cortesemente se ci siano novità o aggiornamenti in merito al processo di selezione per ${app.role}.\n\nRinnovando il mio vivo interesse per ${app.company}, rimango a disposizione per qualsiasi approfondimento.\n\nUn cordiale saluto,\n${candidateName}`
        };
      } else {
        return {
          subject: `Status Update Request: ${app.role} - ${candidateName}`,
          body: `${contactGreeting},\n\nI hope you are having a productive week. I am reaching out to check on the status of my candidacy for the ${app.role} role.\n\nPlease let me know if you need any additional information from my side.\n\nBest regards,\n${candidateName}`
        };
      }
    }
  };

  const draft = getEmailDraft();

  const handleGenerateAiLetter = async () => {
    setIsGeneratingAiLetter(true);
    try {
      const res = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: app.company,
          role: app.role,
          description: app.notes,
          language: emailLang,
        }),
      });
      const data = await res.json();
      if (data.ok && data.text) {
        setCustomAiDraft(data.text);
        updateApplication(app.id, { letter: data.text });
        showToast('Lettera personalizzata generata con Gemini!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Errore durante la generazione della lettera', 'warning');
    } finally {
      setIsGeneratingAiLetter(false);
    }
  };

  const handleGenerateAiPrep = async () => {
    setIsGeneratingAiPrep(true);
    try {
      const res = await fetch('/api/ai/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: app.company,
          role: app.role,
          stage: app.interviews.length > 0 ? app.interviews[app.interviews.length - 1].kind : 'Tecnico',
        }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        setAiPrepData(data.data);
        showToast('Guida colloquio generata con successo!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Errore nella preparazione colloquio', 'warning');
    } finally {
      setIsGeneratingAiPrep(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`Oggetto: ${draft.subject}\n\n${draft.body}`);
    showToast('Bozza email copiata negli appunti', 'success');
  };

  const handleOpenMailClient = () => {
    const mailto = `mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
    window.open(mailto, '_blank');
  };

  // Google Calendar event creation URL helper
  const getGoogleCalendarUrl = (interview: Interview) => {
    const title = encodeURIComponent(`Colloquio ${interview.kind} - ${app.company} (${app.role})`);
    const dateFormatted = interview.date.replace(/-/g, '');
    const startTime = (interview.time || '15:00').replace(':', '') + '00';
    const startHour = parseInt((interview.time || '15:00').split(':')[0]);
    const endTime = String(startHour + 1).padStart(2, '0') + (interview.time || '15:00').split(':')[1] + '00';
    const dates = `${dateFormatted}T${startTime}/${dateFormatted}T${endTime}`;
    const details = encodeURIComponent(`Incontro con ${interview.who || app.company}. Argomento: ${interview.topic || 'Colloquio'}\nNote: ${interview.notes || ''}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${encodeURIComponent(app.city)}`;
  };

  const handleAddInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addInterview(app.id, {
      kind: invKind,
      date: invDate,
      time: invTime,
      topic: invTopic,
      who: invWho,
      done: false,
    });
    setShowAddInterview(false);
    setInvTopic('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-md overflow-y-auto">
      <div className="max-w-3xl w-full my-auto rounded-[32px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_25px_80px_rgba(20,60,120,0.18),0_1px_2px_rgba(255,255,255,0.9)_inset] dark:shadow-[0_25px_80px_rgba(0,0,0,0.6),0_1px_2px_rgba(255,255,255,0.1)_inset] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/70 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <CompanyLogo company={app.company} domain={app.companyDomain} url={app.url} platform={app.platform} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {app.company}
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">
                    · {app.city} ({app.country})
                  </span>
                  {app.url && (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-[#1890ff] transition-colors"
                      title="Apri annuncio originale"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                  {app.role}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm(`Eliminare la candidatura per ${app.company}?`)) {
                    deleteApplication(app.id);
                  }
                }}
                className="w-8 h-8 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                title="Elimina candidatura"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedAppId(null)}
                className="w-8 h-8 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div className="py-2">
            <div className="grid grid-cols-5 gap-1.5 p-1.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white/80 dark:border-white/10 text-center shadow-xs">
              {STAGES.map((s) => {
                const isActive = app.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => changeAppStatus(app.id, s)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? s === 'Colloquio' ? 'bg-orange-500 text-white shadow-xs' :
                          s === 'Offerta' ? 'bg-emerald-600 text-white shadow-xs' :
                          s === 'Rifiutato' ? 'bg-[#ff4d4f] text-white shadow-xs' :
                          'bg-[#1890ff] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            {/* Prossimo passo */}
            <div className="mt-3 p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-2.5 text-xs shadow-xs">
              <span className="font-semibold text-blue-900 dark:text-blue-300 shrink-0">Prossimo passo:</span>
              <span className="text-blue-700 dark:text-blue-200">{getNextStep()}</span>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 mt-3 pt-2 text-xs font-medium border-t border-white/60 dark:border-white/10 flex-wrap">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-semibold ${
                activeTab === 'info'
                  ? 'bg-[#1890ff] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
              }`}
            >
              Dati generali
            </button>
            <button
              onClick={() => setActiveTab('interviews')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1 ${
                activeTab === 'interviews'
                  ? 'bg-[#1890ff] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
              }`}
            >
              <span>Colloqui ({app.interviews.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('ai_prep')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                activeTab === 'ai_prep'
                  ? 'bg-[#1890ff] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prep Colloquio AI</span>
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-semibold ${
                activeTab === 'email'
                  ? 'bg-[#1890ff] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
              }`}
            >
              Bozze email & Cover letter
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-semibold ${
                activeTab === 'history'
                  ? 'bg-[#1890ff] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
              }`}
            >
              Cronologia
            </button>
          </div>

        </div>

        {/* Body Tabs */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: INFO GENERALI */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Azienda</label>
                <input
                  type="text"
                  value={app.company}
                  onChange={(e) => updateApplication(app.id, { company: e.target.value })}
                  className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Ruolo</label>
                <input
                  type="text"
                  value={app.role}
                  onChange={(e) => updateApplication(app.id, { role: e.target.value })}
                  className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Città</label>
                <input
                  type="text"
                  value={app.city}
                  onChange={(e) => updateApplication(app.id, { city: e.target.value })}
                  className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Modalità di lavoro</label>
                <select
                  value={app.workMode}
                  onChange={(e) => updateApplication(app.id, { workMode: e.target.value as any })}
                  className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
                >
                  <option value="In sede">In sede</option>
                  <option value="Ibrido">Ibrido</option>
                  <option value="Remoto">Remoto</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Retribuzione indicativa</label>
                <input
                  type="text"
                  value={app.salary || ''}
                  placeholder="Es. €40.000 - €50.000"
                  onChange={(e) => updateApplication(app.id, { salary: e.target.value })}
                  className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Scadenza candidatura</label>
                <input
                  type="date"
                  value={app.deadline || ''}
                  onChange={(e) => updateApplication(app.id, { deadline: e.target.value })}
                  className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Piattaforma</label>
                <input
                  type="text"
                  value={app.platform}
                  onChange={(e) => updateApplication(app.id, { platform: e.target.value as any })}
                  className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Referente / Recruiter</label>
                <input
                  type="text"
                  value={app.referent || ''}
                  placeholder="Nome persona di riferimento"
                  onChange={(e) => updateApplication(app.id, { referent: e.target.value })}
                  className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-500 font-medium mb-1">Note e impressioni</label>
                <textarea
                  rows={3}
                  value={app.notes}
                  onChange={(e) => updateApplication(app.id, { notes: e.target.value })}
                  className="w-full p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1890ff]/30 shadow-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 2: COLLOQUI */}
          {activeTab === 'interviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rounds di selezione registrati
                </span>
                <button
                  onClick={() => setShowAddInterview(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Aggiungi round
                </button>
              </div>

              {/* Add Interview Form */}
              {showAddInterview && (
                <form onSubmit={handleAddInterviewSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1">Tipologia</label>
                      <select
                        value={invKind}
                        onChange={(e) => setInvKind(e.target.value as InterviewKind)}
                        className="w-full p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 text-slate-900 dark:text-white"
                      >
                        <option value="HR">HR / Conoscitivo</option>
                        <option value="Tecnico">Tecnico</option>
                        <option value="Case study">Case study</option>
                        <option value="Di gruppo">Di gruppo</option>
                        <option value="Finale">Finale / Co-Founder</option>
                        <option value="Test">Test online</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Data e ora</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={invDate}
                          onChange={(e) => setInvDate(e.target.value)}
                          className="w-2/3 p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 text-slate-900 dark:text-white"
                        />
                        <input
                          type="time"
                          value={invTime}
                          onChange={(e) => setInvTime(e.target.value)}
                          className="w-1/3 p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Intervistatore</label>
                      <input
                        type="text"
                        placeholder="Es. Elena (Talent Lead)"
                        value={invWho}
                        onChange={(e) => setInvWho(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Argomento / Focus</label>
                      <input
                        type="text"
                        placeholder="Es. Case unit economics e M&A"
                        value={invTopic}
                        onChange={(e) => setInvTopic(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddInterview(false)}
                      className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-medium"
                    >
                      Salva colloquio
                    </button>
                  </div>
                </form>
              )}

              {/* Interviews List */}
              <div className="space-y-2.5">
                {app.interviews.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Nessun round di colloquio ancora registrato.
                  </div>
                ) : (
                  app.interviews.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateInterview(app.id, inv.id, { done: !inv.done })}
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                            inv.done
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {inv.done && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {inv.kind} · {inv.topic || 'Incontro'}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {inv.date} {inv.time && `alle ${inv.time}`}
                            </span>
                          </div>
                          {inv.who && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Con: {inv.who}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={getGoogleCalendarUrl(inv)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-medium hover:bg-blue-100 flex items-center gap-1 text-[11px]"
                          title="Aggiungi questo colloquio a Google Calendar"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Google Cal</span>
                        </a>

                        <button
                          onClick={() => deleteInterview(app.id, inv.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PREPARAZIONE COLLOQUIO AI CON GEMINI */}
          {activeTab === 'ai_prep' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Simulatore & Prep per {app.company}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    Gemini analizza il ruolo di {app.role} e genera 5 domande mirate, framework di risposta e domande intelligenti da porre all'intervistatore.
                  </p>
                </div>
                <button
                  onClick={handleGenerateAiPrep}
                  disabled={isGeneratingAiPrep}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50"
                >
                  {isGeneratingAiPrep ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Elaborazione...</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-4 h-4" />
                      <span>{aiPrepData ? 'Rigenera guida' : 'Genera guida AI'}</span>
                    </>
                  )}
                </button>
              </div>

              {aiPrepData ? (
                <div className="space-y-4">
                  {/* Domande probabili */}
                  <div className="space-y-2.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase font-mono tracking-wider">
                      5 Domande Probabili & Strategia di Risposta:
                    </span>
                    {Array.isArray(aiPrepData.questions) && aiPrepData.questions.map((q: any, i: number) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {i + 1}. {q.question}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {q.kind}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <strong>Miglior approccio:</strong> {q.bestApproach}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Domande da porre al recruiter */}
                  {Array.isArray(aiPrepData.questionsToAskInterviewer) && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2 font-mono uppercase text-[11px]">
                        Domande intelligenti da fare all'intervistatore:
                      </span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                        {aiPrepData.questionsToAskInterviewer.map((qa: string, idx: number) => (
                          <li key={idx}>{qa}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  Clicca su "Genera guida AI" per preparare le risposte e i case study con Gemini.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BOZZE EMAIL & COVER LETTER */}
          {activeTab === 'email' && (
            <div className="space-y-4 text-xs">
              
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setCustomAiDraft(null); setEmailType('followup_app'); }}
                    className={`px-3 py-1.5 rounded-xl font-medium ${
                      emailType === 'followup_app' && !customAiDraft ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Follow-up invio
                  </button>
                  <button
                    onClick={() => { setCustomAiDraft(null); setEmailType('thank_you'); }}
                    className={`px-3 py-1.5 rounded-xl font-medium ${
                      emailType === 'thank_you' && !customAiDraft ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Ringraziamento colloquio
                  </button>
                  <button
                    onClick={() => { setCustomAiDraft(null); setEmailType('status_check'); }}
                    className={`px-3 py-1.5 rounded-xl font-medium ${
                      emailType === 'status_check' && !customAiDraft ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Richiesta aggiornamento
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateAiLetter}
                    disabled={isGeneratingAiLetter}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-xs"
                  >
                    {isGeneratingAiLetter ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Genera Cover Letter con AI</span>
                  </button>

                  <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                    <button
                      onClick={() => setEmailLang('IT')}
                      className={`px-2 py-1 rounded-md font-semibold ${emailLang === 'IT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      IT
                    </button>
                    <button
                      onClick={() => setEmailLang('EN')}
                      className={`px-2 py-1 rounded-md font-semibold ${emailLang === 'EN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Oggetto email</label>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white">
                  {draft.subject}
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Testo dell'email</label>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                  {draft.body}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={handleCopyEmail}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copia testo</span>
                </button>
                <button
                  onClick={handleOpenMailClient}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Apri nel programma di posta</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: CRONOLOGIA AZIONI */}
          {activeTab === 'history' && (
            <div className="space-y-3 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Log eventi candidatura
              </span>

              <div className="space-y-2">
                {logs.filter(l => l.appId === app.id).length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    Candidatura registrata il {app.createdAt.slice(0, 10)}.
                  </div>
                ) : (
                  logs.filter(l => l.appId === app.id).map((log, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-200">{log.x}</span>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{log.t.slice(0, 16).replace('T', ' ')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">ID: {app.id}</span>
          <button
            onClick={() => setSelectedAppId(null)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition-all"
          >
            Chiudi scheda
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  Application, 
  ApplicationStatus, 
  CareerSite, 
  Course, 
  Contact, 
  Goal, 
  ActionLog, 
  ResearchSession, 
  AppSettings,
  MailProposal,
  SheetUpdateItem,
  Interview
} from '../types/internTrack';
import { 
  INITIAL_APPLICATIONS, 
  INITIAL_CAREER_SITES, 
  INITIAL_COURSES, 
  INITIAL_CONTACTS, 
  INITIAL_GOALS, 
  INITIAL_RESEARCH_SESSIONS, 
  INITIAL_LOGS, 
  DEFAULT_SETTINGS,
  INITIAL_MAIL_PROPOSALS,
  INITIAL_SHEET_UPDATES
} from '../data/initialData';

export type ScreenId = 
  | 'dashboard' 
  | 'tracker' 
  | 'calendar' 
  | 'research' 
  | 'sites' 
  | 'courses' 
  | 'cv_letters' 
  | 'suggestions';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'warning';
}

interface InternTrackContextType {
  // Screen & Navigation
  activeScreen: ScreenId;
  setActiveScreen: (screen: ScreenId) => void;
  
  // Data entities
  applications: Application[];
  careerSites: CareerSite[];
  courses: Course[];
  contacts: Contact[];
  goals: Goal[];
  logs: ActionLog[];
  researchSessions: ResearchSession[];
  settings: AppSettings;
  mailProposals: MailProposal[];
  sheetUpdates: SheetUpdateItem[];
  completedTaskIds: string[];

  // Filters & Search
  periodFilter: 'settimana' | 'mese' | 'totale';
  setPeriodFilter: (p: 'settimana' | 'mese' | 'totale') => void;
  trackerFilter: string;
  setTrackerFilter: (filter: string) => void;
  trackerViewMode: 'action' | 'schede' | 'tabella';
  setTrackerViewMode: (mode: 'action' | 'schede' | 'tabella') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Modals & Panels
  selectedAppId: string | null;
  setSelectedAppId: (id: string | null) => void;
  isNewAppModalOpen: boolean;
  setIsNewAppModalOpen: (open: boolean) => void;
  isPostaModalOpen: boolean;
  setIsPostaModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isNoveltyModalOpen: boolean;
  setIsNoveltyModalOpen: (open: boolean) => void;
  isAiCopilotOpen: boolean;
  setIsAiCopilotOpen: (open: boolean) => void;
  isBookmarkletModalOpen: boolean;
  setIsBookmarkletModalOpen: (open: boolean) => void;

  // Sync state
  syncStatus: 'offline' | 'syncing' | 'synced';

  // Toasts
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;

  // Application CRUD
  addApplication: (app: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateApplication: (id: string, updates: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  changeAppStatus: (id: string, status: ApplicationStatus) => void;
  
  // Interview helpers
  addInterview: (appId: string, interview: Omit<Interview, 'id'>) => void;
  updateInterview: (appId: string, interviewId: string, updates: Partial<Interview>) => void;
  deleteInterview: (appId: string, interviewId: string) => void;

  // Tasks & Operations
  toggleTaskCompleted: (taskId: string) => void;
  postponeTask: (taskId: string, days: number) => void;

  // Career sites
  checkCareerSite: (id: string) => void;
  postponeCareerSite: (id: string, days?: number) => void;
  addCareerSite: (site: Omit<CareerSite, 'id'>) => void;

  // Courses
  toggleCourseFavorite: (id: string) => void;
  updateCourseStatus: (id: string, status: Course['status']) => void;
  addCourse: (course: Omit<Course, 'id'>) => void;

  // Contacts
  toggleContactDone: (id: string) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;

  // Goals
  updateGoal: (id: string, updates: Partial<Goal>) => void;

  // Research Sessions
  toggleResearchPlatform: (sessionId: string, platformName: string) => void;
  completeResearchSession: (sessionId: string) => void;
  postponeResearchSession: (sessionId: string) => void;
  recalculatePlan: () => void;

  // Mail
  applyMailProposal: (proposalId: string, actionType: MailProposal['recommendedAction']) => void;

  // Settings & Theme
  updateSettings: (updates: Partial<AppSettings>) => void;
  
  // Export / Import
  exportDataJSON: () => void;
  importDataJSON: (jsonString: string) => boolean;
  exportApplicationsCSV: () => void;
  exportClaudeQueue: () => void;
  importClaudeResults: (jsonString: string) => { updated: number; newCount: number; failed: number };
  resetSampleData: () => void;

  // Metrics
  urgentTasksCount: number;
}

const InternTrackContext = createContext<InternTrackContextType | undefined>(undefined);

const STORAGE_KEYS = {
  APPS: 'itrack_applications_v1',
  SITES: 'itrack_sites_v1',
  COURSES: 'itrack_courses_v1',
  CONTACTS: 'itrack_contacts_v1',
  GOALS: 'itrack_goals_v1',
  LOGS: 'itrack_logs_v1',
  PLAN: 'itrack_plan_v1',
  SETTINGS: 'itrack_settings_v1',
  COMPLETED_TASKS: 'itrack_completed_tasks_v1',
  PROPOSALS: 'itrack_proposals_v1',
  UPDATES: 'itrack_updates_v1'
};

export const InternTrackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation
  const [activeScreen, setActiveScreen] = useState<ScreenId>('dashboard');

  // Core Data with LocalStorage lazy init
  const [applications, setApplications] = useState<Application[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APPS);
      return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
    } catch {
      return INITIAL_APPLICATIONS;
    }
  });

  const [careerSites, setCareerSites] = useState<CareerSite[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SITES);
      return saved ? JSON.parse(saved) : INITIAL_CAREER_SITES;
    } catch {
      return INITIAL_CAREER_SITES;
    }
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COURSES);
      return saved ? JSON.parse(saved) : INITIAL_COURSES;
    } catch {
      return INITIAL_COURSES;
    }
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
    } catch {
      return INITIAL_CONTACTS;
    }
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
      return saved ? JSON.parse(saved) : INITIAL_GOALS;
    } catch {
      return INITIAL_GOALS;
    }
  });

  const [logs, setLogs] = useState<ActionLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      return saved ? JSON.parse(saved) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  const [researchSessions, setResearchSessions] = useState<ResearchSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAN);
      return saved ? JSON.parse(saved) : INITIAL_RESEARCH_SESSIONS;
    } catch {
      return INITIAL_RESEARCH_SESSIONS;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPLETED_TASKS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [mailProposals, setMailProposals] = useState<MailProposal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROPOSALS);
      return saved ? JSON.parse(saved) : INITIAL_MAIL_PROPOSALS;
    } catch {
      return INITIAL_MAIL_PROPOSALS;
    }
  });

  const [sheetUpdates, setSheetUpdates] = useState<SheetUpdateItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.UPDATES);
      return saved ? JSON.parse(saved) : INITIAL_SHEET_UPDATES;
    } catch {
      return INITIAL_SHEET_UPDATES;
    }
  });

  // Filters & State
  const [periodFilter, setPeriodFilter] = useState<'settimana' | 'mese' | 'totale'>('settimana');
  const [trackerFilter, setTrackerFilter] = useState<string>('all');
  const [trackerViewMode, setTrackerViewMode] = useState<'action' | 'schede' | 'tabella'>('action');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState<boolean>(false);
  const [isPostaModalOpen, setIsPostaModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isNoveltyModalOpen, setIsNoveltyModalOpen] = useState<boolean>(false);
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState<boolean>(false);
  const [isBookmarkletModalOpen, setIsBookmarkletModalOpen] = useState<boolean>(false);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<'offline' | 'syncing' | 'synced'>('synced');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  // Sync back to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.APPS, JSON.stringify(applications));
      localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(careerSites));
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(researchSessions));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      localStorage.setItem(STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(completedTaskIds));
      localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(mailProposals));
      localStorage.setItem(STORAGE_KEYS.UPDATES, JSON.stringify(sheetUpdates));
    } catch (err) {
      console.warn('Errore salvataggio locale:', err);
    }
  }, [applications, careerSites, courses, contacts, goals, logs, researchSessions, settings, completedTaskIds, mailProposals, sheetUpdates]);

  // Apply Theme class on document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'scuro') {
      root.classList.add('dark');
    } else if (settings.theme === 'chiaro') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Urgent items calculation (for badge on Dashboard menu item)
  const urgentTasksCount = useMemo(() => {
    let count = 0;
    const todayStr = '2026-10-28';

    // 1. Interviews upcoming
    applications.forEach(a => {
      a.interviews.forEach(i => {
        if (!i.done && i.date && i.date <= '2026-11-04') count++;
      });
      // 2. Deadlines today or passed
      if (a.deadline && a.deadline <= todayStr && a.status === 'Da candidarmi') count++;
      // 3. Follow ups
      if (a.status === 'Candidato' && !a.followDone) count++;
    });

    // 4. Career sites due
    careerSites.forEach(s => {
      if (s.next <= todayStr) count++;
    });

    // 5. Contacts due today
    contacts.forEach(c => {
      if (!c.done && c.due && c.due <= todayStr) count++;
    });

    return Math.max(1, count);
  }, [applications, careerSites, contacts]);

  // Application CRUD
  const addApplication = (appData: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = `app-${Date.now()}`;
    const now = new Date().toISOString();
    const newApp: Application = {
      ...appData,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };
    setApplications(prev => [newApp, ...prev]);
    
    // Add to action log
    const logItem: ActionLog = {
      t: now,
      appId: newId,
      c: newApp.company,
      x: `Creata candidatura per ${newApp.role}`
    };
    setLogs(prev => [logItem, ...prev]);
    showToast(`Candidatura ${newApp.company} aggiunta con successo`, 'success');
  };

  const updateApplication = (id: string, updates: Partial<Application>) => {
    const now = new Date().toISOString();
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: now } : a));
    showToast('Candidatura aggiornata', 'success');
  };

  const deleteApplication = (id: string) => {
    const target = applications.find(a => a.id === id);
    setApplications(prev => prev.filter(a => a.id !== id));
    if (selectedAppId === id) setSelectedAppId(null);
    showToast(`Candidatura ${target?.company || ''} eliminata`, 'info');
  };

  const changeAppStatus = (id: string, status: ApplicationStatus) => {
    const now = new Date().toISOString();
    setApplications(prev => prev.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          status, 
          updatedAt: now,
          appliedAt: (status === 'Candidato' && !a.appliedAt) ? '2026-10-28' : a.appliedAt 
        };
      }
      return a;
    }));

    const app = applications.find(a => a.id === id);
    if (app) {
      setLogs(prev => [{
        t: now,
        appId: id,
        c: app.company,
        x: `Stato aggiornato a ${status}`
      }, ...prev]);
    }

    showToast(`Stato aggiornato: ${status}`, 'success');
  };

  // Interviews
  const addInterview = (appId: string, interview: Omit<Interview, 'id'>) => {
    const newId = `i-${Date.now()}`;
    const newInterview: Interview = { ...interview, id: newId };
    setApplications(prev => prev.map(a => {
      if (a.id === appId) {
        return { ...a, interviews: [...a.interviews, newInterview], status: 'Colloquio' };
      }
      return a;
    }));
    showToast('Nuovo colloquio registrato', 'success');
  };

  const updateInterview = (appId: string, interviewId: string, updates: Partial<Interview>) => {
    setApplications(prev => prev.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          interviews: a.interviews.map(i => i.id === interviewId ? { ...i, ...updates } : i)
        };
      }
      return a;
    }));
    showToast('Colloquio aggiornato', 'success');
  };

  const deleteInterview = (appId: string, interviewId: string) => {
    setApplications(prev => prev.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          interviews: a.interviews.filter(i => i.id !== interviewId)
        };
      }
      return a;
    }));
  };

  // Tasks
  const toggleTaskCompleted = (taskId: string) => {
    setCompletedTaskIds(prev => {
      if (prev.includes(taskId)) {
        showToast('Attività ripristinata', 'info');
        return prev.filter(id => id !== taskId);
      } else {
        showToast('Attività segnata come completata', 'success');
        return [...prev, taskId];
      }
    });
  };

  const postponeTask = (taskId: string, days: number) => {
    showToast(`Attività rimandata di ${days} ${days === 1 ? 'giorno' : 'giorni'}`, 'info');
  };

  // Career sites
  const checkCareerSite = (id: string) => {
    const today = '2026-10-28';
    setCareerSites(prev => prev.map(s => {
      if (s.id === id) {
        // Next check according to months
        const nextMonth = new Date('2026-10-28');
        nextMonth.setMonth(nextMonth.getMonth() + s.every);
        const nextStr = nextMonth.toISOString().split('T')[0];
        return { ...s, last: today, next: nextStr };
      }
      return s;
    }));
    showToast('Sito carriera verificato', 'success');
  };

  const postponeCareerSite = (id: string, days: number = 3) => {
    setCareerSites(prev => prev.map(s => {
      if (s.id === id) {
        const d = new Date(s.next || '2026-10-28');
        d.setDate(d.getDate() + days);
        return { ...s, next: d.toISOString().split('T')[0] };
      }
      return s;
    }));
    showToast(`Controllo sito rimandato di ${days} giorni`, 'info');
  };

  const addCareerSite = (site: Omit<CareerSite, 'id'>) => {
    const newId = `cs-${Date.now()}`;
    setCareerSites(prev => [...prev, { ...site, id: newId }]);
    showToast(`Sito ${site.company} aggiunto alla rotazione`, 'success');
  };

  // Courses
  const toggleCourseFavorite = (id: string) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, favorite: !c.favorite } : c));
  };

  const updateCourseStatus = (id: string, status: Course['status']) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    showToast(`Stato corso aggiornato: ${status}`, 'success');
  };

  const addCourse = (course: Omit<Course, 'id'>) => {
    const newId = `c-${Date.now()}`;
    setCourses(prev => [...prev, { ...course, id: newId }]);
    showToast(`Corso "${course.title}" salvato`, 'success');
  };

  // Contacts
  const toggleContactDone = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
    showToast('Stato contatto aggiornato', 'success');
  };

  const updateContact = (id: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // Goals
  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    showToast('Obiettivo modificato', 'success');
  };

  // Research Plan
  const toggleResearchPlatform = (sessionId: string, platformName: string) => {
    setResearchSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          platforms: s.platforms.map(p => {
            if (p.platform === platformName) {
              const newChecked = !p.checked;
              return { 
                ...p, 
                checked: newChecked,
                foundCount: newChecked && p.foundCount === 0 ? 1 : p.foundCount 
              };
            }
            return p;
          })
        };
      }
      return s;
    }));
  };

  const completeResearchSession = (sessionId: string) => {
    setResearchSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'fatta' } : s));
    showToast('Sessione di ricerca completata', 'success');
  };

  const postponeResearchSession = (sessionId: string) => {
    setResearchSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'rimandata' } : s));
    showToast('Sessione rimandata a domani', 'info');
  };

  const recalculatePlan = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
      showToast('Piano di ricerca ricalcolato: 4 sessioni ottimizzate', 'success');
    }, 400);
  };

  // Mail proposals
  const applyMailProposal = (proposalId: string, actionType: MailProposal['recommendedAction']) => {
    const proposal = mailProposals.find(p => p.id === proposalId);
    if (!proposal) return;

    if (actionType === 'Segna come rifiutata') {
      const match = applications.find(a => a.company.toLowerCase() === proposal.company.toLowerCase());
      if (match) changeAppStatus(match.id, 'Rifiutato');
    } else if (actionType === 'Applica' || actionType === 'Applica e metti nel calendario') {
      const match = applications.find(a => a.company.toLowerCase() === proposal.company.toLowerCase());
      if (match) {
        changeAppStatus(match.id, 'Colloquio');
        if (proposal.interviewDate) {
          addInterview(match.id, {
            date: proposal.interviewDate,
            time: proposal.interviewTime || '15:00',
            kind: 'Tecnico',
            topic: proposal.subject,
            done: false,
            notes: proposal.snippet,
          });
        }
      }
    }

    setMailProposals(prev => prev.filter(p => p.id !== proposalId));
    showToast(`Azione applicata: ${actionType}`, 'success');
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    showToast('Impostazioni salvate', 'success');
  };

  // Export / Import
  const exportDataJSON = () => {
    const backup = {
      version: 'intern-track-v2',
      exportedAt: new Date().toISOString(),
      user: 'Demo User',
      applications,
      careerSites,
      courses,
      contacts,
      goals,
      logs,
      researchSessions,
      settings
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intern-track-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON esportato con successo', 'success');
  };

  const importDataJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.applications && Array.isArray(data.applications)) {
        setApplications(data.applications);
        if (data.careerSites) setCareerSites(data.careerSites);
        if (data.courses) setCourses(data.courses);
        if (data.contacts) setContacts(data.contacts);
        if (data.goals) setGoals(data.goals);
        if (data.researchSessions) setResearchSessions(data.researchSessions);
        showToast('Dati importati con successo', 'success');
        return true;
      }
      return false;
    } catch {
      showToast('File JSON non valido', 'warning');
      return false;
    }
  };

  const exportApplicationsCSV = () => {
    const headers = ['Azienda', 'Ruolo', 'Città', 'Paese', 'Stato', 'Data Invio', 'Priorità', 'Piattaforma', 'Retribuzione', 'Link'];
    const rows = applications.map(a => [
      `"${a.company.replace(/"/g, '""')}"`,
      `"${a.role.replace(/"/g, '""')}"`,
      `"${a.city.replace(/"/g, '""')}"`,
      `"${a.country}"`,
      `"${a.status}"`,
      `"${a.appliedAt || ''}"`,
      `"${a.priority}"`,
      `"${a.platform}"`,
      `"${a.salary || ''}"`,
      `"${a.url || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidature-intern-track-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Candidature esportate in CSV', 'success');
  };

  const exportClaudeQueue = () => {
    const queue = applications
      .filter(a => !a.description || a.readState === 'in_coda')
      .map(a => ({
        id: a.id,
        url: a.url,
        piattaforma: a.platform,
        azienda: a.company,
        ruolo: a.role,
      }));

    const payload = {
      formato: 'intern-track-coda',
      data: new Date().toISOString().split('T')[0],
      istruzioni: 'Leggi gli annunci di lavoro allegati e compila i campi mancanti (company, role, location, kind, contract, workMode, salary, deadline, description <= 1500 char, requirements <= 800 char).',
      candidature: queue
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coda-per-claude-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Coda esportata: ${queue.length} candidature pronte per Claude`, 'success');
  };

  const importClaudeResults = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      let updated = 0;
      let failed = 0;
      if (Array.isArray(data.risultati)) {
        setApplications(prev => prev.map(a => {
          const match = data.risultati.find((r: { id: string }) => r.id === a.id);
          if (match && match.esito === 'letta' && match.campi) {
            updated++;
            return {
              ...a,
              ...match.campi,
              readState: 'letta',
              updatedAt: new Date().toISOString()
            };
          } else if (match && match.esito === 'non_riuscita') {
            failed++;
            return { ...a, readState: 'non_riuscita' };
          }
          return a;
        }));
      }
      showToast(`Risultati importati: ${updated} aggiornate, ${failed} non riuscite`, 'success');
      return { updated, newCount: 0, failed };
    } catch {
      showToast('Errore lettura file risultati Claude', 'warning');
      return { updated: 0, newCount: 0, failed: 1 };
    }
  };

  const resetSampleData = () => {
    setApplications(INITIAL_APPLICATIONS);
    setCareerSites(INITIAL_CAREER_SITES);
    setCourses(INITIAL_COURSES);
    setContacts(INITIAL_CONTACTS);
    setGoals(INITIAL_GOALS);
    setLogs(INITIAL_LOGS);
    setResearchSessions(INITIAL_RESEARCH_SESSIONS);
    setSettings(DEFAULT_SETTINGS);
    setCompletedTaskIds([]);
    showToast('Dati di esempio ripristinati', 'info');
  };

  return (
    <InternTrackContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        applications,
        careerSites,
        courses,
        contacts,
        goals,
        logs,
        researchSessions,
        settings,
        mailProposals,
        sheetUpdates,
        completedTaskIds,
        periodFilter,
        setPeriodFilter,
        trackerFilter,
        setTrackerFilter,
        trackerViewMode,
        setTrackerViewMode,
        searchQuery,
        setSearchQuery,
        selectedAppId,
        setSelectedAppId,
        isNewAppModalOpen,
        setIsNewAppModalOpen,
        isPostaModalOpen,
        setIsPostaModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isNoveltyModalOpen,
        setIsNoveltyModalOpen,
        isAiCopilotOpen,
        setIsAiCopilotOpen,
        isBookmarkletModalOpen,
        setIsBookmarkletModalOpen,
        syncStatus,
        toasts,
        showToast,
        addApplication,
        updateApplication,
        deleteApplication,
        changeAppStatus,
        addInterview,
        updateInterview,
        deleteInterview,
        toggleTaskCompleted,
        postponeTask,
        checkCareerSite,
        postponeCareerSite,
        addCareerSite,
        toggleCourseFavorite,
        updateCourseStatus,
        addCourse,
        toggleContactDone,
        updateContact,
        updateGoal,
        toggleResearchPlatform,
        completeResearchSession,
        postponeResearchSession,
        recalculatePlan,
        applyMailProposal,
        updateSettings,
        exportDataJSON,
        importDataJSON,
        exportApplicationsCSV,
        exportClaudeQueue,
        importClaudeResults,
        resetSampleData,
        urgentTasksCount,
      }}
    >
      {children}
    </InternTrackContext.Provider>
  );
};

export const useInternTrack = () => {
  const context = useContext(InternTrackContext);
  if (!context) {
    throw new Error('useInternTrack must be used within an InternTrackProvider');
  }
  return context;
};

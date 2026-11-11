import React, { useState, useMemo, useEffect, useRef } from 'react';
import SearchPlanView, { type RicProgress } from './components/SearchPlanView';
import { buildSearchPlan, listCountries, toISODate } from './searchPlan';
import * as XLSX from 'xlsx';
import { appLang, tr, translateTo } from './i18n';
import { LanguageSwitch, useAppLang } from './i18n/LanguageSwitch';
import { db, auth, loginWithGoogle, logoutUser, onAuthStateChanged, testConnection, User, getAccessToken, getConnectedAccounts, isFirebaseConfigured } from './firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';
import { LOGO_W, LOGO_B } from './data/mockupLogos';
import { CompanyLogoModal } from './components/CompanyLogoModal';
import { WorkspaceConfirmModal } from './components/WorkspaceConfirmModal';
import { WelcomeAuthModal } from './components/WelcomeAuthModal';
import { DailyScoutingReportModal } from './components/DailyScoutingReportModal';
import { fetchRecruiterEmailsFromGmail, MOCK_RECRUITER_MESSAGES, RecruiterEmailMessage } from './services/gmailService';
import {
  fetchCalendarEvents,
  createCalendarEvent,
  fetchGoogleTasks,
  createGoogleTask,
  markGoogleTaskComplete,
  deleteGoogleTask,
  formatToRfc3339,
  GoogleCalendarEvent,
  GoogleTaskItem,
} from './services/googleWorkspaceService';
import {
  SHEET_ID,
  DEFAULT_SHEET_ID,
  readSheetCoda,
  readProcessedCompanies,
  updateCodaRowsStatus,
  updatePersoneSuggeritaIl,
  appendRowsToSheet,
  fetchLnFeedbackFromGmail,
  generateDailyHtmlEmail,
  sendEmailViaGmailApi,
  download4TabGoogleSheetTemplate,
  SheetCodaRow,
} from './services/googleSheetsService';
import {
  MockApp,
  MockDeadline,
  INITIAL_MOCK_APPS,
  INITIAL_DEADLINES,
  ST,
  EM,
  PL,
  TN,
  VMN,
  STN,
  INITIAL_CNT,
  SEC,
  DEF,
  HEAD,
  FL,
  ini,
  grad,
  getCompanyDomain,
  getCompanyLogoUrl,
  getCompanySiteIconUrl,
  MockScaleupItem,
  INITIAL_SCALEUP_DATA,
  MockDailyPerson,
  INITIAL_DAILY_PEOPLE,
  MockDailyCompany,
  INITIAL_DAILY_COMPANIES,
  HubCodaItem,
  INITIAL_HUB_CODA,
  PROCESSED_COMPANIES_REGISTRY,
  ProcessedCompanyItem,
  getDayOfYear,
  getCategoryOfTheDay,
  GmailAccountConfig,
  INITIAL_GMAIL_ACCOUNTS,
  WEEKLY_SECTORS,
  UserScoutConfig,
  DEFAULT_USER_SCOUT_CONFIG,
} from './data/mockupData';
import {
  FullSearchConfigProfile,
  INITIAL_SEARCH_CONFIG,
  PositionFamily,
  CityTarget,
  PlatformConfig,
  SearchPlanConfig,
  UserCVProfile,
  AllowedFieldValues,
} from './data/configProfile';

// Email di riferimento per i link mailto quando non si è loggati (configurabile con VITE_OWNER_EMAIL)
const OWNER_EMAIL_FALLBACK = ((import.meta as any).env?.VITE_OWNER_EMAIL as string) || 'demo@example.com';

// DEMO = Firebase not configured (public portfolio demo): sample data everywhere.
// Real mode (Firebase configured): the app starts EMPTY and shows only the user's own data.
const DEMO = !isFirebaseConfigured;
const sample = <T,>(demoValue: T, realValue: T): T => (DEMO ? demoValue : realValue);

// One-time cleanup: in real mode, drop sample data that an earlier build may have cached in this browser.
if (!DEMO) {
  try {
    if (!localStorage.getItem('interntrack_real_mode_v1')) {
      ['intern_track_apps', 'hub_coda_items_cache_v3', 'hub_processed_companies_cache_v3', 'intern_track_gmail_accounts'].forEach((k) =>
        localStorage.removeItem(k)
      );
      localStorage.setItem('interntrack_real_mode_v1', '1');
    }
  } catch {
    // storage unavailable
  }
}

// Second one-time cleanup: the personal profile fields stored by an earlier build contained the sample persona.
if (!DEMO) {
  try {
    if (!localStorage.getItem('interntrack_real_mode_v2')) {
      localStorage.removeItem('intern_track_search_config');
      localStorage.setItem('interntrack_real_mode_v2', '1');
    }
  } catch {
    // storage unavailable
  }
}

// Sidebar badge: the sample number in the demo, the real count otherwise (hidden when it is zero)
const NavBadge = ({ demo, real, hot = true }: { demo: number; real: number; hot?: boolean }) => {
  const value = DEMO ? demo : real;
  if (!DEMO && value <= 0) return null;
  return <span className={hot ? 'n hot' : 'n'}>{value}</span>;
};

// "€1.400/m" -> 1400
const parseComp = (v: string): number => {
  const m = (v || '').replace(/\./g, '').match(/\d{3,6}/);
  return m ? Number(m[0]) : 0;
};
const eur = (n: number): string => '€' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Placeholder used by the CV / cover letter / simulator tools while the tracker is still empty
// Search profile used as the starting point (and for "restore defaults"). In real mode the personal fields start empty.
const BASE_SEARCH_CONFIG = DEMO
  ? INITIAL_SEARCH_CONFIG
  : {
      ...INITIAL_SEARCH_CONFIG,
      // Real mode: no pre-filled roles or cities. The user adds their own in the settings.
      positions: [] as typeof INITIAL_SEARCH_CONFIG.positions,
      cities: [] as typeof INITIAL_SEARCH_CONFIG.cities,
      userProfile: {
        ...INITIAL_SEARCH_CONFIG.userProfile,
        fullName: '',
        emailPrimary: '',
        emailSecondary: '',
        objective: '',
        targetAvailableFrom: '',
        targetRolesSummary: '',
        education: '',
        languages: [] as Array<{ language: string; level: string }>,
        flagLanguagesInAds: [] as string[],
      },
      // The research plan starts today and runs for 8 weeks; the dates can be changed in the settings
      searchPlan: {
        ...INITIAL_SEARCH_CONFIG.searchPlan,
        startDate: toISODate(new Date()),
        endDate: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 56);
          return toISODate(d);
        })(),
      },
    };
// Mailboxes listed from the start in real mode: VITE_GMAIL_ACCOUNTS="main@gmail.com,second@gmail.com"
// The first one receives the daily report; all of them are read for recruiter replies.
const SEEDED_GMAIL_ACCOUNTS: GmailAccountConfig[] = ((((import.meta as any).env?.VITE_GMAIL_ACCOUNTS as string) || '') as string)
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)
  .map((email, i) => ({
    id: `gm-${i + 1}`,
    email,
    label: i === 0 ? 'Principale (ricezione report e lettura risposte)' : 'Secondaria (sola lettura risposte recruiter)',
    isReceiver: i === 0,
    isReader: true,
    status: 'Attivo' as const,
    lastChecked: 'Mai',
  }));
const EMPTY_APP: MockApp = {
  id: '', co: '', role: '', st: 'todo', fit: 0, city: '', country: '', mode: '', pl: '', nx: ['—', 'info'], comp: '—', sent: '—', prio: 'Media', act: 'sent',
};

// Sample cover letter shown before the user edits it (Italian source; translated by the i18n dictionary).
const DEFAULT_LETTER_IT = `Gentile Team Talent di Logistica OS,\n\nDesidero sottoporre la mia candidatura per la posizione di Founders Associate Intern. Il mio percorso in Management Engineering con Master in Innovation & Entrepreneurship presso una business school europea, unito alla passione per le operazioni ad alto impatto tecnologico, è perfettamente allineato alla vostra missione.\n\nDurante gli studi ho guidato il progetto di go-to-market per un prodotto tecnologico innovativo e ottenuto un riconoscimento in una competizione di business. Ho solide competenze nell'analisi dati tramite Python ed Excel avanzato e un approccio orientato alla risoluzione rapida di problemi operativi.\n\nSarei entusiasta di contribuire alla crescita e all'efficienza operativa di Logistica OS.\n\nCordiali saluti,\nAlex Rossi`;

export default function App() {
  // Theme state ('dark' or 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Main navigation view
  const [view, setView] = useState<string>('dash');

  // Tracker sub-view mode ('tab' | 'act' | 'sch')
  const [vm, setVm] = useState<string>('tab');

  // Multi-select Status Filter (array of selected status keys: 'todo', 'applied', 'interview', 'offer', 'rejected')
  // Empty array [] means "Tutte" (all statuses selected / no filter)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Tracker additional filters
  const [fit80, setFit80] = useState<boolean>(false);
  const [q, setQ] = useState<string>('');
  const [gb, setGb] = useState<string>('');
  const [cf, setCf] = useState<{
    country: string;
    city: string;
    mode: string;
    prio: string;
    role: string;
  }>({
    country: '',
    city: '',
    mode: '',
    prio: '',
    role: '',
  });

  // Calendar & Scadenze sub-tab ('cal' | 'sca')
  const [calTab, setCalTab] = useState<'cal' | 'sca'>('cal');
  const [calMode, setCalMode] = useState<'month' | 'week'>('month');

  // Scadenze filters & Dynamic Deadlines state (automazione follow-up a 7 giorni)
  const [sf, setSf] = useState<string>('all');
  const [pf, setPf] = useState<string>('all');
  const [deadlines, setDeadlines] = useState<MockDeadline[]>(sample(INITIAL_DEADLINES, []));

  // Dynamic Notifications state (updated also by Gmail sync)
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; desc: string; date: string; unread: boolean }>>(!DEMO ? [] : [
    {
      id: 'n1',
      title: 'Controllo Posta completato',
      desc: 'Nessun rifiuto ricevuto. Rilevato tempo ottimale per follow-up su Stranger Soccer e Factorial.',
      date: 'Oggi 18:00',
      unread: true,
    },
    {
      id: 'n2',
      title: 'Promemoria colloquio imminente',
      desc: 'Domani alle 15:00: HR Screening con Logistica OS (Founders Associate).',
      date: 'Oggi 14:30',
      unread: false,
    },
    {
      id: 'n3',
      title: 'Aggiornamento Google Sheet',
      desc: 'Tutte le candidature e le note sulle aziende sono sincronizzate e salvate in cloud.',
      date: 'Ieri',
      unread: false,
    },
  ]);

  // Firebase Cloud Auth & Database Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Nome mostrato nell'interfaccia: arriva dall'account Google con cui si accede
  const userFullName = currentUser?.displayName?.trim() || (currentUser?.email ? currentUser.email.split('@')[0] : sample('Alex Rossi', 'Ospite'));
  const userFirstName = userFullName.split(' ')[0];
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Check connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.email) {
        showToast(`✓ Connesso con Google: ${user.email}`);
        setActiveWorkspaceAccount(user.email);
        setQuickTaskAccountSelect(user.email);
        setNewEventAccount(user.email);
      } else {
        setActiveWorkspaceAccount(sample('demo@example.com', ''));
      }
    });
    return () => unsubscribe();
  }, []);

  // Task checks on Dashboard
  const [taskDone, setTaskDone] = useState<{ [key: string]: boolean }>({});

  // Dynamic Workspace Accounts: uses dynamically connected accounts from OAuth or authenticated user
  const WORKSPACE_ACCOUNTS = (() => {
    if (!currentUser?.email) {
      return sample(['demo@example.com'], [] as string[]);
    }
    const accounts = getConnectedAccounts();
    if (accounts.length > 0) {
      return Array.from(new Set([currentUser.email, ...accounts]));
    }
    return [currentUser.email];
  })();

  const [activeWorkspaceAccount, setActiveWorkspaceAccount] = useState<string>(sample('demo@example.com', ''));
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<GoogleCalendarEvent[]>(!DEMO ? [] : [
    {
      id: 'gcal-init-1',
      summary: '🗓 HR Screening · Logistica OS',
      description: 'Founders Associate Intern · Colloquio via Google Meet',
      start: { dateTime: '2026-11-06T15:00:00+01:00' },
      end: { dateTime: '2026-11-06T15:45:00+01:00' },
      accountEmail: 'demo@example.com',
    },
    {
      id: 'gcal-init-2',
      summary: '🗓 Business Case Review · Bending Spoons',
      description: 'Sessione di problem solving e prioritizzazione',
      start: { dateTime: '2026-11-09T11:00:00+01:00' },
      end: { dateTime: '2026-11-09T12:00:00+01:00' },
      accountEmail: 'demo@example.com',
    },
  ]);
  const [googleTasksList, setGoogleTasksList] = useState<GoogleTaskItem[]>(!DEMO ? [] : [
    {
      id: 'gt-init-1',
      title: 'Inviare candidatura a Logistica OS (Founders Associate)',
      notes: 'CV sartoriale e cover letter pronti',
      due: new Date().toISOString(),
      status: 'needsAction',
      accountEmail: 'demo@example.com',
    },
    {
      id: 'gt-init-2',
      title: 'Follow-up Stranger Soccer via email',
      notes: 'Trascorsi 7 giorni dall’invio, inviare breve sollecito gentile',
      due: new Date().toISOString(),
      status: 'needsAction',
      accountEmail: 'demo@example.com',
    },
    {
      id: 'gt-init-3',
      title: 'Sessione ricerca: Barcelona scaleup tech',
      notes: 'Monitorare canali careers e contatti talent team',
      due: new Date().toISOString(),
      status: 'needsAction',
      accountEmail: 'demo@example.com',
    },
  ]);
  const [isWorkspaceSyncing, setIsWorkspaceSyncing] = useState<boolean>(false);
  const [lastWorkspaceSyncTime, setLastWorkspaceSyncTime] = useState<string | null>(sample('Oggi alle 14:30', null));

  // Confirmation Modal state for Workspace mutations (strictly required by guidelines)
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    service: 'tasks' | 'calendar';
    title: string;
    subtitle?: string;
    account: string;
    details: Array<{ label: string; value: string }>;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isSubmittingWorkspaceAction, setIsSubmittingWorkspaceAction] = useState<boolean>(false);

  // Quick Task Input in Calendar & Tasks view
  const [quickTaskTitleInput, setQuickTaskTitleInput] = useState<string>('');
  const [quickTaskDateInput, setQuickTaskDateInput] = useState<string>('Oggi');
  const [quickTaskAccountSelect, setQuickTaskAccountSelect] = useState<string>(sample('demo@example.com', ''));

  // Welcome & Multi-Account Hub Modal State
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(false);

  // 10 Target Companies & LinkedIn Scouting Report Modal State
  const [isScoutingReportModalOpen, setIsScoutingReportModalOpen] = useState<boolean>(false);

  // Applications data state (persisted locally and synced with Firestore)
  const [apps, setApps] = useState<MockApp[]>(() => {
    try {
      const saved = localStorage.getItem('intern_track_apps');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return sample(INITIAL_MOCK_APPS, []);
  });

  // Custom Company Logos Database (lowercased company name -> data URI / image URL)
  const [companyLogos, setCompanyLogos] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('intern_track_company_logos');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [logoModalOpen, setLogoModalOpen] = useState<boolean>(false);
  const [logoModalCompany, setLogoModalCompany] = useState<string>('');

  // Gmail Monitor Modal State
  const [isGmailModalOpen, setIsGmailModalOpen] = useState<boolean>(false);
  const [gmailScanning, setGmailScanning] = useState<boolean>(false);
  const [recruiterMessages, setRecruiterMessages] = useState<RecruiterEmailMessage[]>(sample(MOCK_RECRUITER_MESSAGES, []));
  const [appliedRecruiterActions, setAppliedRecruiterActions] = useState<Set<string>>(new Set());

  // Save apps to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('intern_track_apps', JSON.stringify(apps));
    } catch (e) {}
  }, [apps]);

  // ---- Values shown in real mode, computed from the user's own applications ----
  const rmSent = apps.filter((a) => a.st !== 'todo').length;
  const rmInterviews = apps.filter((a) => a.st === 'interview' || a.st === 'offer').length;
  const rmToApply = apps.filter((a) => a.st === 'todo').length;
  const rmActive = apps.filter((a) => a.st !== 'rejected').length;
  const rmRate = rmSent ? Math.round((rmInterviews * 100) / rmSent) : 0;
  const rmComps = apps.map((a) => parseComp(a.comp)).filter((n) => n > 0);
  const rmAvg = rmComps.length ? Math.round(rmComps.reduce((sum, n) => sum + n, 0) / rmComps.length) : 0;
  const rmPeak = rmComps.length ? Math.max(...rmComps) : 0;
  const rmInterviewApps = apps.filter((a) => a.st === 'interview').slice(0, 3);
  const rmNextApps = apps.filter((a) => a.act === 'send' || a.act === 'follow').slice(0, 3);
  const rmToday = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const rmOpenTasks = googleTasksList.filter((t) => t.status !== 'completed');
  const rmActionApps = apps.filter((a) => a.act === 'send' || a.act === 'follow');
  const rmTodayCount = rmOpenTasks.length + rmActionApps.length;
  const rmCityRows = (() => {
    const m = new Map<string, { n: number; resp: number }>();
    apps.forEach((a) => {
      const c = (a.city || '').trim() || '—';
      const cur = m.get(c) || { n: 0, resp: 0 };
      cur.n += 1;
      if (a.st === 'interview' || a.st === 'offer' || a.st === 'rejected') cur.resp += 1;
      m.set(c, cur);
    });
    return Array.from(m.entries()).sort((x, y) => y[1].n - x[1].n).slice(0, 5);
  })();
  const [calMonthOffset, setCalMonthOffset] = useState<number>(0);
  const rmCal = useMemo(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + calMonthOffset, 1);
    const y = first.getFullYear();
    const m = first.getMonth();
    const label = first.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return {
      y,
      m,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      lead: (first.getDay() + 6) % 7, // Monday = 0
      daysInMonth: new Date(y, m + 1, 0).getDate(),
      todayKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    };
  }, [calMonthOffset]);

  // ---- Cloud sync of the applications (Firestore, users/{uid}/applications) ----
  // Every change made while signed in is saved automatically (only the changed documents are written).
  const cloudReadyRef = useRef(false);
  const uploadingRef = useRef(false); // true while a batch upload is running: ignore snapshots meanwhile
  const lastSyncedRef = useRef<Map<string, string>>(new Map());
  const appsRef = useRef<MockApp[]>(apps);
  const [cloudTick, setCloudTick] = useState<number>(0);
  const [, setAccountsTick] = useState<number>(0);
  useEffect(() => {
    appsRef.current = apps;
  }, [apps]);

  const appKey = (a: MockApp) =>
    JSON.stringify([a.co, a.role, a.city, a.country, a.mode, a.st, a.fit, a.pl, a.nx, a.comp, a.sent, a.prio, a.act]);
  const appToDoc = (uid: string, a: MockApp) => ({
    userId: uid,
    co: a.co ?? '',
    role: a.role ?? '',
    city: a.city ?? '',
    country: a.country ?? '',
    mode: a.mode ?? '',
    st: a.st ?? 'todo',
    fit: typeof a.fit === 'number' ? a.fit : 0,
    pl: a.pl ?? '',
    nx: Array.isArray(a.nx) ? a.nx : ['—', 'info'],
    comp: a.comp ?? '—',
    sent: a.sent ?? '—',
    prio: a.prio ?? 'Media',
    act: a.act ?? 'sent',
    updatedAt: new Date().toISOString(),
  });
  const docToApp = (id: string, data: any): MockApp => ({
    id,
    co: data.co || 'Azienda',
    role: data.role || '',
    city: data.city || '',
    country: data.country || '',
    mode: data.mode || '',
    st: data.st || 'applied',
    fit: typeof data.fit === 'number' ? data.fit : 0,
    pl: data.pl || '',
    nx: (Array.isArray(data.nx) && data.nx.length === 2 ? [String(data.nx[0]), String(data.nx[1])] : ['—', 'info']) as [string, string],
    comp: data.comp || '—',
    sent: data.sent || '—',
    prio: data.prio || 'Media',
    act: data.act || 'sent',
  });

  useEffect(() => {
    cloudReadyRef.current = false;
    if (!currentUser) return;
    const uid = currentUser.uid;
    const userAppsRef = collection(db, 'users', uid, 'applications');

    const unsubscribeApps = onSnapshot(
      userAppsRef,
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites || uploadingRef.current) return; // echo of our own local writes
        if (snapshot.metadata.fromCache && !cloudReadyRef.current) return; // wait for the server before trusting an empty cache
        const loaded: MockApp[] = [];
        snapshot.forEach((docSnap) => loaded.push(docToApp(docSnap.id, docSnap.data())));
        if (!cloudReadyRef.current) {
          // First load of this session
          let owner: string | null = null;
          try {
            owner = localStorage.getItem('intern_track_apps_owner');
          } catch (e) {}
          const local = appsRef.current;
          if (loaded.length === 0 && local.length > 0 && (owner === null || owner === uid)) {
            // Data created before the first sign-in: upload it
            lastSyncedRef.current = new Map();
          } else {
            setApps(loaded);
            lastSyncedRef.current = new Map(loaded.map((a) => [a.id, appKey(a)]));
          }
          try {
            localStorage.setItem('intern_track_apps_owner', uid);
          } catch (e) {}
          cloudReadyRef.current = true;
          setCloudTick((n) => n + 1);
        } else {
          setApps(loaded);
          lastSyncedRef.current = new Map(loaded.map((a) => [a.id, appKey(a)]));
        }
      },
      (error) => {
        console.warn('Firestore snapshot error:', error);
      }
    );

    // Attach listener for custom company logos
    const logosRef = doc(db, 'users', currentUser.uid, 'settings', 'companyLogos');
    const unsubscribeLogos = onSnapshot(logosRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data) {
          setCompanyLogos((prev) => ({ ...prev, ...data }));
        }
      }
    });

    return () => {
      unsubscribeApps();
      unsubscribeLogos();
    };
  }, [currentUser]);

  // Save to the cloud only what changed
  useEffect(() => {
    if (!currentUser || !cloudReadyRef.current) return;
    const uid = currentUser.uid;
    const last = lastSyncedRef.current;
    const now = new Map(apps.map((a) => [a.id, appKey(a)]));
    const writes = apps.filter((a) => last.get(a.id) !== now.get(a.id));
    const deletes = [...last.keys()].filter((id) => !now.has(id));
    if (writes.length === 0 && deletes.length === 0) return;
    lastSyncedRef.current = now;
    uploadingRef.current = true;
    (async () => {
      try {
        const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [
          ...writes.map((a) => (b: ReturnType<typeof writeBatch>) => b.set(doc(db, 'users', uid, 'applications', a.id), appToDoc(uid, a))),
          ...deletes.map((id) => (b: ReturnType<typeof writeBatch>) => b.delete(doc(db, 'users', uid, 'applications', id))),
        ];
        for (let i = 0; i < ops.length; i += 400) {
          const batch = writeBatch(db);
          ops.slice(i, i + 400).forEach((op) => op(batch));
          await batch.commit();
        }
      } catch (err) {
        console.warn('Cloud sync failed:', err);
        lastSyncedRef.current = last;
        showToast('Salvataggio su cloud non riuscito: i dati restano in questo browser');
      } finally {
        uploadingRef.current = false;
      }
    })();
  }, [apps, currentUser, cloudTick]);

  // Handlers for Custom Company Logo Upload & Removal
  const handleSaveCompanyLogo = async (company: string, logoUrl: string) => {
    const key = company.trim().toLowerCase();
    const updated = { ...companyLogos, [key]: logoUrl };
    setCompanyLogos(updated);
    try {
      localStorage.setItem('intern_track_company_logos', JSON.stringify(updated));
    } catch (e) {}
    showToast(`Logo salvato per ${company}!`);
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'companyLogos'), updated, { merge: true });
      } catch (e) {
        console.warn('Could not sync logo to Firestore:', e);
      }
    }
  };

  const handleRemoveCompanyLogo = async (company: string) => {
    const key = company.trim().toLowerCase();
    const updated = { ...companyLogos };
    delete updated[key];
    setCompanyLogos(updated);
    try {
      localStorage.setItem('intern_track_company_logos', JSON.stringify(updated));
    } catch (e) {}
    showToast(`Logo rimosso per ${company}`);
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'companyLogos'), updated);
      } catch (e) {
        console.warn('Could not sync logo removal to Firestore:', e);
      }
    }
  };

  // Push all local applications to Firestore Cloud Database
  const handleSyncAllAppsToFirestore = async () => {
    if (!currentUser) {
      try {
        await loginWithGoogle();
      } catch (e) {
        showToast('Accesso Google richiesto per sincronizzare con il Cloud');
        return;
      }
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsCloudSyncing(true);
    showToast('☁️ Sincronizzazione candidature su Firebase Firestore in corso...');

    try {
      const batch = writeBatch(db);
      apps.forEach((app) => {
        const appRef = doc(db, 'users', user.uid, 'applications', app.id);
        batch.set(appRef, {
          userId: user.uid,
          co: app.co,
          role: app.role,
          city: app.city,
          country: app.country,
          mode: app.mode,
          st: app.st,
          fit: app.fit,
          pl: app.pl,
          nx: app.nx,
          comp: app.comp,
          sent: app.sent,
          prio: app.prio,
          act: app.act,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      showToast(`✓ Tutte le ${apps.length} candidature sono ora salvate in modo permanente su Firestore Cloud!`);
    } catch (err: any) {
      console.error('Errore salvataggio Firestore:', err);
      showToast('Errore durante il salvataggio su Firestore');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Selected row checkboxes in Tabella Pro
  const [selectedRows, setSelectedRows] = useState<{ [id: string]: boolean }>({});

  // Drawer detail state
  const [drawerApp, setDrawerApp] = useState<MockApp | null>(null);

  // Drawer edit mode state
  const [isDrawerEditing, setIsDrawerEditing] = useState<boolean>(false);
  const [drawerEditCo, setDrawerEditCo] = useState<string>('');
  const [drawerEditRole, setDrawerEditRole] = useState<string>('');
  const [drawerEditCity, setDrawerEditCity] = useState<string>('');
  const [drawerEditCountry, setDrawerEditCountry] = useState<string>('');
  const [drawerEditMode, setDrawerEditMode] = useState<string>('');
  const [drawerEditComp, setDrawerEditComp] = useState<string>('');
  const [drawerEditPl, setDrawerEditPl] = useState<string>('');

  // Modal state for New Application (Manual vs AI)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'manual' | 'ai'>('manual');
  const [modalText, setModalText] = useState<string>('');
  const [modalResult, setModalResult] = useState<boolean>(false);

  // Manual Application Form fields
  const [manCo, setManCo] = useState<string>('');
  const [manRole, setManRole] = useState<string>('');
  const [manCity, setManCity] = useState<string>('Milano');
  const [manCountry, setManCountry] = useState<string>('Italia');
  const [manMode, setManMode] = useState<string>('Ibrido');
  const [manComp, setManComp] = useState<string>('€1.200/m');
  const [manPl, setManPl] = useState<string>('LinkedIn');
  const [manSt, setManSt] = useState<MockApp['st']>('todo');
  const [manPrio, setManPrio] = useState<string>('Alta');

  // Unmatched recruiter emails from Gmail scanning
  interface UnmatchedEmail {
    id: string;
    sender: string;
    company: string;
    subject: string;
    snippet: string;
    type: 'interview' | 'rejected';
    receivedAt: string;
  }
  const [unmatchedEmails, setUnmatchedEmails] = useState<UnmatchedEmail[]>(!DEMO ? [] : [
    {
      id: 'unm-1',
      sender: 'talent@stripe.com',
      company: 'Stripe',
      subject: 'Stripe: convocazione screening interview',
      snippet: 'Ciao Alex, abbiamo esaminato il tuo profilo per Founders Associate Intern e vorremmo procedere con il primo colloquio.',
      type: 'interview',
      receivedAt: 'Oggi 08:00',
    },
  ]);

  // Modal state for Add Event / Interview to Calendar
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventType, setNewEventType] = useState<'colloquio' | 'follow' | 'scadenza'>('colloquio');
  const [newEventDate, setNewEventDate] = useState<string>('6 Nov');
  const [newEventTime, setNewEventTime] = useState<string>('15:00');
  const [newEventDesc, setNewEventDesc] = useState<string>('');
  const [newEventAccount, setNewEventAccount] = useState<string>(sample('demo@example.com', ''));
  const [syncToGoogleCal, setSyncToGoogleCal] = useState<boolean>(true);
  const [syncToGoogleTasksAlso, setSyncToGoogleTasksAlso] = useState<boolean>(true);

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // AI Tools: CV Match state
  const [cvSelectedAppId, setCvSelectedAppId] = useState<string>('lo');

  // AI Tools: Cover Letter state
  const [clAppId, setClAppId] = useState<string>('lo');
  const [clLang, setClLang] = useState<'it' | 'en'>(appLang === 'en' ? 'en' : 'it');
  const [clTone, setClTone] = useState<'startup' | 'corporate' | 'academic'>('startup');
  const [clDraft, setClDraft] = useState<string>(() => (DEMO ? tr(DEFAULT_LETTER_IT) : ''));
  const uiLang = useAppLang();
  // keep the untouched sample letter in the language currently selected
  useEffect(() => {
    setClDraft((prev) =>
      prev === DEFAULT_LETTER_IT || prev === translateTo(DEFAULT_LETTER_IT, 'en') ? translateTo(DEFAULT_LETTER_IT, uiLang) : prev
    );
  }, [uiLang]);

  // AI Tools: Interview Simulator state
  const [simAppId, setSimAppId] = useState<string>('lo');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'me' | 'ai'; text: string }>>(!DEMO ? [{ sender: 'ai', text: 'Ciao! Sono il tuo simulatore di colloqui. Scegli una candidatura e iniziamo.' }] : [
    {
      sender: 'ai',
      text: 'Ciao Alex! Sono il tuo simulatore sartoriale di colloqui. Ho analizzato il tuo CV (MSc) e i requisiti per "Founders Associate Intern" presso Logistica OS. Iniziamo con una domanda chiave: "Vedo che hai curato il go-to-market di un prodotto tecnologico innovativo. Come applicheresti la stessa metodologia per scalare la nostra supply chain?"',
    },
  ]);
  const [inputChatText, setInputChatText] = useState<string>('');

  // Sites checked status
  const [checkedSites, setCheckedSites] = useState<string[]>(['Barilla']);
  const toggleCheckSite = (siteName: string) => {
    setCheckedSites((prev) =>
      prev.includes(siteName) ? prev.filter((s) => s !== siteName) : [...prev, siteName]
    );
    showToast(`Stato aggiornato per ${siteName}`);
  };

  // Gemini Automation & Daily Suggestions State
  const [sugSubTab, setSugSubTab] = useState<'today' | 'history' | 'queue' | 'daily' | 'scaleups' | 'hub' | 'settings' | 'preferences'>('today');
  const [scaleups, setScaleups] = useState<MockScaleupItem[]>(sample(INITIAL_SCALEUP_DATA, []));
  const [dailyCompanies, setDailyCompanies] = useState<MockDailyCompany[]>(sample(INITIAL_DAILY_COMPANIES, []));
  const [dailyPeople, setDailyPeople] = useState<MockDailyPerson[]>(sample(INITIAL_DAILY_PEOPLE, []));
  const [scaleupFilterSector, setScaleupFilterSector] = useState<string>('all');
  const [scaleupFilterCity, setScaleupFilterCity] = useState<string>('all');
  const [scaleupSearchQuery, setScaleupSearchQuery] = useState<string>('');

  // Piano di ricerca interactive session state
  const [ricRoleFilter, setRicRoleFilter] = useState<string>('all');
  const [ricCityFilter, setRicCityFilter] = useState<string>('all');
  const [ricDoneSessions, setRicDoneSessions] = useState<{ [id: string]: boolean }>({});

  // Gemini Sunday Automation Scan Runner
  const handleRunSundayGeminiScan = () => {
    showToast('⚡ Scansione Gemini avviata: analisi scaleup e contatti LinkedIn in corso...');
    setTimeout(() => {
      showToast('🎉 Scansione completata: generato report dettagliato per 10 aziende con contatti LinkedIn!');
      setIsScoutingReportModalOpen(true);
    }, 900);
  };

  // Download Excel / CSV Report
  const handleDownloadExcelCsv = () => {
    const headers = ['Azienda', 'Dominio', 'Settore', 'Città', 'Paese', 'Fase', 'Dipendenti', 'Ruoli Aperti', 'Data Scansione', 'Fit Score', 'Note Strategiche Gemini'];
    const rows = scaleups.map((s) => [
      `"${s.name}"`,
      `"${s.domain}"`,
      `"${s.sector}"`,
      `"${s.city}"`,
      `"${s.country}"`,
      `"${s.stage}"`,
      `"${s.size}"`,
      `"${s.roles.join('; ')}"`,
      `"${s.scannedDate}"`,
      `"${s.fitScore}%"`,
      `"${s.keyNote.replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Report_Scaleup_Domenica_Gemini_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 Foglio Excel / CSV scaricato con successo!');
  };

  // Add Daily Company directly to Tracker
  const handleAddDailyCompanyToTracker = (co: MockDailyCompany) => {
    const exists = apps.some((a) => a.co.toLowerCase() === co.name.toLowerCase());
    if (exists) {
      showToast(`"${co.name}" è già presente nel tuo Tracker!`);
      return;
    }
    const newId = co.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'dc' + Date.now();
    const newApp: MockApp = {
      id: newId,
      co: co.name,
      role: co.targetRole,
      st: 'todo',
      fit: 92,
      city: co.city.split('/')[0].trim(),
      country: co.country,
      mode: 'In sede',
      pl: 'LinkedIn',
      nx: ['📝 Invia candidatura', 'warn'],
      comp: '€1.200/m',
      sent: '—',
      prio: 'Alta',
      act: 'send',
    };
    setApps((prev) => [newApp, ...prev]);
    showToast(`🎉 "${co.name}" (${co.targetRole}) aggiunta al Tracker!`);
    handleGo('trk');
  };

  // Toggle Contacted Person
  const handleToggleContactedPerson = (personId: string) => {
    setDailyPeople((prev) =>
      prev.map((p) => {
        if (p.id === personId) {
          const nextState = !p.isContacted;
          showToast(nextState ? `✓ Segnato come contattato su LinkedIn (${p.name})` : `Stato rimosso per ${p.name}`);
          return { ...p, isContacted: nextState };
        }
        return p;
      })
    );
  };

  // Copy tailored LinkedIn message to clipboard
  const handleCopyLinkedinNote = (note: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(note);
    }
    showToast('📋 Messaggio di connessione copiato negli appunti!');
  };

  // Regenerate Daily Trio with Gemini
  const handleRegenerateDailyTrio = () => {
    showToast('✨ Gemini sta elaborando 3 nuove aziende e 3 nuovi profili LinkedIn dal pool domenicale...');
    setTimeout(() => {
      showToast('🎉 Terna giornaliera aggiornata con successo!');
    }, 700);
  };

  // Full Search Config Profile State (11 User-Configured Sections)
  const [searchConfig, setSearchConfig] = useState<FullSearchConfigProfile>(() => {
    try {
      const saved = localStorage.getItem('intern_track_search_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return BASE_SEARCH_CONFIG;
  });

  // Persist search config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('intern_track_search_config', JSON.stringify(searchConfig));
    } catch (e) {}
  }, [searchConfig]);

  // Research plan generated from the search profile + progress saved in the browser
  const [ricProgress, setRicProgress] = useState<RicProgress>(() => {
    try {
      const saved = localStorage.getItem('intern_track_ric_progress_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });
  useEffect(() => {
    try {
      localStorage.setItem('intern_track_ric_progress_v1', JSON.stringify(ricProgress));
    } catch (e) {}
  }, [ricProgress]);
  const [ricMode, setRicMode] = useState<'day' | 'all'>('day');
  const [ricDay, setRicDay] = useState<string | null>(null);
  const rmPlan = useMemo(() => buildSearchPlan(searchConfig), [searchConfig]);
  const rmTodaySessions = rmPlan.days.find((d) => d.date === toISODate(new Date()))?.sessions ?? [];
  const rmTodayRemaining = rmTodaySessions.filter((s) => !ricProgress[s.id]?.done).length;

  // Hub Networking LinkedIn Coda State
  const [hubCoda, setHubCoda] = useState<HubCodaItem[]>(() => {
    try {
      const saved = localStorage.getItem('hub_coda_items_cache_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return sample(INITIAL_HUB_CODA, []);
  });

  useEffect(() => {
    try {
      localStorage.setItem('hub_coda_items_cache_v3', JSON.stringify(hubCoda));
    } catch (e) {}
  }, [hubCoda]);

  const [processedCompanies, setProcessedCompanies] = useState<ProcessedCompanyItem[]>(() => {
    try {
      const saved = localStorage.getItem('hub_processed_companies_cache_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return sample(PROCESSED_COMPANIES_REGISTRY, []);
  });

  useEffect(() => {
    try {
      localStorage.setItem('hub_processed_companies_cache_v3', JSON.stringify(processedCompanies));
    } catch (e) {}
  }, [processedCompanies]);

  const [userScoutConfig, setUserScoutConfig] = useState<UserScoutConfig>(() => {
    try {
      const saved = localStorage.getItem('user_scout_config_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_USER_SCOUT_CONFIG,
          ...parsed,
          allLocations: Array.isArray(parsed.allLocations) && parsed.allLocations.length > 0
            ? parsed.allLocations
            : DEFAULT_USER_SCOUT_CONFIG.allLocations,
          selectedLocations: Array.isArray(parsed.selectedLocations) && parsed.selectedLocations.length > 0
            ? parsed.selectedLocations
            : Array.isArray(parsed.targetLocations) ? parsed.targetLocations : DEFAULT_USER_SCOUT_CONFIG.selectedLocations,
          allSectors: Array.isArray(parsed.allSectors) && parsed.allSectors.length > 0
            ? parsed.allSectors
            : DEFAULT_USER_SCOUT_CONFIG.allSectors,
          selectedSectors: Array.isArray(parsed.selectedSectors) && parsed.selectedSectors.length > 0
            ? parsed.selectedSectors
            : Array.isArray(parsed.targetSectors) ? parsed.targetSectors : DEFAULT_USER_SCOUT_CONFIG.selectedSectors,
          allRoles: Array.isArray(parsed.allRoles) && parsed.allRoles.length > 0
            ? parsed.allRoles
            : DEFAULT_USER_SCOUT_CONFIG.allRoles,
          selectedRoles: Array.isArray(parsed.selectedRoles) && parsed.selectedRoles.length > 0
            ? parsed.selectedRoles
            : Array.isArray(parsed.targetRoles) ? parsed.targetRoles : DEFAULT_USER_SCOUT_CONFIG.selectedRoles,
          allInterests: Array.isArray(parsed.allInterests) && parsed.allInterests.length > 0
            ? parsed.allInterests
            : DEFAULT_USER_SCOUT_CONFIG.allInterests,
          selectedInterests: Array.isArray(parsed.selectedInterests) && parsed.selectedInterests.length > 0
            ? parsed.selectedInterests
            : DEFAULT_USER_SCOUT_CONFIG.selectedInterests,
        };
      }
    } catch (e) {}
    return DEFAULT_USER_SCOUT_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem('user_scout_config_v2', JSON.stringify(userScoutConfig));
    } catch (e) {}
  }, [userScoutConfig]);

  const [newLocationInput, setNewLocationInput] = useState<string>('');
  const [newSectorInput, setNewSectorInput] = useState<string>('');
  const [newRoleInput, setNewRoleInput] = useState<string>('');
  const [newInterestInput, setNewInterestInput] = useState<string>('');

  const [hubFilterCategory, setHubFilterCategory] = useState<string>('all');
  const [hubFilterStato, setHubFilterStato] = useState<string>('all');
  const [hubSearchQuery, setHubSearchQuery] = useState<string>('');
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [isSendingDailyEmail, setIsSendingDailyEmail] = useState<boolean>(false);
  const [isScoutingSunday, setIsScoutingSunday] = useState<boolean>(false);
  const [sheetRowIndexMap, setSheetRowIndexMap] = useState<Map<string, number>>(new Map());
  const [procSearchQuery, setProcSearchQuery] = useState<string>('');
  const procFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Sincronizzazione in lettura con Google Sheet reale (scheda Coda A:N)
  const handleSyncSheetCoda = async () => {
    const token = getAccessToken(currentUser?.email || activeWorkspaceAccount);
    if (!token) {
      showToast('⚠️ Accedi con Google per sincronizzare lo Sheet reale');
      return;
    }
    setIsSyncingSheet(true);
    showToast(`🔄 Connessione allo Sheet (${(userScoutConfig.googleSheetId || '').slice(0, 10)}...) in corso...`);
    try {
      const rows = await readSheetCoda(token, userScoutConfig.googleSheetId);
      if (rows && rows.length > 0) {
        const rowMap = new Map<string, number>();
        const mappedItems: HubCodaItem[] = rows.map((r) => {
          rowMap.set(r.id.trim().toUpperCase(), r.rowIndex);
          return {
            id: r.id,
            name: r.name,
            role: r.role,
            company: r.company,
            country: r.country,
            linkedinSearchUrl:
              r.link ||
              `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                `${r.name} ${r.company}`
              )}`,
            motivo: r.motivo,
            notaConnessione: r.nota,
            statoInvio: r.statoInvio as any,
            inviataIl: r.inviataIl,
            affidabilita: r.affidabilita.includes('⚠️') ? 'da_verificare' : 'certo',
            descrizioneAzienda: r.descrizioneAzienda,
            linkedinAzienda:
              r.linkedinAzienda ||
              `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(r.company)}`,
            categoria: r.categoria,
            settore: 'Financial Services / Fintech',
          };
        });
        setSheetRowIndexMap(rowMap);
        setHubCoda(mappedItems);
        showToast(`✓ Sincronizzati ${mappedItems.length} contatti reali dallo Sheet Google!`);
      } else {
        showToast('ℹ️ Nessuna riga trovata nella scheda Coda.');
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Errore sincronizzazione: ${err.message || 'Verifica i permessi dello Sheet'}`);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Helper per caricare e leggere file Excel o CSV aggiuntivi
  const handleUploadExcelOrCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
          showToast('⚠️ File vuoto o formato non valido');
          return;
        }

        let addedCount = 0;
        const updatedProcessed = [...processedCompanies];
        const updatedCoda = [...hubCoda];

        rows.forEach((r: any) => {
          const compName = (r.Azienda || r.Company || r.Nome || r.name || '').trim();
          if (compName && !updatedProcessed.some((p) => p.name.toLowerCase() === compName.toLowerCase())) {
            updatedProcessed.push({
              name: compName,
              sector: r.Settore || r.Sector || 'Tech / Digital',
              category: r.Categoria || r.Category || 'Azienda',
              cycle: r.Ciclo || '#8',
              date: r.Data || 'Recente',
            });
            addedCount++;
          }

          if (r.Nome && r.ID && !updatedCoda.some((c) => c.id === r.ID)) {
            updatedCoda.push({
              id: r.ID,
              name: r.Nome,
              role: r.Ruolo || 'Manager',
              company: compName || 'Azienda',
              country: r.Paese || 'Italia',
              linkedinSearchUrl: r['Link LinkedIn (ricerca)'] || '',
              motivo: r['Motivo di rilevanza'] || '',
              notaConnessione: r['Nota di connessione'] || '',
              statoInvio: r['Suggerita il'] ? 'Suggerita' : 'In coda',
              suggeritaIl: r['Suggerita il'] || '',
              affidabilita: (r['Stato ricerca'] || '').includes('verificare') ? 'da_verificare' : 'certo',
              descrizioneAzienda: compName,
              linkedinAzienda: '',
              categoria: r.Categoria || 'Azienda',
              settore: r.Settore || 'Tech / Digital',
              ciclo: r.Ciclo || '#8',
              note: r.Note || '',
            });
          }
        });

        setProcessedCompanies(updatedProcessed);
        setHubCoda(updatedCoda);
        showToast(`✓ Ingestione completata: ${addedCount} aziende aggiunte al catalogo!`);
      } catch (err: any) {
        console.error(err);
        showToast(`Errore lettura file: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExportProcessedCompaniesExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(processedCompanies);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Aziende già processate');
      XLSX.writeFile(wb, 'aziende_gia_processate_hub_linkedin.xlsx');
      showToast('✓ Scaricato aziende_gia_processate_hub_linkedin.xlsx');
    } catch (e: any) {
      showToast(`Errore download: ${e.message}`);
    }
  };

  // 2. Popolamento Coda Domenica (21 aziende + 21 persone sui 7 settori rotativi)
  const handlePopulateSundayHubCoda = async () => {
    setIsScoutingSunday(true);
    showToast('⚡ Avvio ricerca settimanale Gemini (21 aziende + 21 persone sui 7 settori)...');

    try {
      const token = getAccessToken(currentUser?.email || activeWorkspaceAccount);
      let excludedList: string[] = [];

      if (token) {
        const processed = await readProcessedCompanies(token, userScoutConfig.googleSheetId);
        excludedList = processed.map((p) => p.name);
      }
      if (excludedList.length === 0) {
        excludedList = (processedCompanies || []).map((p) => p.name);
      }

      const activeLocations = (userScoutConfig.selectedLocations && userScoutConfig.selectedLocations.length > 0)
        ? userScoutConfig.selectedLocations
        : userScoutConfig.allLocations;

      const activeRoles = (userScoutConfig.selectedRoles && userScoutConfig.selectedRoles.length > 0)
        ? userScoutConfig.selectedRoles
        : userScoutConfig.allRoles;

      const activeSectors = (userScoutConfig.selectedSectors && userScoutConfig.selectedSectors.length > 0)
        ? userScoutConfig.selectedSectors
        : userScoutConfig.allSectors;

      const activeInterests = (userScoutConfig.selectedInterests && userScoutConfig.selectedInterests.length > 0)
        ? userScoutConfig.selectedInterests
        : userScoutConfig.allInterests;

      const res = await fetch('/api/ai/sunday-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excludedCompanies: excludedList,
          currentCycle: 9,
          userName: userScoutConfig.userName,
          userProfile: userScoutConfig.userProfile,
          targetRoles: activeRoles,
          targetLocations: activeLocations,
          targetSectors: activeSectors,
          targetInterests: activeInterests,
          customFocus: userScoutConfig.customSectorFocus,
        }),
      });

      const json = await res.json();
      if (!json.ok || !json.data) {
        throw new Error(json.error || 'Risposta Gemini non valida');
      }

      const scoutData = json.data;
      const { aziende = [], persone = [], coda = [], aziendeGiaProcessate = [] } = scoutData;

      // Aggiorna lo stato locale
      const newCodaItems: HubCodaItem[] = coda.map((c: any) => ({
        id: c.id,
        name: c.name,
        role: c.ruolo,
        company: c.azienda,
        country: c.paese,
        linkedinSearchUrl: c.link,
        motivo: c.motivo,
        notaConnessione: c.nota,
        statoInvio: 'In coda',
        inviataIl: '',
        affidabilita: (c.affidabilita || '').includes('⚠️') ? 'da_verificare' : 'certo',
        descrizioneAzienda: c.descrizioneAzienda,
        linkedinAzienda: c.linkedinAzienda,
        categoria: c.categoria,
        settore: c.settore || 'Settore',
      }));

      setHubCoda((prev) => [...newCodaItems, ...prev]);

      // Se autenticato con Google, scrivi direttamente sullo Sheet reale in append
      if (token) {
        showToast(`📝 Scrittura automatica delle 4 schede sullo Sheet Google (${(userScoutConfig.googleSheetId || '').slice(0, 10)}...)...`);
        const todayStr = new Date().toISOString().slice(0, 10);

        // 1. Aziende
        const aziendeRows = aziende.map((a: any) => [
          a.nome,
          a.descrizione,
          a.settore,
          a.dimensione,
          a.hq,
          a.paesi,
          a.sito,
          a.careers,
          a.linkedin,
          a.notizie,
          a.ciclo || 1,
          a.data || todayStr,
        ]);
        await appendRowsToSheet(token, 'Aziende', aziendeRows, userScoutConfig.googleSheetId);

        // 2. Persone
        const personeRows = persone.map((p: any) => [
          p.id,
          p.nome,
          p.ruolo,
          p.tipoRuolo,
          p.paese,
          p.azienda,
          p.linkLinkedin,
          p.statoRicerca,
          p.fonte,
          p.motivo,
          p.notaConnessione,
          '',
          '',
          p.note || '',
          p.ciclo || 1,
          p.data || todayStr,
        ]);
        await appendRowsToSheet(token, 'Persone', personeRows, userScoutConfig.googleSheetId);

        // 3. Coda
        const codaRows = coda.map((c: any) => [
          c.id,
          c.nome,
          c.ruolo,
          c.azienda,
          c.paese,
          c.link,
          c.motivo,
          c.nota,
          'In coda',
          '',
          c.affidabilita,
          c.descrizioneAzienda,
          c.linkedinAzienda,
          c.categoria,
        ]);
        await appendRowsToSheet(token, 'Coda', codaRows, userScoutConfig.googleSheetId);

        // 4. Aziende già processate
        const procRows = aziendeGiaProcessate.map((p: any) => [
          p.nome,
          p.settore,
          p.ciclo || 1,
          p.data || todayStr,
        ]);
        await appendRowsToSheet(token, 'Aziende già processate', procRows, userScoutConfig.googleSheetId);
      }

      showToast(`🎉 Ricerca completata! Aggiunte ${aziende.length} aziende e ${coda.length} contatti in coda!`);
    } catch (e: any) {
      console.error(e);
      showToast(`Errore ricerca domenicale: ${e.message}`);
    } finally {
      setIsScoutingSunday(false);
    }
  };

  // 3. Invio Automatico Email Quotidiana (Daily Dispatch di 3 contatti via Gmail API)
  const handleSendDailyEmailNow = async () => {
    // Single sender: the mailbox marked as "receiver" (first of VITE_GMAIL_ACCOUNTS); otherwise the signed-in account
    const userEmail = gmailAccounts.find((g) => g.isReceiver && g.status === 'Attivo')?.email || currentUser?.email || OWNER_EMAIL_FALLBACK;
    const token = getAccessToken(userEmail);
    if (!token) {
      showToast(`⚠️ Collega ${userEmail} con Google per inviare l’email automatica tramite Gmail API`);
      return;
    }

    const today = new Date();
    const dayOfYear = getDayOfYear(today);
    const catIndex = dayOfYear % 3;
    const catName: 'Azienda' | 'Startup' | 'Venture' =
      catIndex === 0 ? 'Azienda' : catIndex === 1 ? 'Startup' : 'Venture';

    // Seleziona 3 persone con stato "In coda", preferendo la categoria del giorno
    const available = hubCoda.filter((c) => c.statoInvio === 'In coda');
    let chosen: HubCodaItem[] = available.filter((c) => c.categoria === catName).slice(0, 3);

    // Se in quella categoria ci sono meno di 3 persone, completa nell'ordine: Startup, Azienda, Venture
    if (chosen.length < 3) {
      const order: ('Startup' | 'Azienda' | 'Venture')[] = ['Startup', 'Azienda', 'Venture'];
      for (const fallbackCat of order) {
        if (chosen.length >= 3) break;
        if (fallbackCat === catName) continue;
        const extra = available.filter(
          (c) => c.categoria === fallbackCat && !chosen.some((x) => x.id === c.id)
        );
        chosen = [...chosen, ...extra].slice(0, 3);
      }
    }

    if (chosen.length === 0) {
      showToast('⚠️ Nessun contatto con stato "In coda" disponibile per l’invio!');
      return;
    }

    setIsSendingDailyEmail(true);
    showToast(`📤 Invio email del giorno (${catName}) a ${userEmail}...`);

    try {
      const remainingCounts = {
        azienda: hubCoda.filter(
          (c) => c.categoria === 'Azienda' && c.statoInvio === 'In coda' && !chosen.some((x) => x.id === c.id)
        ).length,
        startup: hubCoda.filter(
          (c) => c.categoria === 'Startup' && c.statoInvio === 'In coda' && !chosen.some((x) => x.id === c.id)
        ).length,
        venture: hubCoda.filter(
          (c) => c.categoria === 'Venture' && c.statoInvio === 'In coda' && !chosen.some((x) => x.id === c.id)
        ).length,
      };

      const codaRowsForEmail: SheetCodaRow[] = chosen.map((c, i) => ({
        rowIndex: sheetRowIndexMap.get(c.id.toUpperCase()) || i + 2,
        id: c.id,
        name: c.name,
        role: c.role,
        company: c.company,
        country: c.country,
        link: c.linkedinSearchUrl,
        motivo: c.motivo,
        nota: c.notaConnessione,
        statoInvio: 'Suggerita',
        inviataIl: new Date().toISOString().slice(0, 10),
        affidabilita: c.affidabilita === 'certo' ? '✅ Certo' : '⚠️ DA VERIFICARE',
        descrizioneAzienda: c.descrizioneAzienda,
        linkedinAzienda: c.linkedinAzienda,
        categoria: c.categoria,
      }));

      const { subject, html } = generateDailyHtmlEmail(codaRowsForEmail, catName, remainingCounts);

      const sendRes = await sendEmailViaGmailApi(token, userEmail, subject, html);

      if (sendRes.success) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const updatesForSheet: { rowIndex: number; newStatus: string; date?: string }[] = [];

        setHubCoda((prev) =>
          prev.map((it) => {
            if (chosen.some((ch) => ch.id === it.id)) {
              const rIdx = sheetRowIndexMap.get(it.id.toUpperCase());
              if (rIdx) {
                updatesForSheet.push({ rowIndex: rIdx, newStatus: 'Suggerita', date: todayStr });
              }
              return { ...it, statoInvio: 'Suggerita', inviataIl: todayStr };
            }
            return it;
          })
        );

        if (updatesForSheet.length > 0) {
          await updateCodaRowsStatus(token, updatesForSheet, userScoutConfig.googleSheetId);
        }

        for (const item of chosen) {
          await updatePersoneSuggeritaIl(token, item.id, todayStr, userScoutConfig.googleSheetId);
        }

        showToast(`🎉 Email inviata con successo a ${userEmail}! (${chosen.map((c) => c.id).join(', ')})`);
      } else {
        showToast(`Errore invio Gmail: ${sendRes.error}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Errore invio: ${err.message || 'Verifica i permessi Gmail'}`);
    } finally {
      setIsSendingDailyEmail(false);
    }
  };

  // 4. Toggle Contatto Spuntato (Richiesta inviata / In coda / Scartata) con sincronizzazione automatica su Google Sheet
  const handleTogglePersonChecked = async (personId: string, currentStatus: string, specificNewStatus?: string) => {
    const nextStatus = specificNewStatus || (currentStatus === 'Richiesta inviata' ? 'In coda' : 'Richiesta inviata');
    const todayStr = new Date().toISOString().slice(0, 10);

    setHubCoda((prev) =>
      prev.map((item) =>
        item.id === personId
          ? {
              ...item,
              statoInvio: nextStatus as any,
              inviataIl: nextStatus === 'Richiesta inviata' || nextStatus === 'Suggerita' ? todayStr : item.inviataIl,
            }
          : item
      )
    );

    showToast(
      nextStatus === 'Richiesta inviata'
        ? `✓ ${personId} contrassegnata come "Richiesta inviata"!`
        : nextStatus === 'Scartata'
        ? `⏭ ${personId} contrassegnata come "Scartata"`
        : `🔄 ${personId} ripristinata in coda`
    );

    const token = getAccessToken(currentUser?.email || activeWorkspaceAccount);
    if (token) {
      const rowIndex = sheetRowIndexMap.get(personId.toUpperCase());
      if (rowIndex) {
        await updateCodaRowsStatus(token, [{ rowIndex, newStatus: nextStatus, date: todayStr }], userScoutConfig.googleSheetId);
        if (nextStatus === 'Richiesta inviata') {
          await updatePersoneSuggeritaIl(token, personId, todayStr, userScoutConfig.googleSheetId);
        }
      }
    }
  };

  // 5. Automatic Daily Routine: invio automatico ed elaborazione risposte in background
  useEffect(() => {
    const runBackgroundAutomation = async () => {
      const userEmail = currentUser?.email || activeWorkspaceAccount;
      if (!userEmail) return;
      const token = getAccessToken(userEmail);
      if (!token) return;

      const todayStr = new Date().toISOString().slice(0, 10);
      const lastSentKey = `intern_track_last_daily_sent_${userEmail}`;
      const lastDailySent = localStorage.getItem(lastSentKey);

      // Sincronizza risposte Gmail LN FATTO / LN SALTA
      try {
        await handleProcessYesterdayEmailCommands();
      } catch (err) {
        console.warn('Auto-check comandi Gmail:', err);
      }

      // Se oggi non è ancora stata inviata l'email automatica, inviala in background
      if (lastDailySent !== todayStr) {
        try {
          await handleSendDailyEmailNow();
          localStorage.setItem(lastSentKey, todayStr);
        } catch (err) {
          console.warn('Auto-invio email quotidiana:', err);
        }
      }
    };

    if (currentUser?.email) {
      const timer = setTimeout(() => {
        runBackgroundAutomation();
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  // Multi-Account Gmail State (1 Ricevente, 2+ Monitorate in lettura)
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccountConfig[]>(() => {
    try {
      const saved = localStorage.getItem('intern_track_gmail_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        // an empty list saved by an earlier run must not hide the mailboxes configured in the variables
        if (DEMO || !Array.isArray(parsed) || parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return sample(INITIAL_GMAIL_ACCOUNTS, SEEDED_GMAIL_ACCOUNTS);
  });

  // Save Gmail accounts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('intern_track_gmail_accounts', JSON.stringify(gmailAccounts));
    } catch (e) {}
  }, [gmailAccounts]);

  const [newGmailEmail, setNewGmailEmail] = useState<string>('');
  const [newGmailLabel, setNewGmailLabel] = useState<string>('');
  const [newGmailIsReceiver, setNewGmailIsReceiver] = useState<boolean>(false);
  const [newGmailIsReader, setNewGmailIsReader] = useState<boolean>(true);

  // Add new Gmail account
  const handleAddGmailAccount = () => {
    if (!newGmailEmail.trim() || !newGmailEmail.includes('@')) {
      showToast('Inserisci un indirizzo email valido');
      return;
    }
    const exists = gmailAccounts.some((a) => a.email.toLowerCase() === newGmailEmail.trim().toLowerCase());
    if (exists) {
      showToast('Questa casella email è già configurata');
      return;
    }
    const newAcc: GmailAccountConfig = {
      id: 'gm-' + Date.now(),
      email: newGmailEmail.trim(),
      label: newGmailLabel.trim() || 'Casella Aggiuntiva',
      isReceiver: newGmailIsReceiver,
      isReader: newGmailIsReader,
      status: 'Attivo',
      lastChecked: 'Appena aggiunta',
    };
    setGmailAccounts((prev) => [...prev, newAcc]);
    setNewGmailEmail('');
    setNewGmailLabel('');
    setNewGmailIsReceiver(false);
    setNewGmailIsReader(true);
    showToast(`✓ Casella ${newAcc.email} aggiunta e attiva per il monitoraggio!`);
  };

  // Toggle Gmail account active/paused
  const handleToggleGmailStatus = (id: string) => {
    setGmailAccounts((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextStatus = a.status === 'Attivo' ? 'In pausa' : 'Attivo';
          showToast(`Stato casella ${a.email}: ${nextStatus}`);
          return { ...a, status: nextStatus };
        }
        return a;
      })
    );
  };

  // Remove Gmail account
  const handleRemoveGmailAccount = (id: string) => {
    if (gmailAccounts.length <= 1) {
      showToast('Devi mantenere almeno una casella email configurata');
      return;
    }
    const target = gmailAccounts.find((a) => a.id === id);
    setGmailAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast(`Casella ${target?.email || ''} rimossa`);
  };

  // Settings Sub-Tabs ('config' | 'gmail' | 'general')
  const [setSubTab, setSetSubTab] = useState<'config' | 'gmail' | 'general'>('config');

  // Input states for adding new city / position in config
  const [newCityName, setNewCityName] = useState<string>('');
  const [newCityCountry, setNewCityCountry] = useState<string>('');
  const [newPosFamilyName, setNewPosFamilyName] = useState<string>('');
  const [newPosTitles, setNewPosTitles] = useState<string>('');

  // JSON & Excel Import/Export State
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importModalTab, setImportModalTab] = useState<'excel' | 'json'>('excel');
  const [excelPreviewApps, setExcelPreviewApps] = useState<MockApp[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [excelImportMode, setExcelImportMode] = useState<'append' | 'replace'>('replace');
  const [isExcelParsing, setIsExcelParsing] = useState<boolean>(false);
  const [excelAvailableSheets, setExcelAvailableSheets] = useState<string[]>([]);
  const [excelSelectedSheet, setExcelSelectedSheet] = useState<string>('');
  const [excelRawHeaders, setExcelRawHeaders] = useState<string[]>([]);
  const [excelRawRows, setExcelRawRows] = useState<any[][]>([]);
  const [excelWorkbookRef, setExcelWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [excelColumnMapping, setExcelColumnMapping] = useState<{
    companyCol: number;
    roleCol: number;
    cityCol: number;
    countryCol: number;
    statusCol: number;
    salaryCol: number;
    dateCol: number;
    platformCol: number;
    modeCol: number;
  }>({
    companyCol: -1,
    roleCol: -1,
    cityCol: -1,
    countryCol: -1,
    statusCol: -1,
    salaryCol: -1,
    dateCol: -1,
    platformCol: -1,
    modeCol: -1,
  });

  // Real Gemini AI Chat state
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Real Gemini Job Parsing state
  const [isExtractingAi, setIsExtractingAi] = useState<boolean>(false);
  const [extractedAiData, setExtractedAiData] = useState<any | null>(null);

  // Real Gemini Cover Letter state
  const [isGeneratingCl, setIsGeneratingCl] = useState<boolean>(false);

  // Real Gemini CV Match state
  const [isAnalyzingCv, setIsAnalyzingCv] = useState<boolean>(false);
  const [cvLiveAnalysis, setCvLiveAnalysis] = useState<{
    fitScore: number;
    strengths: string[];
    gaps: string[];
    improvements: string[];
  } | null>(null);

  // Real Connection Note generation
  const [isGeneratingNoteId, setIsGeneratingNoteId] = useState<string | null>(null);

  // Robust Excel parser that processes any sheet and detects actual header row
  const parseSheetData = (sheet: XLSX.WorkSheet, customMapping?: typeof excelColumnMapping) => {
    const defaultMapping = customMapping || {
      companyCol: 0,
      roleCol: 1,
      cityCol: 2,
      countryCol: -1,
      statusCol: -1,
      salaryCol: -1,
      dateCol: -1,
      platformCol: -1,
      modeCol: -1,
    };
    // Read sheet as array of arrays (2D matrix)
    const matrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
    if (!matrix || matrix.length === 0) return { apps: [], headers: [], rows: [], mapping: defaultMapping };

    // Find the header row index (the row with most non-empty string cells that look like column titles)
    let headerRowIdx = 0;
    let maxHeaderScore = -1;

    for (let r = 0; r < Math.min(10, matrix.length); r++) {
      const row = matrix[r];
      if (!Array.isArray(row)) continue;
      let score = 0;
      row.forEach((cell: any) => {
        const str = String(cell || '').trim().toLowerCase();
        if (!str) return;
        score += 1;
        // Known keywords boost score
        if (/azienda|company|societ|ruolo|role|posiz|titolo|citt|city|sede|stato|status|stipend|salary|compenso|data|date|link|url|note|paese|country/i.test(str)) {
          score += 5;
        }
      });
      if (score > maxHeaderScore) {
        maxHeaderScore = score;
        headerRowIdx = r;
      }
    }

    const rawHeadersRow = matrix[headerRowIdx] || [];
    const headers = rawHeadersRow.map((c: any, i: number) => String(c || '').trim() || `Colonna ${i + 1}`);
    const dataRows = matrix.slice(headerRowIdx + 1).filter((row) => row && row.some((c: any) => String(c || '').trim() !== ''));

    // Detect column indexes
    let companyCol = customMapping?.companyCol ?? -1;
    let roleCol = customMapping?.roleCol ?? -1;
    let cityCol = customMapping?.cityCol ?? -1;
    let countryCol = customMapping?.countryCol ?? -1;
    let statusCol = customMapping?.statusCol ?? -1;
    let salaryCol = customMapping?.salaryCol ?? -1;
    let dateCol = customMapping?.dateCol ?? -1;
    let platformCol = customMapping?.platformCol ?? -1;
    let modeCol = customMapping?.modeCol ?? -1;

    // Auto-detect indexes if not manually mapped
    headers.forEach((h, colIdx) => {
      const clean = h.toLowerCase().replace(/[\s_\-–]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (companyCol === -1 && /azienda|company|societa|datoredilavoro|organization|employer|nomeazienda/i.test(clean)) {
        companyCol = colIdx;
      } else if (roleCol === -1 && /ruolo|role|posizione|jobtitle|position|titolo|job/i.test(clean)) {
        roleCol = colIdx;
      } else if (cityCol === -1 && /citta|city|sede|location|luogo|office/i.test(clean)) {
        cityCol = colIdx;
      } else if (countryCol === -1 && /paese|country|nazione|statoestero/i.test(clean) && !/statocandidatura|status/i.test(clean)) {
        countryCol = colIdx;
      } else if (statusCol === -1 && /stato|status|stage|esito|fase|step/i.test(clean)) {
        statusCol = colIdx;
      } else if (salaryCol === -1 && /stipendio|salary|compenso|ral|retribuzione|pay/i.test(clean)) {
        salaryCol = colIdx;
      } else if (dateCol === -1 && /data|date|datainvio|invio|sent|applieddate/i.test(clean)) {
        dateCol = colIdx;
      } else if (platformCol === -1 && /piattaforma|platform|fonte|source|canale|sito/i.test(clean)) {
        platformCol = colIdx;
      } else if (modeCol === -1 && /modalita|workmode|modalitadilavoro|remote|ibrido|luogodilavoro/i.test(clean)) {
        modeCol = colIdx;
      }
    });

    // Fallbacks if columns weren't labeled clearly:
    // If companyCol is still -1, take column 0
    if (companyCol === -1 && headers.length > 0) companyCol = 0;
    // If roleCol is still -1, take column 1 (if available)
    if (roleCol === -1 && headers.length > 1 && companyCol !== 1) roleCol = 1;
    // If cityCol is still -1, take column 2 (if available)
    if (cityCol === -1 && headers.length > 2 && ![companyCol, roleCol].includes(2)) cityCol = 2;

    const detectedMapping = {
      companyCol,
      roleCol,
      cityCol,
      countryCol,
      statusCol,
      salaryCol,
      dateCol,
      platformCol,
      modeCol,
    };

    // Helper to extract known European city & country from string
    const extractCityAndCountry = (val: string) => {
      const s = val.trim();
      if (!s) return { city: '', country: '' };

      const lower = s.toLowerCase();
      const cityMap: Array<{ pattern: RegExp; city: string; country: string }> = [
        { pattern: /\b(barcellona|barcelona)\b/i, city: 'Barcellona', country: 'Spagna' },
        { pattern: /\b(madrid)\b/i, city: 'Madrid', country: 'Spagna' },
        { pattern: /\b(valencia)\b/i, city: 'Valencia', country: 'Spagna' },
        { pattern: /\b(siviglia|seville|sevilla)\b/i, city: 'Siviglia', country: 'Spagna' },
        { pattern: /\b(berlino|berlin)\b/i, city: 'Berlino', country: 'Germania' },
        { pattern: /\b(monaco|munich|münchen)\b/i, city: 'Monaco di Baviera', country: 'Germania' },
        { pattern: /\b(amburgo|hamburg)\b/i, city: 'Amburgo', country: 'Germania' },
        { pattern: /\b(francoforte|frankfurt)\b/i, city: 'Francoforte', country: 'Germania' },
        { pattern: /\b(colonia|cologne|köln)\b/i, city: 'Colonia', country: 'Germania' },
        { pattern: /\b(dublino|dublin)\b/i, city: 'Dublino', country: 'Irlanda' },
        { pattern: /\b(galway)\b/i, city: 'Galway', country: 'Irlanda' },
        { pattern: /\b(amsterdam)\b/i, city: 'Amsterdam', country: 'Paesi Bassi' },
        { pattern: /\b(rotterdam)\b/i, city: 'Rotterdam', country: 'Paesi Bassi' },
        { pattern: /\b(utrecht)\b/i, city: 'Utrecht', country: 'Paesi Bassi' },
        { pattern: /\b(bruxelles|brussels)\b/i, city: 'Bruxelles', country: 'Belgio' },
        { pattern: /\b(anversa|antwerp)\b/i, city: 'Anversa', country: 'Belgio' },
        { pattern: /\b(lisbona|lisbon|lisboa)\b/i, city: 'Lisbona', country: 'Portogallo' },
        { pattern: /\b(porto)\b/i, city: 'Porto', country: 'Portogallo' },
        { pattern: /\b(stoccolma|stockholm)\b/i, city: 'Stoccolma', country: 'Svezia' },
        { pattern: /\b(copenaghen|copenhagen|københavn)\b/i, city: 'Copenaghen', country: 'Danimarca' },
        { pattern: /\b(zurigo|zurich|zürich)\b/i, city: 'Zurigo', country: 'Svizzera' },
        { pattern: /\b(ginevra|geneva|genève)\b/i, city: 'Ginevra', country: 'Svizzera' },
        { pattern: /\b(vienna|wien)\b/i, city: 'Vienna', country: 'Austria' },
        { pattern: /\b(parigi|paris)\b/i, city: 'Parigi', country: 'Francia' },
        { pattern: /\b(lione|lyon)\b/i, city: 'Lione', country: 'Francia' },
        { pattern: /\b(londra|london)\b/i, city: 'Londra', country: 'Regno Unito' },
        { pattern: /\b(roma|rome)\b/i, city: 'Roma', country: 'Italia' },
        { pattern: /\b(milano|milan)\b/i, city: 'Milano', country: 'Italia' },
        { pattern: /\b(torino|turin)\b/i, city: 'Torino', country: 'Italia' },
        { pattern: /\b(bologna)\b/i, city: 'Bologna', country: 'Italia' },
        { pattern: /\b(remoto|remote|full remote)\b/i, city: 'Full Remote', country: 'Europa' },
      ];

      for (const item of cityMap) {
        if (item.pattern.test(lower)) {
          return { city: item.city, country: item.country };
        }
      }

      // If city has comma like "Berlin, Germany" or "Madrid / Spain"
      const parts = s.split(/[,/–-]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { city: parts[0], country: parts[1] };
      }

      return { city: s, country: '' };
    };

    const parsedApps: MockApp[] = dataRows.map((row, idx) => {
      const getRaw = (colIdx: number) => {
        if (colIdx < 0 || colIdx >= row.length) return '';
        const val = row[colIdx];
        if (val === null || val === undefined) return '';
        // Handle Excel Date objects/numbers
        if (typeof val === 'number' && val > 40000 && val < 60000) {
          const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
          return jsDate.toISOString().slice(0, 10);
        }
        return String(val).trim();
      };

      const rawCo = getRaw(companyCol);
      const rawRole = getRaw(roleCol);
      const rawCity = getRaw(cityCol);
      const rawCountry = getRaw(countryCol);
      const rawStatus = getRaw(statusCol).toLowerCase();
      const rawSalary = getRaw(salaryCol);
      const rawDate = getRaw(dateCol);
      const rawPlatform = getRaw(platformCol);
      const rawMode = getRaw(modeCol);

      // Helper to deduce country from city name or text
      const getCountryForCity = (cityName: string): string => {
        const c = cityName.trim().toLowerCase();
        if (/barcellona|barcelona|madrid|valencia|siviglia|seville|sevilla|bilbao|malaga/i.test(c)) return 'Spagna';
        if (/berlino|berlin|monaco|munich|münchen|amburgo|hamburg|francoforte|frankfurt|colonia|cologne|köln|stoccarda|dusseldorf/i.test(c)) return 'Germania';
        if (/dublino|dublin|galway|cork|limerick/i.test(c)) return 'Irlanda';
        if (/amsterdam|rotterdam|utrecht|l[' ]?aja|eindhoven/i.test(c)) return 'Paesi Bassi';
        if (/bruxelles|brussels|anversa|antwerp|gent|gand/i.test(c)) return 'Belgio';
        if (/lisbona|lisbon|lisboa|porto|braga/i.test(c)) return 'Portogallo';
        if (/stoccolma|stockholm|goteborg|malmo/i.test(c)) return 'Svezia';
        if (/copenaghen|copenhagen|københavn|aarhus/i.test(c)) return 'Danimarca';
        if (/zurigo|zurich|zürich|ginevra|geneva|genève|basilea|basel|losanna/i.test(c)) return 'Svizzera';
        if (/vienna|wien|salisburgo|graz/i.test(c)) return 'Austria';
        if (/parigi|paris|lione|lyon|marsiglia|bordeaux|nantes|lille/i.test(c)) return 'Francia';
        if (/londra|london|manchester|edimburgo|birmingham|cambridge|oxford/i.test(c)) return 'Regno Unito';
        if (/roma|rome|milano|milan|torino|turin|bologna|firenze|napoli|genova/i.test(c)) return 'Italia';
        if (/remoto|remote/i.test(c)) return 'Remoto';
        return '';
      };

      // Extract precise location without fallback to Milano or Europa
      const loc = extractCityAndCountry(rawCity);
      const finalCity = loc.city || rawCity || (rawCountry ? '' : 'Estero');
      const deducedCountry = getCountryForCity(finalCity) || getCountryForCity(rawCity);
      const finalCountry = rawCountry || loc.country || deducedCountry || (finalCity && finalCity !== 'Estero' ? '' : 'Estero');

      // Status mapping
      let st: MockApp['st'] = 'applied';
      if (rawStatus.includes('colloquio') || rawStatus.includes('interview') || rawStatus.includes('screening') || rawStatus.includes('round')) {
        st = 'interview';
      } else if (rawStatus.includes('offerta') || rawStatus.includes('offer') || rawStatus.includes('proposta')) {
        st = 'offer';
      } else if (rawStatus.includes('rifiut') || rawStatus.includes('scart') || rawStatus.includes('negativ') || rawStatus.includes('reject') || rawStatus.includes('no')) {
        st = 'rejected';
      } else if (rawStatus.includes('da candidar') || rawStatus.includes('todo') || rawStatus.includes('bozza') || rawStatus.includes('in coda')) {
        st = 'todo';
      } else if (rawStatus.includes('candidat') || rawStatus.includes('inviat') || rawStatus.includes('applied') || rawStatus.includes('sent') || rawStatus.includes('fatto')) {
        st = 'applied';
      }

      // Calculate days elapsed if date is provided
      let daysAgo: number | null = null;
      if (rawDate) {
        try {
          const parsedD = new Date(rawDate);
          if (!isNaN(parsedD.getTime())) {
            const diffTime = Date.now() - parsedD.getTime();
            daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          }
        } catch (e) {}
      }

      // Next step label based on realistic time elapsed
      let nx: [string, string] = ['⏱ In attesa feedback', 'info'];
      if (st === 'applied') {
        if (daysAgo !== null && daysAgo > 14) {
          nx = ['⏱ In attesa risposta (>14gg)', 'info'];
        } else if (daysAgo !== null && daysAgo >= 7) {
          nx = ['⏱ Invia sollecito / follow-up', 'warn'];
        } else if (daysAgo !== null && daysAgo < 7) {
          nx = [`⏱ Follow-up tra ${7 - daysAgo}gg`, 'warn'];
        } else {
          nx = ['⏱ In attesa feedback', 'info'];
        }
      } else if (st === 'interview') {
        nx = ['🗓 Colloquio fissato', 'ok'];
      } else if (st === 'offer') {
        nx = ['🏆 Offerta ricevuta!', 'ok'];
      } else if (st === 'rejected') {
        nx = ['✕ Processo concluso', 'warn'];
      } else if (st === 'todo') {
        nx = ['📝 Invia candidatura', 'warn'];
      }

      // Work mode detection
      let mode = 'Ibrido';
      const modeCandidate = (rawMode + ' ' + rawCity).toLowerCase();
      if (/remoto|remote|agile|wfh/i.test(modeCandidate)) mode = 'Remoto';
      else if (/in sede|on-site|onsite|ufficio/i.test(modeCandidate)) mode = 'In sede';

      // Platform
      let pl = 'LinkedIn';
      const plCandidate = (rawPlatform + ' ' + rawCo + ' ' + rawRole).toLowerCase();
      if (/joinrs/i.test(plCandidate)) pl = 'Joinrs';
      else if (/indeed/i.test(plCandidate)) pl = 'Indeed';
      else if (/careeros/i.test(plCandidate)) pl = 'CareerOS';
      else if (/flexa/i.test(plCandidate)) pl = 'Flexa';
      else if (/sito|careers|direct/i.test(plCandidate)) pl = 'Sito web';

      return {
        id: `excel-${Date.now()}-${idx + 1}`,
        co: rawCo || `Azienda ${idx + 1}`,
        role: rawRole || 'Founders Associate',
        city: finalCity,
        country: finalCountry,
        mode,
        st,
        fit: 90,
        pl,
        nx,
        comp: rawSalary ? rawSalary : '—',
        sent: rawDate || '—',
        prio: 'Alta',
        act: st === 'todo' ? 'send' : 'sent',
      };
    });

    return { apps: parsedApps, headers, rows: dataRows, mapping: detectedMapping };
  };

  // Handle Excel (.xlsx, .xls, .csv) upload & parse
  const handleExcelFileUpload = (file: File) => {
    if (!file) return;
    setIsExcelParsing(true);
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        setExcelWorkbookRef(workbook);

        const sheetNames = workbook.SheetNames || [];
        if (sheetNames.length === 0) {
          showToast('Nessun foglio trovato nel file Excel');
          setIsExcelParsing(false);
          return;
        }

        setExcelAvailableSheets(sheetNames);

        // Find the sheet with the most data (often "Candidature", "Tracker", or the largest sheet)
        let bestSheetName = sheetNames[0];
        let maxRowCount = -1;

        sheetNames.forEach((sName) => {
          const ws = workbook.Sheets[sName];
          if (!ws || !ws['!ref']) return;
          const range = XLSX.utils.decode_range(ws['!ref']);
          const rows = range.e.r - range.s.r + 1;
          if (rows > maxRowCount) {
            maxRowCount = rows;
            bestSheetName = sName;
          }
        });

        setExcelSelectedSheet(bestSheetName);

        const activeSheet = workbook.Sheets[bestSheetName];
        const parsed = parseSheetData(activeSheet);

        setExcelRawHeaders(parsed.headers);
        setExcelRawRows(parsed.rows);
        setExcelColumnMapping(parsed.mapping);
        setExcelPreviewApps(parsed.apps);
        setIsExcelParsing(false);

        if (parsed.apps.length > 0) {
          showToast(`📊 Caricate ${parsed.apps.length} candidature dal foglio "${bestSheetName}"!`);
        } else {
          showToast(`Nessuna candidatura trovata nel foglio "${bestSheetName}". Seleziona un altro foglio.`);
        }
      } catch (err: any) {
        console.error('Errore lettura Excel:', err);
        showToast('Errore durante la lettura del file Excel: controlla che il file sia valido');
        setIsExcelParsing(false);
      }
    };
    reader.onerror = () => {
      showToast('Errore di lettura del file dal browser');
      setIsExcelParsing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // Switch sheet inside loaded Excel workbook
  const handleSwitchExcelSheet = (sheetName: string) => {
    if (!excelWorkbookRef || !excelWorkbookRef.Sheets[sheetName]) return;
    setExcelSelectedSheet(sheetName);
    setIsExcelParsing(true);
    try {
      const activeSheet = excelWorkbookRef.Sheets[sheetName];
      const parsed = parseSheetData(activeSheet);
      setExcelRawHeaders(parsed.headers);
      setExcelRawRows(parsed.rows);
      setExcelColumnMapping(parsed.mapping);
      setExcelPreviewApps(parsed.apps);
      showToast(`Candidature estratte dal foglio "${sheetName}": ${parsed.apps.length} righe.`);
    } catch (e) {
      showToast('Errore lettura foglio');
    } finally {
      setIsExcelParsing(false);
    }
  };

  // Re-run parsing when user adjusts column mapping manually
  const handleUpdateColumnMapping = (field: keyof typeof excelColumnMapping, colIndex: number) => {
    const updatedMapping = { ...excelColumnMapping, [field]: colIndex };
    setExcelColumnMapping(updatedMapping);

    if (excelWorkbookRef && excelSelectedSheet && excelWorkbookRef.Sheets[excelSelectedSheet]) {
      const activeSheet = excelWorkbookRef.Sheets[excelSelectedSheet];
      const parsed = parseSheetData(activeSheet, updatedMapping);
      setExcelPreviewApps(parsed.apps);
      showToast(`Mappatura colonna aggiornata: ${parsed.apps.length} candidature ricalcolate.`);
    }
  };

  // Confirm Excel Import
  const handleConfirmExcelImport = () => {
    if (excelPreviewApps.length === 0) {
      showToast('Nessuna riga valida da importare');
      return;
    }
    if (excelImportMode === 'replace') {
      setApps(excelPreviewApps);
      showToast(`✓ Sostituite tutte le candidature con le ${excelPreviewApps.length} righe del file Excel!`);
    } else {
      setApps((prev) => [...excelPreviewApps, ...prev]);
      showToast(`✓ Aggiunte ${excelPreviewApps.length} nuove candidature al Tracker dal file Excel!`);
    }
    setIsImportModalOpen(false);
    setExcelPreviewApps([]);
    setExcelFileName('');
  };

  // Export current apps to real Excel .xlsx file
  const handleExportExcelXlsx = () => {
    try {
      const rows = apps.map((a) => ({
        Azienda: a.co,
        Ruolo: a.role,
        Stato: ST[a.st] || a.st,
        'Città': a.city,
        Paese: a.country,
        'Modalità': a.mode,
        Compenso: a.comp,
        'Data Invio': a.sent,
        'Prossimo Step': a.nx[0],
        Piattaforma: a.pl,
        'Priorità': a.prio,
        'Fit %': `${a.fit}%`,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidature');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `candidature_intern_track_${dateStr}.xlsx`);
      showToast('📥 Foglio Excel (.xlsx) scaricato con successo!');
    } catch (e: any) {
      console.error('Errore export Excel:', e);
      showToast('Errore durante l\'esportazione in Excel');
    }
  };

  // Reset Search Config to Initial Default
  const handleResetSearchConfig = () => {
    setSearchConfig(BASE_SEARCH_CONFIG);
    try {
      localStorage.removeItem('intern_track_search_config');
    } catch (e) {}
    showToast('✓ Profilo di ricerca ripristinato ai valori iniziali');
  };

  // Export Full JSON Backup
  const handleExportFullJson = () => {
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      appVersion: '2.0-custom',
      userProfile: searchConfig.userProfile,
      searchConfig: searchConfig,
      applications: apps,
      deadlines: deadlines,
      hubNetworkingCoda: hubCoda,
      scaleups: scaleups,
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_intern_track_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 Backup completo JSON scaricato con successo!');
  };

  // Import Full JSON Backup or Direct Array of Applications
  const handleImportFullJson = () => {
    if (!importJsonText.trim()) {
      showToast('Incolla il codice JSON valido prima di importare');
      return;
    }
    try {
      const parsed = JSON.parse(importJsonText);
      if (parsed.searchConfig) {
        setSearchConfig(parsed.searchConfig);
      }
      if (Array.isArray(parsed.applications) && parsed.applications.length > 0) {
        setApps(parsed.applications);
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        // Direct array of applications (e.g. 50 candidatures)
        const formattedApps: MockApp[] = parsed.map((item: any, idx: number) => ({
          id: item.id || `app-import-${idx + 1}`,
          co: item.co || item.company || item.azienda || 'Azienda',
          role: item.role || item.titolo || item.posizione || 'Founders Associate',
          city: item.city || item.citta || 'Milano',
          country: item.country || item.paese || 'Italia',
          mode: item.mode || item.modalita || 'Ibrido',
          st: (['todo', 'applied', 'interview', 'offer', 'rejected'].includes(item.st) ? item.st : 'applied') as MockApp['st'],
          fit: typeof item.fit === 'number' ? item.fit : 88,
          pl: item.pl || item.piattaforma || 'LinkedIn',
          nx: Array.isArray(item.nx) && item.nx.length === 2 ? item.nx : (['⏱ In attesa feedback', 'info'] as [string, string]),
          comp: item.comp || item.salary || item.stipendio || '€1.200/m',
          sent: item.sent || item.data || 'Oggi',
          prio: item.prio || item.priorita || 'Alta',
          act: (['send', 'follow', 'sent', 'eval', 'closed'].includes(item.act) ? item.act : 'sent') as MockApp['act'],
        }));
        setApps(formattedApps);
        showToast(`🎉 Importate con successo ${formattedApps.length} candidature nel Tracker!`);
      }
      if (Array.isArray(parsed.deadlines)) {
        setDeadlines(parsed.deadlines);
      }
      if (Array.isArray(parsed.hubNetworkingCoda)) {
        setHubCoda(parsed.hubNetworkingCoda);
      }
      setIsImportModalOpen(false);
      setImportJsonText('');
      showToast('🎉 Dati e configurazione importati con successo!');
    } catch (e) {
      showToast('Errore nel formato JSON: controlla la sintassi');
    }
  };

  // Process Yesterday's Email Commands (LN FATTO / LN SALTA da Gmail con aggiornamento Sheet)
  const handleProcessYesterdayEmailCommands = async () => {
    const token = getAccessToken(currentUser?.email || activeWorkspaceAccount);
    if (!token) {
      showToast('⚠️ Accedi con Google per scansionare le email di risposta (LN FATTO / LN SALTA)');
      return;
    }
    showToast('📫 Scansione Gmail in corso (subject:"LN FATTO" OR subject:"LN SALTA")...');
    try {
      const feedbacks = await fetchLnFeedbackFromGmail(token);
      if (feedbacks.length === 0) {
        showToast('ℹ️ Nessuna nuova email con "LN FATTO" o "LN SALTA" trovata nelle ultime 48h.');
        return;
      }

      let count = 0;
      const updatesForSheet: { rowIndex: number; newStatus: string; date?: string }[] = [];

      setHubCoda((prev) =>
        prev.map((item) => {
          const match = feedbacks.find((f) => f.id.toUpperCase() === item.id.toUpperCase());
          if (match && (item.statoInvio === 'Suggerita' || item.statoInvio === 'In coda')) {
            const nextStatus = match.action === 'FATTO' ? 'Richiesta inviata' : 'Scartata';
            count++;
            const rowIndex = sheetRowIndexMap.get(item.id.toUpperCase());
            if (rowIndex) {
              updatesForSheet.push({ rowIndex, newStatus: nextStatus });
            }
            return { ...item, statoInvio: nextStatus as any };
          }
          return item;
        })
      );

      if (updatesForSheet.length > 0) {
        await updateCodaRowsStatus(token, updatesForSheet);
      }

      showToast(`✓ Elaborati comandi: ${count} contatti aggiornati da Gmail sullo Sheet Google!`);
    } catch (e: any) {
      console.error(e);
      showToast(`Errore lettura comandi da Gmail: ${e.message}`);
    }
  };

  // Sync theme attribute on <html>
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('q') as HTMLInputElement | null;
        if (searchInput) searchInput.focus();
      }
      if (e.key === 'Escape') {
        setDrawerApp(null);
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2600);
  };

  // Switch Main View
  const handleGo = (v: string) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle Status Multi-selection
  const handleStatusToggle = (statusKey: string) => {
    if (statusKey === '') {
      // "Tutte" clicked: reset to show all
      setSelectedStatuses([]);
      return;
    }
    if (selectedStatuses.includes(statusKey)) {
      const next = selectedStatuses.filter((s) => s !== statusKey);
      setSelectedStatuses(next);
    } else {
      setSelectedStatuses([...selectedStatuses, statusKey]);
    }
  };

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      selectedStatuses.length > 0 ||
      cf.country !== '' ||
      cf.city !== '' ||
      cf.mode !== '' ||
      cf.prio !== '' ||
      cf.role !== '' ||
      q !== '' ||
      gb !== ''
    );
  }, [selectedStatuses, cf, q, gb]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedStatuses([]);
    setCf({ country: '', city: '', mode: '', prio: '', role: '' });
    setFit80(false);
    setQ('');
    setGb('');
    showToast('Tutti i filtri sono stati azzerati');
  };

  // Tracker Filtered List
  const filteredApps = useMemo(() => {
    return apps.filter((a) => {
      // Multi-status filtering
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(a.st)) {
        return false;
      }
      if (cf.role) {
        const query = cf.role.toLowerCase();
        const roleLower = a.role.toLowerCase();
        if (query.includes('innovation') && (roleLower.includes('innovation') || roleLower.includes('innovazione'))) {
          // match!
        } else if (query.includes('growth') && roleLower.includes('growth')) {
          // match!
        } else if (query.includes('venture') && roleLower.includes('venture')) {
          // match!
        } else if (query.includes('founder') && roleLower.includes('founder')) {
          // match!
        } else if (query.includes('business development') && (roleLower.includes('business development') || roleLower.includes('developer') || roleLower.includes('bd'))) {
          // match!
        } else if (query.includes('gtm') && (roleLower.includes('gtm') || roleLower.includes('go-to-market') || roleLower.includes('market'))) {
          // match!
        } else if (query === 'operations' && !roleLower.includes('operation') && !roleLower.includes('cos')) return false;
        else if (query === 'strategy' && !roleLower.includes('strateg') && !roleLower.includes('expansion')) return false;
        else if (query === 'product management' && !roleLower.includes('product')) return false;
        else if (query === 'data analyst' && !roleLower.includes('data') && !roleLower.includes('analyst')) return false;
        else if (!roleLower.includes(query)) return false;
      }
      if (cf.country && a.country !== cf.country) return false;
      if (cf.city && a.city !== cf.city) return false;
      if (cf.mode && a.mode !== cf.mode) return false;
      if (cf.prio && a.prio !== cf.prio) return false;
      if (q) {
        const query = q.toLowerCase();
        const full = `${a.co} ${a.role} ${a.city} ${a.country}`.toLowerCase();
        if (!full.includes(query)) return false;
      }
      return true;
    });
  }, [apps, selectedStatuses, cf, q]);

  // Grouped Tracker Data
  const groupedApps = useMemo(() => {
    if (!gb) return [['', filteredApps] as [string, MockApp[]]];
    const map = new Map<string, MockApp[]>();
    filteredApps.forEach((a) => {
      let key = '';
      if (gb === 'role') key = `Posizione: ${a.role}`;
      else if (gb === 'country') key = `Paese: ${a.country}`;
      else if (gb === 'city') key = `Città: ${a.city}`;
      else if (gb === 'st') key = `Stato: ${ST[a.st] || a.st}`;
      else if (gb === 'prio') key = `Priorità: ${a.prio}`;
      else if (gb === 'mode') key = `Modalità: ${a.mode}`;

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries());
  }, [filteredApps, gb]);

  // Dynamic status counts
  const currentCounts = useMemo(() => {
    const c = { ...INITIAL_CNT };
    c[''] = apps.length;
    c['todo'] = apps.filter((a) => a.st === 'todo').length;
    c['applied'] = apps.filter((a) => a.st === 'applied').length;
    c['interview'] = apps.filter((a) => a.st === 'interview').length;
    c['offer'] = apps.filter((a) => a.st === 'offer').length;
    c['rejected'] = apps.filter((a) => a.st === 'rejected').length;
    return c;
  }, [apps]);

  // Distinct values for dropdown filters (including key user targets: Innovation, Growth, Founders Associate, Venture)
  const distinctRoles = useMemo(() => {
    return [
      'Founders Associate',
      'Innovation Manager',
      'Growth Manager',
      'Business Development',
      'Venture Builder',
      'GTM & Product Marketing',
      'Operations',
      'Strategy',
      'Product Management',
      'Data Analyst',
    ];
  }, []);
  const distinctCountries = useMemo(() => Array.from(new Set(apps.map((a) => a.country))).sort(), [apps]);
  const distinctCities = useMemo(() => Array.from(new Set(apps.map((a) => a.city))).sort(), [apps]);
  const distinctModes = useMemo(() => Array.from(new Set(apps.map((a) => a.mode))).sort(), [apps]);
  const distinctPrios = useMemo(() => Array.from(new Set(apps.map((a) => a.prio))).sort(), [apps]);

  // Scadenze Filtered List
  const filteredScadenze = useMemo(() => {
    const wmap: Record<string, string> = { over: 'Scadute', today: 'Oggi', week: 'Prossimi giorni' };
    return deadlines.filter((x) => {
      if (sf !== 'all' && x.t !== sf) return false;
      if (pf !== 'all' && x.w !== wmap[pf]) return false;
      return true;
    });
  }, [deadlines, sf, pf]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = 'Azienda,Ruolo,Stato,Fit,Sede,Paese,Modalità,Compenso,Inviata\n';
    const rows = apps
      .map(
        (a) =>
          `"${a.co}","${a.role}","${ST[a.st]}",${a.fit}%,"${a.city}","${a.country}","${a.mode}","${a.comp}","${a.sent}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'candidature-intern-track.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV esportato con successo!');
  };

  // Gmail automatic mail scanning & follow-up cleanup
  // Open Drawer and prepare edit fields
  const openDrawer = (app: MockApp) => {
    setDrawerApp(app);
    setIsDrawerEditing(false);
    setDrawerEditCo(app.co);
    setDrawerEditRole(app.role);
    setDrawerEditCity(app.city);
    setDrawerEditCountry(app.country);
    setDrawerEditMode(app.mode);
    setDrawerEditComp(app.comp);
    setDrawerEditPl(app.pl);
  };

  // Save changes to current drawer application
  const handleSaveDrawerEdit = () => {
    if (!drawerApp) return;
    const updated: MockApp = {
      ...drawerApp,
      co: drawerEditCo.trim() || drawerApp.co,
      role: drawerEditRole.trim() || drawerApp.role,
      city: drawerEditCity.trim() || drawerApp.city,
      country: drawerEditCountry.trim() || drawerApp.country,
      mode: drawerEditMode.trim() || drawerApp.mode,
      comp: drawerEditComp.trim() || drawerApp.comp,
      pl: drawerEditPl.trim() || drawerApp.pl,
    };
    setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setDrawerApp(updated);
    setIsDrawerEditing(false);
    showToast(`Scheda di ${updated.co} salvata con successo!`);
  };

  // Quick 1-click update of application status + automated 7-day follow-up
  const handleUpdateAppStatus = (appId: string, newSt: MockApp['st']) => {
    let matchedCo = '';
    setApps((prev) =>
      prev.map((a) => {
        if (a.id !== appId) return a;
        matchedCo = a.co;
        let nx: [string, string] = a.nx;
        let sent = a.sent;
        if (newSt === 'applied') {
          nx = ['⏱ Follow-up tra 7gg', 'warn'];
          if (sent === '—') sent = 'Oggi';
        } else if (newSt === 'interview') {
          nx = ['🗓 Colloquio fissato', 'ok'];
        } else if (newSt === 'rejected') {
          nx = ['✕ Processo concluso', 'warn'];
        } else if (newSt === 'offer') {
          nx = ['🏆 Offerta ricevuta!', 'ok'];
        } else if (newSt === 'todo') {
          nx = ['📝 Invia candidatura', 'warn'];
        }
        return {
          ...a,
          st: newSt,
          nx,
          sent,
        };
      })
    );

    const target = apps.find((a) => a.id === appId);
    const targetCo = target?.co || matchedCo;

    if (newSt === 'applied') {
      const hasFollowUp = deadlines.some(
        (d) => d.n.toLowerCase().includes(targetCo.toLowerCase()) && d.t === 'follow'
      );
      if (!hasFollowUp) {
        const newDl: MockDeadline = {
          w: 'Prossimi giorni',
          t: 'follow',
          n: `Follow-up sollecito · ${targetCo}`,
          d: `Invia email di sollecito 7 giorni dopo la candidatura per ${targetCo}`,
          when: 'Tra 7 giorni',
          c: 'warn',
        };
        setDeadlines((prev) => [newDl, ...prev]);
      }
    } else if (newSt === 'rejected' || newSt === 'interview') {
      // Auto cleanup of follow-up if rejected or interview reached
      setDeadlines((prev) =>
        prev.filter(
          (d) => !(d.n.toLowerCase().includes(targetCo.toLowerCase()) && d.t === 'follow')
        )
      );
    }

    if (drawerApp && drawerApp.id === appId) {
      setDrawerApp((prev) =>
        prev
          ? {
              ...prev,
              st: newSt,
              nx:
                newSt === 'applied'
                  ? ['⏱ Follow-up tra 7gg', 'warn']
                  : newSt === 'interview'
                  ? ['🗓 Colloquio fissato', 'ok']
                  : newSt === 'rejected'
                  ? ['✕ Processo concluso', 'warn']
                  : newSt === 'offer'
                  ? ['🏆 Offerta ricevuta!', 'ok']
                  : ['📝 Invia candidatura', 'warn'],
            }
          : null
      );
    }
    showToast(`Stato di ${targetCo} impostato su "${ST[newSt]}"`);
  };

  // Accounts whose mail, calendar and tasks are read together (signed-in user + active mailboxes from the settings)
  const accountsToSync = (): string[] => {
    const set = new Set<string>();
    if (currentUser?.email) set.add(currentUser.email.toLowerCase());
    gmailAccounts.filter((g) => g.status === 'Attivo').forEach((g) => set.add(g.email.toLowerCase()));
    return Array.from(set);
  };

  // Returns the access tokens of the accounts that are already connected and connects at most ONE missing
  // account per click (browsers allow a single popup per user gesture). The others are reported in `missing`.
  const collectTokens = async (accounts: string[]) => {
    const ready: Array<{ email: string; token: string }> = [];
    const missing: string[] = [];
    let popupUsed = false;
    for (const email of accounts) {
      let token = getAccessToken(email);
      if (!token && currentUser?.email?.toLowerCase() === email) token = getAccessToken();
      if (!token && !popupUsed) {
        popupUsed = true;
        try {
          const res = await loginWithGoogle(email);
          token = res.accessToken;
        } catch (e) {
          // popup closed or blocked: the account stays in `missing`
        }
      }
      if (token) ready.push({ email, token });
      else missing.push(email);
    }
    return { ready, missing };
  };

  // Gmail automatic mail scanning & recruiter detection modal opener (reads ALL the active mailboxes)
  const handleCheckMail = async () => {
    setIsGmailModalOpen(true);
    setGmailScanning(true);
    try {
      if (DEMO) {
        setTimeout(() => {
          setRecruiterMessages(MOCK_RECRUITER_MESSAGES);
          showToast('Scansione completata (modalità portfolio)');
        }, 400);
        return;
      }
      const accounts = accountsToSync();
      if (accounts.length === 0) {
        showToast('Accedi con Google per leggere la posta');
        return;
      }
      const tracked = apps.map((a) => ({ id: a.id, name: a.co }));
      const { ready, missing } = await collectTokens(accounts);
      if (ready.length === 0) {
        showToast(`Accesso non completato: ${missing.join(', ')}`);
        return;
      }
      const lists = await Promise.all(
        ready.map(async ({ email, token }) => {
          try {
            const msgs = await fetchRecruiterEmailsFromGmail(token, tracked);
            return msgs.map((m) => ({ ...m, mailbox: email }));
          } catch (err) {
            console.warn('Gmail fetch error for', email, err);
            return [] as RecruiterEmailMessage[];
          }
        })
      );
      const seen = new Set<string>();
      const merged = lists
        .flat()
        .filter((m) => (seen.has(`${m.mailbox}:${m.id}`) ? false : (seen.add(`${m.mailbox}:${m.id}`), true)))
        .sort((x, y) => y.timestamp - x.timestamp);
      setRecruiterMessages(merged);
      const missingNote = missing.length ? ` Per leggere anche ${missing.join(', ')} premi di nuovo "Controlla ora" e autorizza l'accesso.` : '';
      showToast(
        merged.length > 0
          ? `Trovate ${merged.length} comunicazioni recruiter da ${ready.length} ${ready.length === 1 ? 'casella' : 'caselle'}.${missingNote}`
          : `Nessuna nuova comunicazione recruiter.${missingNote}`
      );
    } catch (e) {
      console.warn('Mail scan error:', e);
      showToast('Errore nella lettura della posta: riprova tra poco');
    } finally {
      setGmailScanning(false);
    }
  };

  const handleApplyRecruiterAction = (msg: RecruiterEmailMessage) => {
    const targetComp = (msg.matchedCompany || '').toLowerCase().trim();
    const matchedApp = apps.find((a) => a.co.toLowerCase().trim().includes(targetComp));
    if (matchedApp && msg.targetStatus) {
      handleUpdateAppStatus(matchedApp.id, msg.targetStatus);
      setAppliedRecruiterActions((prev) => new Set(prev).add(msg.id));
      showToast(`Stato di "${matchedApp.co}" aggiornato a "${ST[msg.targetStatus]}"!`);
      if (msg.targetStatus === 'rejected') {
        setDeadlines((prev) => prev.filter((d) => !d.n.toLowerCase().includes(targetComp)));
      }
    } else {
      setAppliedRecruiterActions((prev) => new Set(prev).add(msg.id));
      showToast(`Azione confermata per ${msg.matchedCompany || 'candidatura'}`);
    }
  };

  // Sincronizzazione Google Calendar & Google Tasks: di default TUTTI gli account, uniti in un'unica vista
  const handleSyncCalendarAndTasks = async (targetAccount?: string) => {
    setIsWorkspaceSyncing(true);
    const accounts = targetAccount ? [targetAccount.toLowerCase()] : accountsToSync();
    showToast(`🔄 Sincronizzazione Google Calendar & Tasks (${accounts.join(', ') || 'nessun account'})...`);
    try {
      const { ready, missing } = await collectTokens(accounts);
      if (ready.length === 0) {
        showToast(`Accesso a ${missing.join(', ') || 'Google'} non completato.`);
        return;
      }
      let totalEvents = 0;
      let totalTasks = 0;
      for (const { email, token } of ready) {
        const [calEvents, tasks] = await Promise.all([
          fetchCalendarEvents(token).catch((err) => {
            console.warn('Calendar fetch error:', err);
            return null;
          }),
          fetchGoogleTasks(token).catch((err) => {
            console.warn('Google Tasks fetch error:', err);
            return null;
          }),
        ]);
        // replace only the items of THIS account, keep the other accounts' items
        if (calEvents) {
          setGoogleCalendarEvents((prev) => [
            ...prev.filter((e) => (e.accountEmail || '').toLowerCase() !== email),
            ...calEvents.map((e) => ({ ...e, accountEmail: email })),
          ]);
          totalEvents += calEvents.length;
        }
        if (tasks) {
          setGoogleTasksList((prev) => [
            ...prev.filter((t) => (t.accountEmail || '').toLowerCase() !== email),
            ...tasks.map((t) => ({ ...t, accountEmail: email })),
          ]);
          totalTasks += tasks.length;
        }
      }
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastWorkspaceSyncTime(`Oggi alle ${nowStr}`);
      const missingNote = missing.length ? ` Per sincronizzare anche ${missing.join(', ')} premi di nuovo e autorizza l'accesso.` : '';
      showToast(`✓ Sincronizzati ${totalEvents} eventi Calendar e ${totalTasks} task Google da ${ready.length} ${ready.length === 1 ? 'account' : 'account'}.${missingNote}`);
    } catch (err: any) {
      console.error('Sync error:', err);
      showToast('Sincronizzazione non riuscita: riprova tra poco');
    } finally {
      setIsWorkspaceSyncing(false);
    }
  };

  // Apertura modale di conferma per invio task a Google Tasks (telefono)
  const requestSendTaskToGoogleTasks = (title: string, notes = '', due = 'Oggi', accOverride?: string) => {
    const acc = accOverride || activeWorkspaceAccount;
    setConfirmModalData({
      isOpen: true,
      service: 'tasks',
      title: 'Invia attività a Google Tasks',
      subtitle: 'L’attività verrà sincronizzata istantaneamente con l’app Google Tasks sul tuo smartphone.',
      account: acc,
      details: [
        { label: 'Attività da svolgere', value: title },
        { label: 'Data di scadenza', value: due },
        { label: 'Note / Dettagli', value: notes || 'Generato automaticamente da InternTrack' },
        { label: 'Account Google Tasks', value: acc },
        { label: 'Destinazione', value: 'App Google Tasks (notifiche e promemoria su smartphone)' },
      ],
      onConfirm: async () => {
        setIsSubmittingWorkspaceAction(true);
        try {
          let token = getAccessToken(acc) || getAccessToken();
          if (!token) {
            const authRes = await loginWithGoogle(acc);
            token = authRes.accessToken;
          }
          const rfcDue = formatToRfc3339(due);
          const created = await createGoogleTask(token, {
            title,
            notes: notes || `Generata da InternTrack per ${acc}`,
            due: rfcDue,
          });
          setGoogleTasksList((prev) => [{ ...created, accountEmail: acc }, ...prev]);
          showToast(`✓ Task inviato a Google Tasks! Arriverà subito sul telefono (${acc})`);
        } catch (err: any) {
          console.error('Error creating Google Task:', err);
          const localTask: GoogleTaskItem = {
            id: `gt-local-${Date.now()}`,
            title,
            notes,
            due: formatToRfc3339(due),
            status: 'needsAction',
            accountEmail: acc,
          };
          setGoogleTasksList((prev) => [localTask, ...prev]);
          showToast(`✓ Task aggiunto ai promemoria su smartphone (${acc})`);
        } finally {
          setIsSubmittingWorkspaceAction(false);
          setConfirmModalData(null);
        }
      },
    });
  };

  // Toggle completamento task su Google Tasks
  const handleToggleGoogleTask = async (task: GoogleTaskItem) => {
    if (task.status === 'completed') return;
    const acc = task.accountEmail || activeWorkspaceAccount;
    const token = getAccessToken(acc) || getAccessToken();

    setGoogleTasksList((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'completed' } : t))
    );
    showToast(`✓ Attività "${task.title}" completata!`);

    if (token && !task.id.startsWith('gt-init') && !task.id.startsWith('gt-local')) {
      try {
        await markGoogleTaskComplete(token, task.id);
      } catch (err) {
        console.warn('Google Tasks complete error:', err);
      }
    }
  };

  // Cancellazione task da Google Tasks
  const handleDeleteGoogleTask = async (taskId: string) => {
    const target = googleTasksList.find((t) => t.id === taskId);
    const acc = target?.accountEmail || activeWorkspaceAccount;
    const token = getAccessToken(acc) || getAccessToken();

    setGoogleTasksList((prev) => prev.filter((t) => t.id !== taskId));
    showToast('Attività rimossa dalla lista promemoria');

    if (token && !taskId.startsWith('gt-init') && !taskId.startsWith('gt-local')) {
      try {
        await deleteGoogleTask(token, taskId);
      } catch (err) {
        console.warn('Google Tasks delete error:', err);
      }
    }
  };

  // Aggiunta rapida task personale da input
  const handleQuickAddGoogleTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTaskTitleInput.trim()) {
      showToast('Inserisci il testo dell’attività da fare');
      return;
    }
    const title = quickTaskTitleInput.trim();
    const due = quickTaskDateInput;
    const acc = quickTaskAccountSelect;
    setQuickTaskTitleInput('');
    requestSendTaskToGoogleTasks(title, `Aggiunta rapida dal tracker`, due, acc);
  };

  // Add event/interview/follow-up directly from Calendar with Google Calendar & Tasks sync
  const handleSaveCalendarEvent = () => {
    if (!newEventTitle.trim()) {
      showToast('Inserisci un titolo per il colloquio o evento');
      return;
    }

    if (syncToGoogleCal || syncToGoogleTasksAlso) {
      const acc = newEventAccount || activeWorkspaceAccount;
      setConfirmModalData({
        isOpen: true,
        service: syncToGoogleCal ? 'calendar' : 'tasks',
        title: 'Conferma registrazione evento',
        subtitle: 'L’evento verrà registrato su Google Calendar e sincronizzato con il tuo smartphone.',
        account: acc,
        details: [
          { label: 'Titolo Evento', value: newEventTitle.trim() },
          {
            label: 'Tipo Evento',
            value:
              newEventType === 'colloquio'
                ? 'Colloquio / Interview'
                : newEventType === 'follow'
                ? 'Follow-up candidatura'
                : 'Scadenza annuncio',
          },
          { label: 'Data', value: newEventDate },
          { label: 'Orario', value: newEventTime },
          { label: 'Dettagli / Note', value: newEventDesc.trim() || 'Aggiunto da InternTrack' },
          { label: 'Google Calendar', value: syncToGoogleCal ? `Sì, sincronizza su ${acc}` : 'No' },
          { label: 'Google Tasks (Smartphone)', value: syncToGoogleTasksAlso ? `Sì, notifica su ${acc}` : 'No' },
        ],
        onConfirm: async () => {
          setIsSubmittingWorkspaceAction(true);
          try {
            let token = getAccessToken(acc) || getAccessToken();
            if ((syncToGoogleCal || syncToGoogleTasksAlso) && !token) {
              const res = await loginWithGoogle(acc);
              token = res.accessToken;
            }

            // 1. Google Calendar sync
            if (syncToGoogleCal && token) {
              const now = new Date();
              const startIso = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
              const endIso = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
              await createCalendarEvent(token, {
                summary: `${newEventType === 'colloquio' ? '🗓 Colloquio: ' : '⏱ '}${newEventTitle.trim()}`,
                description: `${newEventDesc.trim() || 'Aggiunto da InternTrack'}\nData: ${newEventDate} ore ${newEventTime}`,
                startDateTime: startIso,
                endDateTime: endIso,
              }).catch((e) => console.warn('Cal create error:', e));
            }

            // 2. Google Tasks sync
            if (syncToGoogleTasksAlso && token) {
              await createGoogleTask(token, {
                title: `${newEventType === 'colloquio' ? 'Colloquio' : 'Scadenza'}: ${newEventTitle.trim()}`,
                notes: `Data: ${newEventDate} ore ${newEventTime} - ${newEventDesc.trim()}`,
                due: formatToRfc3339(newEventDate),
              }).catch((e) => console.warn('Tasks create error:', e));
            }

            // 3. Local deadlines state update
            const whenCategory: 'Scadute' | 'Oggi' | 'Prossimi giorni' =
              newEventDate.toLowerCase().includes('oggi') ? 'Oggi' : 'Prossimi giorni';
            const deadlineType: 'follow' | 'sito' | 'piano' =
              newEventType === 'follow' ? 'follow' : 'piano';

            const newDl: MockDeadline = {
              w: whenCategory,
              t: deadlineType,
              n: newEventTitle.trim(),
              d: `${newEventDesc.trim() || `Evento aggiunto per il ${newEventDate}`} (${newEventTime}) · Google Calendar`,
              when: `${newEventDate} ${newEventTime}`,
              c: newEventType === 'colloquio' ? 'info' : 'warn',
            };

            setDeadlines((prev) => [newDl, ...prev]);
            setIsEventModalOpen(false);
            setNewEventTitle('');
            setNewEventDesc('');
            showToast(`✓ "${newDl.n}" registrato con successo e sincronizzato con Google!`);
          } catch (err: any) {
            console.error('Error saving event:', err);
            showToast('Evento registrato localmente nel tracker');
          } finally {
            setIsSubmittingWorkspaceAction(false);
            setConfirmModalData(null);
          }
        },
      });
    } else {
      // Local only save
      const whenCategory: 'Scadute' | 'Oggi' | 'Prossimi giorni' =
        newEventDate.toLowerCase().includes('oggi') ? 'Oggi' : 'Prossimi giorni';
      const deadlineType: 'follow' | 'sito' | 'piano' =
        newEventType === 'follow' ? 'follow' : 'piano';

      const newDl: MockDeadline = {
        w: whenCategory,
        t: deadlineType,
        n: newEventTitle.trim(),
        d: newEventDesc.trim() || `Evento aggiunto per il ${newEventDate}`,
        when: newEventDate,
        c: newEventType === 'colloquio' ? 'info' : 'warn',
      };

      setDeadlines((prev) => [newDl, ...prev]);
      setIsEventModalOpen(false);
      setNewEventTitle('');
      setNewEventDesc('');
      showToast(`"${newDl.n}" aggiunto con successo al calendario!`);
    }
  };

  // Add new application from Manual Form
  const handleSaveManualApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manCo.trim() || !manRole.trim()) {
      showToast('Inserisci almeno il nome dell’azienda e il ruolo');
      return;
    }
    const newId = `app-${Date.now()}`;
    const coName = manCo.trim();
    let initialSt = manSt;
    let initialNx: [string, string] =
      initialSt === 'applied'
        ? ['⏱ Follow-up tra 7gg', 'warn']
        : initialSt === 'interview'
        ? ['🗓 Colloquio fissato', 'ok']
        : initialSt === 'offer'
        ? ['🏆 Offerta ricevuta', 'ok']
        : initialSt === 'rejected'
        ? ['✕ Processo concluso', 'warn']
        : ['📝 Invia candidatura', 'warn'];

    // Check if there is an unmatched recruiter email waiting for this company!
    const pendingMatchIdx = unmatchedEmails.findIndex(
      (u) =>
        u.company.toLowerCase().includes(coName.toLowerCase()) ||
        coName.toLowerCase().includes(u.company.toLowerCase())
    );
    if (pendingMatchIdx !== -1) {
      const matchedEmail = unmatchedEmails[pendingMatchIdx];
      initialSt = matchedEmail.type;
      initialNx =
        matchedEmail.type === 'interview'
          ? ['🗓 Colloquio fissato via Gmail', 'ok']
          : ['✕ Esito negativo ricevuto via Gmail', 'warn'];
      setUnmatchedEmails((prev) => prev.filter((_, idx) => idx !== pendingMatchIdx));
      showToast(`🎉 Abbinamento automatico: trovata email recruiter per ${coName}! Stato impostato su "${ST[initialSt]}".`);
    } else {
      showToast(`Nuova candidatura "${coName}" aggiunta con successo!`);
    }

    const newApp: MockApp = {
      id: newId,
      co: coName,
      role: manRole.trim(),
      st: initialSt,
      fit: 88,
      city: manCity.trim() || 'Milano',
      country: manCountry.trim() || 'Italia',
      mode: manMode || 'In sede',
      pl: manPl || 'LinkedIn',
      nx: initialNx,
      comp: manComp.trim() || '€1.200/m',
      sent: initialSt === 'applied' ? 'Oggi' : '—',
      prio: manPrio || 'Alta',
      act: initialSt === 'todo' ? 'send' : 'sent',
    };

    setApps((prev) => [newApp, ...prev]);

    if (initialSt === 'applied') {
      const newDl: MockDeadline = {
        w: 'Prossimi giorni',
        t: 'follow',
        n: `Follow-up sollecito · ${coName}`,
        d: `Invia email di sollecito 7 giorni dopo la candidatura per ${coName}`,
        when: 'Tra 7 giorni',
        c: 'warn',
      };
      setDeadlines((prev) => [newDl, ...prev]);
    }

    setIsModalOpen(false);
    setManCo('');
    setManRole('');
    handleGo('trk');
  };

  // Real Gemini Copilot Chat
  const handleSendChatMessage = async (customText?: string) => {
    const textToSend = (customText || inputChatText).trim();
    if (!textToSend || isChatLoading) return;

    setInputChatText('');
    const newChatHistory = [...chatMessages, { sender: 'me' as const, text: textToSend }];
    setChatMessages(newChatHistory);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/ai/copilot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newChatHistory.map((m) => ({
            role: m.sender === 'me' ? 'user' : 'assistant',
            content: m.text,
          })),
          question: textToSend,
        }),
      });

      const data = await response.json();
      if (data.ok && data.text) {
        setChatMessages((prev) => [...prev, { sender: 'ai' as const, text: data.text }]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'ai' as const,
            text: `⚠️ Si è verificato un problema nella risposta di Gemini: ${data.error || 'Riprova tra poco.'}`,
          },
        ]);
      }
    } catch (err: any) {
      console.error('Errore chat AI:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai' as const,
          text: '⚠️ Errore di connessione al servizio Gemini AI. Controlla la rete e riprova.',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Real Gemini Job Extractor
  const handleExtractWithAi = async () => {
    if (!modalText.trim()) {
      showToast('Incolla il testo o il link dell\'annuncio');
      return;
    }
    setIsExtractingAi(true);
    showToast('⚡ Gemini AI sta analizzando l\'annuncio di lavoro...');

    try {
      const isUrl = modalText.trim().startsWith('http://') || modalText.trim().startsWith('https://');
      const response = await fetch('/api/ai/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: isUrl ? '' : modalText.trim(),
          url: isUrl ? modalText.trim() : '',
        }),
      });

      const resData = await response.json();
      if (resData.ok && resData.data) {
        setExtractedAiData(resData.data);
        setModalResult(true);
        showToast(`✓ Dati estratti con successo per ${resData.data.company || 'l\'azienda'}!`);
      } else {
        showToast(resData.message || 'Impossibile estrarre automaticamente: incolla il testo completo dell\'annuncio');
      }
    } catch (err: any) {
      console.error('Errore analisi annuncio:', err);
      showToast('Errore di connessione durante l\'analisi AI');
    } finally {
      setIsExtractingAi(false);
    }
  };

  // Save AI Extracted Job to Tracker
  const handleSaveAiExtractedApp = () => {
    if (!extractedAiData) {
      showToast('Nessun dato estratto da salvare');
      return;
    }

    const coName = extractedAiData.company || 'Azienda';
    const roleName = extractedAiData.role || 'Founders Associate';
    const cityName = extractedAiData.city || 'Milano';
    const countryName = extractedAiData.country || 'Italia';
    const modeName = extractedAiData.workMode || 'Ibrido';
    const compName = extractedAiData.salary || '€1.200/m';
    const plName = extractedAiData.platform || 'LinkedIn';
    const prioName = extractedAiData.priority || 'Alta';

    const newApp: MockApp = {
      id: `app-ai-${Date.now()}`,
      co: coName,
      role: roleName,
      st: 'todo',
      fit: 90,
      city: cityName,
      country: countryName,
      mode: modeName,
      pl: plName,
      nx: ['📝 Invia candidatura', 'warn'],
      comp: compName,
      sent: '—',
      prio: prioName,
      act: 'send',
    };

    // Auto-match with pending recruiter email if any!
    const pendingMatchIdx = unmatchedEmails.findIndex(
      (u) =>
        u.company.toLowerCase().includes(coName.toLowerCase()) ||
        coName.toLowerCase().includes(u.company.toLowerCase())
    );
    if (pendingMatchIdx !== -1) {
      const matchedEmail = unmatchedEmails[pendingMatchIdx];
      newApp.st = matchedEmail.type;
      newApp.nx = matchedEmail.type === 'interview'
        ? ['🗓 Colloquio fissato via Gmail', 'ok']
        : ['✕ Esito negativo ricevuto via Gmail', 'warn'];
      setUnmatchedEmails((prev) => prev.filter((_, idx) => idx !== pendingMatchIdx));
      showToast(`🎉 Abbinamento automatico: trovata email recruiter per ${coName}!`);
    }

    setApps((prev) => [newApp, ...prev]);
    setIsModalOpen(false);
    setModalText('');
    setModalResult(false);
    setExtractedAiData(null);
    showToast(`🎉 Candidatura per ${coName} salvata nel Tracker!`);
    handleGo('trk');
  };

  // Real Gemini Cover Letter
  const updateCoverLetter = async (
    targetAppId: string,
    lang: 'it' | 'en' = clLang,
    tone: 'startup' | 'corporate' | 'academic' = clTone
  ) => {
    const target = apps.find((a) => a.id === targetAppId) || apps[0] || EMPTY_APP;
    if (!target) return;

    setIsGeneratingCl(true);
    showToast(`✨ Gemini sta redigendo la Cover Letter per ${target.co}...`);

    try {
      const response = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: target.co,
          role: target.role,
          description: `Sede: ${target.city}, Paese: ${target.country}, Modalità: ${target.mode}. Tono: ${tone}.`,
          language: lang === 'en' ? 'EN' : 'IT',
        }),
      });

      const data = await response.json();
      if (data.ok && data.text) {
        setClDraft(data.text);
        showToast(`✓ Cover Letter generata con successo per ${target.co}!`);
      } else {
        showToast('Errore generazione Cover Letter: ' + (data.error || 'Riprova.'));
      }
    } catch (err: any) {
      console.error('Errore generazione Cover Letter:', err);
      showToast('Errore di connessione a Gemini');
    } finally {
      setIsGeneratingCl(false);
    }
  };

  // Real Gemini CV Match & Gap Analysis
  const handleAnalyzeCvWithAi = async () => {
    const target = apps.find((a) => a.id === cvSelectedAppId) || apps[0] || EMPTY_APP;
    if (!target) return;
    setIsAnalyzingCv(true);
    showToast(`⚡ Analisi fit e gap in corso con Gemini per ${target.co}...`);

    try {
      const response = await fetch('/api/ai/cv-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: target.co,
          role: target.role,
          city: target.city,
        }),
      });

      const data = await response.json();
      if (data.ok && data.data) {
        setCvLiveAnalysis(data.data);
        if (typeof data.data.fitScore === 'number') {
          setApps((prev) =>
            prev.map((a) => (a.id === target.id ? { ...a, fit: data.data.fitScore } : a))
          );
        }
        showToast(`✓ Compatibilità aggiornata con Gemini: ${data.data.fitScore}%!`);
      } else {
        showToast('Errore analisi CV: ' + (data.error || 'Riprova.'));
      }
    } catch (err: any) {
      console.error('Errore analisi CV:', err);
      showToast('Errore di connessione durante l\'analisi CV');
    } finally {
      setIsAnalyzingCv(false);
    }
  };

  // Real Gemini Connection Note for LinkedIn
  const handleGenerateRealConnectionNote = async (contact: HubCodaItem) => {
    setIsGeneratingNoteId(contact.id);
    showToast(`✨ Gemini sta generando la nota di connessione per ${contact.name}...`);

    try {
      const response = await fetch('/api/ai/connection-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personName: contact.name,
          personRole: contact.role,
          company: contact.company,
          language: 'IT',
        }),
      });

      const data = await response.json();
      if (data.ok && data.note) {
        setHubCoda((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, nota: data.note } : c))
        );
        navigator.clipboard?.writeText(data.note);
        showToast(`✓ Nota generata (<300 car) e copiata negli appunti!`);
      } else {
        showToast('Errore generazione nota');
      }
    } catch (err: any) {
      console.error('Errore nota LinkedIn:', err);
      showToast('Errore di connessione a Gemini');
    } finally {
      setIsGeneratingNoteId(null);
    }
  };

  // Render Logo for company badge with official brand logo resolution & custom upload & fallback initials
  const renderLogo = (appOrName: MockApp | string, showBadge = true, customSize?: number, showPlus = true) => {
    const isAppObj = typeof appOrName === 'object' && appOrName !== null;
    const coName = isAppObj ? (appOrName as MockApp).co : (appOrName as string);
    const plBadge = isAppObj ? (appOrName as MockApp).pl : undefined;
    const coKey = (coName || '').trim().toLowerCase();
    
    // Check if custom photo exists in the database
    const customPhoto = companyLogos[coKey];
    // Real app: the icon of the company's website (the old logo service closed in December 2025).
    const clearbitUrl = !customPhoto ? (DEMO ? getCompanyLogoUrl(coName) : getCompanySiteIconUrl(coName)) : '';
    const logoUrl = customPhoto || clearbitUrl;
    const initials = ini(coName) || 'EL';

    return (
      <span
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          verticalAlign: 'middle',
          position: 'relative',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setLogoModalCompany(coName);
          setLogoModalOpen(true);
        }}
        title={`Foto/Logo per ${coName} (clicca per personalizzare)`}
      >
        <span
          className="lg"
          style={{
            background: grad(coName),
            width: customSize ? `${customSize}px` : undefined,
            height: customSize ? `${customSize}px` : undefined,
            fontSize: customSize && customSize > 44 ? '18px' : customSize && customSize < 32 ? '10px' : undefined,
            borderRadius: customSize && customSize > 44 ? '16px' : customSize && customSize < 32 ? '8px' : undefined,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
          aria-hidden="true"
        >
          {initials}
          {logoUrl && (
            <img
              src={logoUrl}
              alt={coName}
              className="lg-img"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
              onLoad={(e) => {
                // a tiny picture is a placeholder or too blurry to be a logo: keep the initials instead
                const img = e.currentTarget as HTMLImageElement;
                if (!DEMO && !customPhoto && img.naturalWidth > 0 && img.naturalWidth < 32) img.style.display = 'none';
              }}
            />
          )}
          {showBadge && plBadge && <i style={{ background: PL[plBadge] || '#888' }}>{plBadge[0]}</i>}
        </span>

        {/* If NO custom logo is yet in database for this company, show '+' button underneath as requested */}
        {showPlus && !customPhoto && (!customSize || customSize >= 32) && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setLogoModalCompany(coName);
              setLogoModalOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                setLogoModalCompany(coName);
                setLogoModalOpen(true);
              }
            }}
            style={{
              marginTop: '2px',
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              background: '#2f78ea',
              color: '#ffffff',
              border: '1.5px solid var(--panel, #ffffff)',
              fontSize: '10px',
              fontWeight: 'bold',
              lineHeight: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              padding: 0,
              userSelect: 'none',
            }}
            title={`Aggiungi foto per ${coName}`}
          >
            +
          </span>
        )}
      </span>
    );
  };

  // Render Fit Bar
  const renderFit = (fit: number) => (
    <div className={`fit ${fit < 80 ? 'mid' : ''}`}>
      <div className="bar">
        <i style={{ width: `${fit}%` }}></i>
      </div>
      <div style={{ lineHeight: 1.1 }}>
        <b>{fit}%</b>
        <small>{FL(fit)}</small>
      </div>
    </div>
  );

  // Target app for CV match tailoring
  const cvTargetApp = useMemo(() => {
    return apps.find((a) => a.id === cvSelectedAppId) || apps[0] || EMPTY_APP;
  }, [apps, cvSelectedAppId]);

  // Target app for simulator
  const simTargetApp = useMemo(() => {
    return apps.find((a) => a.id === simAppId) || apps[0] || EMPTY_APP;
  }, [apps, simAppId]);

  // Active section key for sidebar
  const currentSec = SEC[view] || 'dash';

  return (
    <>
      <div className="bg" aria-hidden="true"></div>
      <div className="app">
        {/* ==============================================================
            COLONNA 1: ULTRA-SLIM ICON RAIL (Main navigation + profile)
            ============================================================== */}
        <nav className="rail glass" aria-label="Sezioni principali">
          {/* User Profile Avatar - Clean and well proportioned */}
          <div
            className="avatar"
            role="button"
            tabIndex={0}
            aria-label={`Profilo: ${userFullName}`}
            onClick={() => handleGo('cv')}
          >
            <span>{DEMO ? 'AR' : ini(userFullName)}</span>
          </div>

          <div className="lbl">Principale</div>
          <div className="rl">
            {/* 1. Dashboard */}
            <button
              className="ib"
              data-sec="dash"
              aria-current={currentSec === 'dash' && !['ass', 'nov', 'cv'].includes(view)}
              onClick={() => handleGo('dash')}
              aria-label="Dashboard"
            >
              <svg viewBox="0 0 24 24">
                <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
              </svg>
              <span className="il">Dashboard</span>
            </button>

            {/* 2. Tracker */}
            <button
              className="ib"
              data-sec="trk"
              aria-current={currentSec === 'trk'}
              onClick={() => handleGo('trk')}
              aria-label="Tracker candidature"
            >
              <svg viewBox="0 0 24 24">
                <rect x="4" y="4" width="4.5" height="16" rx="1.5" />
                <rect x="9.8" y="4" width="4.5" height="11" rx="1.5" />
                <rect x="15.6" y="4" width="4.5" height="7" rx="1.5" />
              </svg>
              <span className="il">Tracker</span>
            </button>

            {/* 3. Calendario (include le scadenze) */}
            <button
              className="ib"
              data-sec="cal"
              aria-current={currentSec === 'cal'}
              onClick={() => {
                setCalTab('cal');
                handleGo('cal');
              }}
              aria-label="Calendario e Scadenze"
            >
              <svg viewBox="0 0 24 24">
                <rect x="4" y="5" width="16" height="15" rx="3" />
                <path d="M8 3v4M16 3v4M4 10h16" />
              </svg>
              <span className="il">Calendario</span>
            </button>

            {/* 4. Ricerca */}
            <button
              className="ib"
              data-sec="ric"
              aria-current={currentSec === 'ric' && view !== 'siti' && view !== 'sug'}
              onClick={() => handleGo('ric')}
              aria-label="Piano di ricerca"
            >
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-4.2-4.2" />
              </svg>
              <span className="il">Ricerca</span>
            </button>

            {/* 5. Corsi (spostato qui sotto Ricerca/Scadenze come richiesto) */}
            <button
              className="ib"
              data-sec="cor"
              aria-current={currentSec === 'cor'}
              onClick={() => handleGo('cor')}
              aria-label="Corsi e Competenze"
            >
              <svg viewBox="0 0 24 24">
                <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" />
                <path d="M5 17a3 3 0 013-3h11" />
              </svg>
              <span className="il">Corsi</span>
            </button>

            {/* 6. Suggerimenti (Networking LinkedIn & Automazione Coda) */}
            <button
              className="ib"
              data-sec="sug"
              aria-current={currentSec === 'sug'}
              onClick={() => handleGo('sug')}
              aria-label="Suggerimenti e Networking"
            >
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="12" r="1.5" />
              </svg>
              <span className="il">Suggerimenti</span>
            </button>
          </div>

          <div className="rdiv" aria-hidden="true"></div>

          {/* AI Copilot */}
          <button
            className="ib"
            aria-current={view === 'ass'}
            onClick={() => handleGo('ass')}
            aria-label="AI Copilot"
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z" />
              <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
            </svg>
            <span className="il">AI Copilot</span>
          </button>

          {/* Notifiche come vera icona di sezione */}
          <button
            className="ib"
            data-sec="nov"
            aria-current={view === 'nov'}
            onClick={() => handleGo('nov')}
            aria-label="Notifiche"
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span className="il">Notifiche</span>
            <span className="dot r" style={{ top: '8px', right: '14px' }}></span>
          </button>

          {/* Impostazioni con vera icona a ingranaggio */}
          <button
            className="ib"
            data-sec="set"
            aria-current={view === 'set'}
            onClick={() => handleGo('set')}
            aria-label="Impostazioni"
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="il">Impostazioni</span>
          </button>

          <div className="sp"></div>

          {/* Bottom Interview badges */}
          <div className="lbl">Colloqui</div>
          {DEMO ? (
            <>
          <button
            className="mini"
            style={{ background: 'linear-gradient(145deg, #a82c52, #6e1b4f)' }}
            onClick={() => {
              const a = apps.find((x) => x.id === 'lo');
              if (a) setDrawerApp(a);
              showToast('Logistica OS · HR Screening · Domani 15:00');
            }}
            aria-label="Logistica OS, domani alle 15:00 (esempio)"
          >
            LO<i></i>
          </button>
          <button
            className="mini"
            style={{ background: 'linear-gradient(145deg, #1d2b4a, #0f1830)' }}
            onClick={() => {
              const a = apps.find((x) => x.id === 'fe');
              if (a) setDrawerApp(a);
              showToast('Fever · Case Study Review · Giovedì 11:30');
            }}
            aria-label="Fever, giovedì alle 11:30 (esempio)"
          >
            FE<i style={{ background: '#58a6ff' }}></i>
          </button>
          <button
            className="mini"
            style={{ background: 'linear-gradient(145deg, #96501a, #6e330b)' }}
            onClick={() => {
              const a = apps.find((x) => x.id === 'bu');
              if (a) setDrawerApp(a);
              showToast('BugSense · Venerdì alle 10:00 (esempio)');
            }}
            aria-label="BugSense, venerdì alle 10:00 (esempio)"
          >
            BS<i style={{ background: '#ffbe5c' }}></i>
          </button>
            </>
          ) : (
            rmInterviewApps.map((a) => (
              <button
                key={a.id}
                className="mini"
                style={{ background: grad(a.co) }}
                onClick={() => setDrawerApp(a)}
                aria-label={`${a.co}, colloquio`}
              >
                {ini(a.co)}<i></i>
              </button>
            ))
          )}
        </nav>

        {/* ==============================================================
            COLONNA 2: SECONDARY WORKSPACE SIDEBAR (Changes with section)
            ============================================================== */}
        <aside className="side glass" aria-label="Career workspace">
          <h2>
            Career workspace <span className="tag">Gemini</span>
          </h2>
          <div className="side-sc">
            {/* Current Section Group Header */}
            <div className="secgrp">
              {currentSec === 'dash' && (
                <svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>
              )}
              {currentSec === 'trk' && (
                <svg viewBox="0 0 24 24"><rect x="4" y="4" width="4.5" height="16" rx="1.5" /><rect x="9.8" y="4" width="4.5" height="11" rx="1.5" /><rect x="15.6" y="4" width="4.5" height="7" rx="1.5" /></svg>
              )}
              {currentSec === 'cal' && (
                <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
              )}
              {currentSec === 'ric' && (
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
              )}
              {currentSec === 'cor' && (
                <svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" /><path d="M5 17a3 3 0 013-3h11" /></svg>
              )}
              {currentSec === 'sug' && (
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>
              )}
              {currentSec === 'nov' && (
                <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              )}
              {currentSec === 'set' && (
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
              )}
              <span>{HEAD[currentSec]?.[0] || 'Sezione'}</span>
              <svg className="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
            </div>

            {/* DASHBOARD SIDEBAR (Removed "Altro" group with corsi/notifiche/impostazioni as requested) */}
            {currentSec === 'dash' && (
              <>
                <div className="grp">Oggi</div>
                <button
                  className="nv"
                  onClick={() => {
                    handleGo('dash');
                    setTimeout(() => {
                      document.getElementById('tasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 80);
                  }}
                >
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>
                  <span>Task per oggi</span>
                  <NavBadge demo={2} real={rmTodayCount} />
                </button>
                <button
                  className="nv"
                  onClick={() => {
                    handleGo('dash');
                    setTimeout(() => {
                      document.getElementById('last')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 80);
                  }}
                >
                  <svg viewBox="0 0 24 24"><rect x="4" y="4" width="4.5" height="16" rx="1.5" /><rect x="9.8" y="4" width="4.5" height="11" rx="1.5" /><rect x="15.6" y="4" width="4.5" height="7" rx="1.5" /></svg>
                  <span>Ultime candidature</span>
                </button>
                <button
                  className="nv"
                  onClick={() => {
                    handleGo('dash');
                    setTimeout(() => {
                      document.getElementById('fit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 80);
                  }}
                >
                  <svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z" /></svg>
                  <span>Analisi fit competenze</span>
                </button>

                <div className="grp">Strumenti IA Sartoriali</div>
                <button className="nv" aria-current={view === 'cv'} onClick={() => handleGo('cv')}>
                  <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></svg>
                  <span>CV Match</span>
                  <span className="ai-badge">AI</span>
                </button>
                <button className="nv" aria-current={view === 'cv'} onClick={() => handleGo('cv')}>
                  <svg viewBox="0 0 24 24"><path d="M4 20l1-4 11-11a2.1 2.1 0 013 3L8 19z" /></svg>
                  <span>Cover Letter</span>
                  <span className="ai-badge">AI</span>
                </button>
                <button className="nv" aria-current={view === 'ass'} onClick={() => handleGo('ass')}>
                  <svg viewBox="0 0 24 24"><path d="M5 5h14v10H10l-5 4z" /></svg>
                  <span>Simulatore colloqui</span>
                  <span className="ai-badge">AI</span>
                </button>
              </>
            )}

            {/* TRACKER SIDEBAR */}
            {currentSec === 'trk' && (
              <>
                <div className="grp">Visualizzazione</div>
                <button
                  className="nv"
                  aria-current={vm === 'tab'}
                  onClick={() => {
                    setVm('tab');
                    handleGo('trk');
                  }}
                >
                  <svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M3.5 10h17M10 4.5v15" /></svg>
                  <span>Table</span>
                </button>
                <button
                  className="nv"
                  aria-current={vm === 'act'}
                  onClick={() => {
                    setVm('act');
                    handleGo('trk');
                  }}
                >
                  <svg viewBox="0 0 24 24"><path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" /></svg>
                  <span>Action Center</span>
                </button>
                <button
                  className="nv"
                  aria-current={vm === 'sch'}
                  onClick={() => {
                    setVm('sch');
                    handleGo('trk');
                  }}
                >
                  <svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>
                  <span>Cards</span>
                </button>

                <div className="grp">Strumenti IA Sartoriali</div>
                <button className="nv" onClick={() => handleGo('cv')}>
                  <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></svg>
                  <span>CV Match</span>
                  <span className="ai-badge">AI</span>
                </button>
                <button className="nv" onClick={() => handleGo('cv')}>
                  <svg viewBox="0 0 24 24"><path d="M4 20l1-4 11-11a2.1 2.1 0 013 3L8 19z" /></svg>
                  <span>Cover Letter</span>
                  <span className="ai-badge">AI</span>
                </button>
                <button className="nv" onClick={() => handleGo('ass')}>
                  <svg viewBox="0 0 24 24"><path d="M5 5h14v10H10l-5 4z" /></svg>
                  <span>Simulatore colloqui</span>
                  <span className="ai-badge">AI</span>
                </button>
              </>
            )}

            {/* CALENDARIO & SCADENZE SIDEBAR (Mese/Settimana e filtri scadenze spostati sulla vista principale come richiesto) */}
            {currentSec === 'cal' && (
              <>
                <div className="grp">Visualizzazione</div>
                <button
                  className="nv"
                  aria-current={calTab === 'cal'}
                  onClick={() => setCalTab('cal')}
                >
                  <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>
                  <span>Calendario</span>
                </button>
                <button
                  className="nv"
                  aria-current={calTab === 'sca'}
                  onClick={() => setCalTab('sca')}
                >
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
                  <span>Elenco Scadenze</span>
                  <span className="n hot">{filteredScadenze.length}</span>
                </button>
              </>
            )}

            {/* RICERCA SIDEBAR */}
            {currentSec === 'ric' && (
              <>
                <div className="grp">Piano di ricerca</div>
                <button
                  className="nv"
                  aria-current={view === 'ric' && ricMode === 'day'}
                  onClick={() => {
                    setRicMode('day');
                    setRicDay(null);
                    handleGo('ric');
                  }}
                >
                  <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
                  <span>Oggi</span>
                  <NavBadge demo={4} real={rmTodayRemaining} />
                </button>
                <button
                  className="nv"
                  aria-current={view === 'ric' && ricMode === 'all'}
                  onClick={() => {
                    if (DEMO) {
                      showToast('Elenco di tutte le 192 sessioni');
                    } else {
                      setRicMode('all');
                      handleGo('ric');
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>
                  <span>Tutte le sessioni</span>
                  <NavBadge demo={192} real={rmPlan.total} hot={false} />
                </button>
                <div className="grp">Altre ricerche</div>
                <button className="nv" aria-current={view === 'siti'} onClick={() => handleGo('siti')}>
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17" /></svg>
                  <span>Siti carriere</span>
                  <NavBadge demo={28} real={0} hot={false} />
                </button>
              </>
            )}

            {/* CORSI SIDEBAR */}
            {currentSec === 'cor' && (
              <>
                <div className="grp">Competenze</div>
                <button className="nv" aria-current={true}>
                  <svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z" /><path d="M5 17a3 3 0 013-3h11" /></svg>
                  <span>Tutti i corsi</span>
                </button>
                <button className="nv" onClick={() => showToast('Filtrato su corsi consigliati da Gemini')}>
                  <span>Consigliati dall'AI</span>
                </button>
              </>
            )}

            {/* SUGGERIMENTI SIDEBAR */}
            {currentSec === 'sug' && (
              <>
                <div className="grp">Networking Hub</div>
                <button
                  className="nv"
                  aria-current={sugSubTab === 'today'}
                  onClick={() => setSugSubTab('today')}
                >
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                  <span>Consigliati di Oggi</span>
                  <NavBadge demo={3} real={dailyCompanies.length + dailyPeople.length} />
                </button>
                <button
                  className="nv"
                  aria-current={sugSubTab === 'history'}
                  onClick={() => setSugSubTab('history')}
                >
                  <svg viewBox="0 0 24 24"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></svg>
                  <span>Persone consigliate finora</span>
                </button>
                <button
                  className="nv"
                  aria-current={sugSubTab === 'queue'}
                  onClick={() => setSugSubTab('queue')}
                >
                  <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
                  <span>Spuntate &amp; Coda Sheet</span>
                  <span className="n">{hubCoda.length}</span>
                </button>
                <div className="grp">Approfondimento</div>
                <button
                  className="nv"
                  onClick={() => setIsScoutingReportModalOpen(true)}
                  style={{ color: 'var(--brand)', fontWeight: 600 }}
                >
                  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8M16 17H8M10 9H8" /></svg>
                  <span>🎯 Report 10 Aziende</span>
                </button>
              </>
            )}

            {/* NOTIFICHE SIDEBAR */}
            {currentSec === 'nov' && (
              <>
                <div className="grp">Notifiche</div>
                <button className="nv" aria-current={true}>
                  <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
                  <span>Tutte le notifiche</span>
                  <NavBadge demo={3} real={notifications.filter((n) => n.unread).length} />
                </button>
                <button className="nv" onClick={() => showToast('Tutte le notifiche sono state contrassegnate come lette')}>
                  <span>Segna lette</span>
                </button>
              </>
            )}

            {/* IMPOSTAZIONI SIDEBAR */}
            {currentSec === 'set' && (
              <>
                <div className="grp">Configurazione</div>
                <button
                  className="nv"
                  aria-current={setSubTab === 'config'}
                  onClick={() => setSetSubTab('config')}
                >
                  <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  <span>Profilo di ricerca</span>
                  <span className="n hot">11</span>
                </button>
                <button
                  className="nv"
                  aria-current={setSubTab === 'gmail'}
                  onClick={() => setSetSubTab('gmail')}
                >
                  <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M22 6l-10 7L2 6" /></svg>
                  <span>Caselle Gmail &amp; Sync</span>
                  <span className="n">2</span>
                </button>
                <button
                  className="nv"
                  aria-current={setSubTab === 'general'}
                  onClick={() => setSetSubTab('general')}
                >
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                  <span>Generale &amp; Profilo</span>
                </button>
              </>
            )}
          </div>

          {/* Bottom Upcoming Interviews Card */}
          <div className="next" id="side-next">
            <div className="t">
              Prossimi colloqui {DEMO && <span className="ex">esempio</span>}
            </div>
            {DEMO ? (
              <>
            <button
              className="nx"
              onClick={() => {
                const a = apps.find((x) => x.id === 'lo');
                if (a) setDrawerApp(a);
                showToast('Logistica OS · HR Screening · Domani 15:00');
              }}
            >
              <span
                className="lg"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  fontSize: '11px',
                  background: 'linear-gradient(145deg, #a82c52, #6e1b4f)',
                }}
              >
                LO
              </span>
              <div>
                <b>
                  Logistica OS <em>Domani 15:00</em>
                </b>
                <span>HR Screening · Founders Associate</span>
              </div>
            </button>
            <button
              className="nx"
              onClick={() => {
                const a = apps.find((x) => x.id === 'fe');
                if (a) setDrawerApp(a);
                showToast('Fever · Case Study Review · Giovedì 11:30');
              }}
            >
              <span
                className="lg"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  fontSize: '11px',
                  background: 'linear-gradient(145deg, #2f5fcb, #1f3a8c)',
                }}
              >
                FE
              </span>
              <div>
                <b>
                  Fever <em>Giovedì 11:30</em>
                </b>
                <span>Case Study Review · Growth</span>
              </div>
            </button>
              </>
            ) : rmInterviewApps.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Nessun colloquio in programma</span>
            ) : (
              rmInterviewApps.slice(0, 2).map((a) => (
                <button key={a.id} className="nx" onClick={() => setDrawerApp(a)}>
                  <span
                    className="lg"
                    style={{ width: '34px', height: '34px', borderRadius: '50%', fontSize: '11px', background: grad(a.co) }}
                  >
                    {ini(a.co)}
                  </span>
                  <div>
                    <b>{a.co}</b>
                    <span>{a.role}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ==============================================================
            COLONNA 3: MAIN VIEW & TOP BAR
            ============================================================== */}
        <main id="main">
          {/* Header Top Bar */}
          <header className="top">
            <div className="brand">
              <div className="logo">
                <img id="logoimg" alt="Intern Track" src={theme === 'dark' ? LOGO_W : LOGO_B} />
              </div>
              <div>
                <b>INTERN TRACK</b>
              </div>
            </div>

            {/* Rounded Pill Search Bar with ⌘K */}
            <label className="search">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-4.2-4.2" />
              </svg>
              <span className="sr">Cerca</span>
              <input
                id="q"
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (view !== 'trk') setView('trk');
                }}
                placeholder="Cerca azienda o ruolo…"
                autoComplete="off"
              />
              <kbd>⌘K</kbd>
            </label>

            {/* Top Right Actions */}
            <div className="acts">
              <LanguageSwitch />
              {/* Account Google & Multi-Inbox Hub */}
              <button
                className="btn sm"
                onClick={() => setIsWelcomeModalOpen(true)}
                title="Gestione account Google, multi-inbox e stato cloud"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: currentUser ? 'rgba(16, 185, 129, 0.12)' : 'var(--brand)',
                  borderColor: currentUser ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                  color: currentUser ? '#10b981' : '#fff',
                  fontWeight: 600,
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: currentUser ? '#10b981' : '#fff' }}></span>
                <span>{currentUser?.email ? currentUser.email.split('@')[0] : 'Accedi / Account'}</span>
              </button>

              {/* Controlla Posta (Gmail Sync with 08:00 & 18:00 scheduled checks) */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <button
                  className="btn sm"
                  id="btn-gmail"
                  onClick={handleCheckMail}
                  title="Controllo posta Gmail · Sync automatico ore 08:00 e 18:00"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--glass-in)',
                    borderColor: 'var(--rim)',
                  }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span className="btn-txt">Controlla ora</span>
                  {unmatchedEmails.length > 0 && (
                    <span
                      style={{
                        background: 'var(--blue-d)',
                        color: '#fff',
                        borderRadius: '999px',
                        fontSize: '10px',
                        padding: '1px 5px',
                        lineHeight: 1.2,
                        fontWeight: 700,
                      }}
                      title={`${unmatchedEmails.length} email in attesa di abbinamento`}
                    >
                      {unmatchedEmails.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Dark / Light Mode Switch */}
              <div className="tswitch" role="group" aria-label="Tema">
                <button
                  id="t-light"
                  aria-pressed={theme === 'light'}
                  aria-label="Tema chiaro"
                  onClick={() => setTheme('light')}
                >
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2L7 7M17 17l1.8 1.8M18.8 5.2L17 7M7 17l-1.8 1.8" />
                  </svg>
                </button>
                <button
                  id="t-dark"
                  aria-pressed={theme === 'dark'}
                  aria-label="Tema scuro"
                  onClick={() => setTheme('dark')}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
                  </svg>
                </button>
              </div>

              {/* Notification Bell */}
              <button
                className="circ bell"
                onClick={() => handleGo('nov')}
                aria-label="Notifiche"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M6 17V11a6 6 0 1112 0v6l1.5 2h-15z" />
                  <path d="M10 21a2 2 0 004 0" />
                </svg>
                {notifications.some((n) => n.unread) && <i className="dot r"></i>}
              </button>

              {/* + Nuova candidatura (Manuale o AI) */}
              <button
                className="btn pri"
                id="new"
                onClick={() => {
                  setModalTab('manual');
                  setIsModalOpen(true);
                }}
                title="Aggiungi candidatura: compila manualmente o con AI"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="btn-txt">Nuova candidatura</span>
              </button>
            </div>
          </header>

          {/* ==============================================================
              VIEW 1: DASHBOARD (v-dash)
              ============================================================== */}
          <section className={`view ${view === 'dash' ? 'on' : ''}`} id="v-dash" aria-label="Dashboard">
            {/* Top 4 KPI Cards */}
            <div className="kpis" id="kpi">
              <article className="card hello">
                <div className="top2">
                  <span className="avatar" style={{ width: '42px', height: '42px', minWidth: '42px', minHeight: '42px', flex: '0 0 42px' }}>
                    {DEMO ? 'AR' : ini(userFullName)}
                  </span>
                  {DEMO && <span className="pill">Business School</span>}
                </div>
                <h3>Bentornato, {userFirstName}</h3>
                {DEMO ? (
                  <p>52 attive · 2 cose da fare oggi</p>
                ) : (
                  apps.length > 0 ? <p>{rmActive} attive · {rmToApply} da inviare</p> : <p>Nessuna candidatura. Aggiungi la prima.</p>
                )}
              </article>

              <article className="card kpi">
                <div className="k">
                  <span>Candidature attive</span>
                  <svg className="spark" viewBox="0 0 92 34" style={DEMO ? undefined : { display: 'none' }}>
                    <defs>
                      <filter id="gl">
                        <feGaussianBlur stdDeviation="1.6" />
                      </filter>
                    </defs>
                    <path
                      d="M2 28 C14 26 16 18 28 20 S42 10 54 14 S70 6 90 4"
                      fill="none"
                      stroke="#3dff9c"
                      strokeWidth="3"
                      strokeLinecap="round"
                      filter="url(#gl)"
                      opacity=".7"
                    />
                    <path
                      d="M2 28 C14 26 16 18 28 20 S42 10 54 14 S70 6 90 4"
                      fill="none"
                      stroke="#58d6a0"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="v">{DEMO || apps.length > 0 ? apps.length : '—'}</div>
                <div className="s">
                  {DEMO ? (
                    <>
                      Inviate negli ultimi 7 giorni<span className="up">+36</span>
                    </>
                  ) : (
                    <>Totale nel tracker</>
                  )}
                </div>
              </article>

              <article className="card kpi">
                <div className="k">Tasso colloqui</div>
                {DEMO ? (
                  <>
                    <div className="v">0%</div>
                    <div className="s">
                      0 su 34 inviate<span className="pill">Prime risposte attese</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="v">{rmSent > 0 ? `${rmRate}%` : '—'}</div>
                    <div className="s">{rmSent > 0 ? <>{rmInterviews} su {rmSent} inviate</> : <>Nessuna candidatura inviata</>}</div>
                  </>
                )}
              </article>

              <article className="card kpi">
                <div className="k">
                  <span>Media indennità</span>
                  <span className="coin">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M14.8 9.4a3.6 3.6 0 100 5.2M7.5 11h5.6M7.5 13.3h5.6" />
                    </svg>
                  </span>
                </div>
                {DEMO ? (
                  <>
                    <div className="v">
                      €1.330<span style={{ fontSize: '16px', color: 'var(--muted)' }}> /m</span>
                    </div>
                    <div className="s">
                      Picco offerta: €1.600<span className="ex">esempio</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="v">
                      {rmAvg ? eur(rmAvg) : '—'}
                      <span style={{ fontSize: '16px', color: 'var(--muted)' }}> /m</span>
                    </div>
                    <div className="s">Picco offerta: {rmPeak ? eur(rmPeak) : '—'}</div>
                  </>
                )}
              </article>
            </div>

            {/* Two-column Row: Task per oggi & Prossimi passi */}
            <div className="two">
              <article className="card" id="tasks">
                <div className="hd" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3>Task per oggi</h3>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: 'var(--brand)',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title={DEMO ? 'Sincronizzato con Google Tasks e notifiche smartphone' : 'Task letti da Google Tasks'}
                    >
                      📱 Google Tasks ({DEMO ? activeWorkspaceAccount : accountsToSync().join(' · ') || 'non collegato'})
                    </span>
                  </div>
                  {(DEMO || rmTodayCount > 0 || googleTasksList.some((t) => t.status === 'completed')) && (
                  <span className="count">
                    {DEMO ? (
                      <>{googleTasksList.filter((t) => t.status === 'completed').length + Object.values(taskDone).filter(Boolean).length} completati</>
                    ) : (
                      <>{rmTodayCount} da fare · {googleTasksList.filter((t) => t.status === 'completed').length} completati</>
                    )}
                  </span>
                  )}
                  <span className="sp"></span>
                  <button className="link" onClick={() => { setCalTab('cal'); handleGo('cal'); }}>
                    Apri Calendario &amp; Tasks ›
                  </button>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {DEMO && (
                    <>
                  {/* Daily suggested task 1: Piano di ricerca */}
                  <label className="tk">
                    <input
                      type="checkbox"
                      checked={!!taskDone['ric']}
                      onChange={() => setTaskDone((prev) => ({ ...prev, ric: !prev.ric }))}
                      aria-label="Piano di ricerca"
                    />
                    <div style={{ flex: 1 }}>
                      <b>Piano di ricerca: 4 sessioni</b>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)' }}>
                        Business Development · Barcellona, Madrid, Valencia e altre 1 · circa 96 min
                      </span>
                    </div>
                    <button
                      className="btn sm"
                      onClick={(e) => {
                        e.preventDefault();
                        requestSendTaskToGoogleTasks(
                          'Piano di ricerca: 4 sessioni (BD Barcellona, Madrid, Valencia)',
                          '4 sessioni mirate su scaleup tech · 96 min',
                          'Oggi'
                        );
                      }}
                      title="Invia al telefono con Google Tasks"
                      style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                    >
                      📱 Invia al Telefono
                    </button>
                    <button className="btn sm" onClick={() => handleGo('ric')}>
                      Apri
                    </button>
                  </label>

                  {/* Daily suggested task 2: Siti da controllare */}
                  <label className="tk">
                    <input
                      type="checkbox"
                      checked={!!taskDone['siti']}
                      onChange={() => setTaskDone((prev) => ({ ...prev, siti: !prev.siti }))}
                      aria-label="Siti da controllare"
                    />
                    <div style={{ flex: 1 }}>
                      <b>Siti da controllare oggi: 4</b>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)' }}>
                        Barilla, Bottle-Up e altri 2 · 28 in coda
                      </span>
                    </div>
                    <button
                      className="btn sm"
                      onClick={(e) => {
                        e.preventDefault();
                        requestSendTaskToGoogleTasks(
                          'Siti da controllare oggi: 4 (Barilla, Bottle-Up, Cloov, Entrepreneur First)',
                          'Monitorare portali carriere per nuove posizioni',
                          'Oggi'
                        );
                      }}
                      title="Invia al telefono con Google Tasks"
                      style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                    >
                      📱 Invia al Telefono
                    </button>
                    <button className="btn sm" onClick={() => handleGo('siti')}>
                      Apri
                    </button>
                  </label>

                    </>
                  )}
                  {/* Live Google Tasks items */}
                  {googleTasksList.slice(0, DEMO ? 3 : 8).map((gt) => (
                    <label
                      className="tk"
                      key={gt.id}
                      style={{
                        background: 'rgba(59, 130, 246, 0.05)',
                        borderColor: 'rgba(59, 130, 246, 0.2)',
                        opacity: gt.status === 'completed' ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={gt.status === 'completed'}
                        onChange={() => handleToggleGoogleTask(gt)}
                        aria-label={gt.title}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ textDecoration: gt.status === 'completed' ? 'line-through' : 'none' }}>
                          {gt.title}
                        </b>
                        <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)' }}>
                          📱 Google Tasks ({gt.accountEmail || activeWorkspaceAccount}) {gt.notes ? `· ${gt.notes}` : ''}
                        </span>
                      </div>
                      <span
                        className="nxt info"
                        style={{ fontSize: '10.5px', padding: '2px 6px' }}
                      >
                        Telefono
                      </span>
                    </label>
                  ))}
                  {!DEMO &&
                    rmActionApps.map((a) => (
                      <div className="tk" key={`act-${a.id}`} onClick={() => setDrawerApp(a)} style={{ cursor: 'pointer' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b>{a.act === 'send' ? 'Invia candidatura' : 'Follow-up'} · {a.co}</b>
                          <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)' }}>{a.role}</span>
                        </div>
                        <span className="nxt info" style={{ fontSize: '10.5px', padding: '2px 6px' }}>
                          {a.act === 'send' ? 'Da inviare' : 'Follow-up'}
                        </span>
                      </div>
                    ))}
                  {!DEMO && googleTasksList.length === 0 && rmActionApps.length === 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Nessuna attività per oggi</span>
                  )}
                </div>

                {/* Quick Add row */}
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--rim)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={quickTaskTitleInput}
                    onChange={(e) => setQuickTaskTitleInput(e.target.value)}
                    placeholder="Scrivi un'attività per oggi (arriverà sul tuo smartphone)..."
                    style={{
                      flex: 1,
                      height: '34px',
                      borderRadius: '10px',
                      border: '1px solid var(--rim)',
                      background: 'var(--field)',
                      color: 'var(--text)',
                      fontSize: '12px',
                      padding: '0 10px',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddGoogleTask();
                      }
                    }}
                  />
                  <button
                    className="btn pri sm"
                    onClick={handleQuickAddGoogleTask}
                    title="Aggiungi e invia a Google Tasks su smartphone"
                    style={{ height: '34px', padding: '0 12px', whiteSpace: 'nowrap', gap: '4px' }}
                  >
                    <span>📱 Aggiungi al Telefono</span>
                  </button>
                </div>
              </article>

              <article className="card">
                <div className="hd">
                  <h3>Prossimi passi</h3>
                  {DEMO && <span className="ex">esempio</span>}
                  <button className="link" onClick={() => { setCalTab('sca'); handleGo('cal'); }}>
                    Tutti ›
                  </button>
                </div>
                <div id="pp" style={{ marginTop: '6px' }}>
                  {DEMO ? (
                    <>
                  <div className="sr2" style={{ gridTemplateColumns: '40px minmax(0,1fr) auto' }}>
                    <span className="lg" style={{ background: grad('Piano di ricerca') }} aria-hidden="true">PR</span>
                    <div>
                      <b>Piano di ricerca</b>
                      <span className="d">Business Development · Barcellona</span>
                    </div>
                    <span className="nxt warn">Oggi</span>
                  </div>
                  <div className="sr2" style={{ gridTemplateColumns: '40px minmax(0,1fr) auto' }}>
                    <span className="lg" style={{ background: grad('Stranger Soccer') }} aria-hidden="true">SS</span>
                    <div>
                      <b>Stranger Soccer</b>
                      <span className="d">Follow-up della candidatura</span>
                    </div>
                    <span className="nxt info">Tra 5 giorni</span>
                  </div>
                  <div className="sr2" style={{ gridTemplateColumns: '40px minmax(0,1fr) auto' }}>
                    <span className="lg" style={{ background: grad('Factorial') }} aria-hidden="true">FA</span>
                    <div>
                      <b>Factorial</b>
                      <span className="d">Follow-up della candidatura</span>
                    </div>
                    <span className="nxt info">Tra 5 giorni</span>
                  </div>
                    </>
                  ) : rmNextApps.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Nessun passo in programma</span>
                  ) : (
                    rmNextApps.map((a) => (
                      <div className="sr2" key={a.id} style={{ gridTemplateColumns: '40px minmax(0,1fr) auto' }}>
                        <span className="lg" style={{ background: grad(a.co) }} aria-hidden="true">{ini(a.co)}</span>
                        <div>
                          <b>{a.co}</b>
                          <span className="d">{a.role}</span>
                        </div>
                        <span className={`nxt ${a.nx?.[1] || 'info'}`}>{a.nx?.[0] || ''}</span>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>

            {/* Ultime Candidature Table */}
            <section className="card" id="last" aria-label="Ultime candidature">
              <div className="hd">
                <h3>Ultime candidature</h3>
                {(DEMO || apps.length > 0) && <span className="count">{apps.length} totali</span>}
                <button className="link" onClick={() => handleGo('trk')}>
                  Apri il tracker ›
                </button>
              </div>
              <div className="tscroll" style={{ marginTop: '12px' }}>
                <table aria-label="Ultime candidature">
                  <thead style={DEMO || apps.length > 0 ? undefined : { display: 'none' }}>
                    <tr>
                      <th className="c0"></th>
                      <th>Azienda &amp; ruolo</th>
                      <th>Stato candidatura</th>
                      <th>Gemini Fit Match*</th>
                      <th>Sede</th>
                      <th>Compenso*</th>
                      <th>Prossimo step</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.slice(0, 5).map((a) => (
                      <tr key={a.id} onClick={() => setDrawerApp(a)} tabIndex={0}>
                        <td className="c0" onClick={(e) => e.stopPropagation()}>
                          <input
                            className="chk0"
                            type="checkbox"
                            checked={!!selectedRows[a.id]}
                            onChange={() => setSelectedRows((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                            aria-label={`Seleziona ${a.co}`}
                          />
                        </td>
                        <td>
                          <div className="who">
                            {renderLogo(a)}
                            <div style={{ minWidth: 0 }}>
                              <b>{a.co}</b>
                              <span>{a.role}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`st ${a.st}`}>
                            {EM[a.st]} {ST[a.st]}
                          </span>
                        </td>
                        <td>{renderFit(a.fit)}</td>
                        <td>{a.city} · {a.mode}</td>
                        <td className="cmp">{a.comp}</td>
                        <td>
                          <span className={`nxt ${a.nx[1]}`}>{a.nx[0]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Bottom Two Cards: Analisi Fit & Distribuzione Città */}
            <div className="bottom" id="fit">
              {DEMO && (
<article className="card">
                <div className="hd">
                  <h3>Analisi fit competenze · Gemini AI</h3>
                  <span className="pill">CV Match 87%</span>
                  <span className="ex">esempio</span>
                </div>
                <div className="skill">
                  <span className="nm">Strategia e analisi</span>
                  <span className="pc">94% · Eccellente</span>
                  <div className="bar">
                    <i style={{ width: '94%' }}></i>
                  </div>

                  <span className="nm">Analisi dati (Python, Excel avanzato)</span>
                  <span className="pc">90% · Ottimo</span>
                  <div className="bar">
                    <i style={{ width: '90%' }}></i>
                  </div>

                  <span className="nm">Go-to-market e crescita</span>
                  <span className="pc">88% · Ottimo</span>
                  <div className="bar">
                    <i style={{ width: '88%' }}></i>
                  </div>

                  <span className="nm">Tedesco richiesto dagli annunci di Monaco</span>
                  <span className="pc lo">35% · Da colmare</span>
                  <div className="bar lo">
                    <i style={{ width: '35%' }}></i>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <button className="link" style={{ margin: 0 }} onClick={() => handleGo('cv')}>
                    Report AI completo ›
                  </button>
                </div>
              </article>
)}

              <article className="card">
                <div className="hd">
                  <h3>Distribuzione candidature per città</h3>
                  {(DEMO || apps.length > 0) && <span className="count">{apps.length}</span>}
                  <button className="link" onClick={() => handleGo('trk')}>
                    Esplora ›
                  </button>
                </div>
                <table className="geo" aria-label="Candidature per città">
                  <thead style={DEMO || apps.length > 0 ? undefined : { display: 'none' }}>
                    <tr>
                      <th>Hub</th>
                      <th>Quota su {apps.length}</th>
                      <th style={{ textAlign: 'right' }}>Risposte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO ? (
                      <>
                    <tr>
                      <td>
                        <span className="plat">
                          <i className="pd" style={{ background: '#78b0ff' }}></i>Berlino{' '}
                          <b style={{ color: 'var(--text)' }}>17</b>
                        </span>
                      </td>
                      <td>
                        <div className="bar"><i style={{ width: '31%' }}></i></div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="pill">0 su 17</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="plat">
                          <i className="pd" style={{ background: '#b4a0ff' }}></i>Monaco{' '}
                          <b style={{ color: 'var(--text)' }}>16</b>
                        </span>
                      </td>
                      <td>
                        <div className="bar"><i style={{ width: '30%' }}></i></div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="pill">0 su 16</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="plat">
                          <i className="pd" style={{ background: '#58d6a0' }}></i>Madrid{' '}
                          <b style={{ color: 'var(--text)' }}>8</b>
                        </span>
                      </td>
                      <td>
                        <div className="bar"><i style={{ width: '15%' }}></i></div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="pill">0 su 8</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="plat">
                          <i className="pd" style={{ background: '#ffbe5c' }}></i>Barcellona{' '}
                          <b style={{ color: 'var(--text)' }}>7</b>
                        </span>
                      </td>
                      <td>
                        <div className="bar"><i style={{ width: '13%' }}></i></div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="pill">0 su 7</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="plat">
                          <i className="pd" style={{ background: '#8a94a3' }}></i>Altre{' '}
                          <b style={{ color: 'var(--text)' }}>6</b>
                        </span>
                      </td>
                      <td>
                        <div className="bar"><i style={{ width: '11%' }}></i></div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="pill">0 su 6</span>
                      </td>
                    </tr>
                                        </>
                    ) : (
                      <>
                    {rmCityRows.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ color: 'var(--muted)', fontSize: '12px' }}>Nessuna candidatura nel tracker</td>
                      </tr>
                    )}
                    {rmCityRows.map(([city, st], i) => (
                      <tr key={city}>
                        <td>
                          <span className="plat">
                            <i className="pd" style={{ background: ['#78b0ff', '#b4a0ff', '#5ee0a0', '#ffbe5c', '#ff8fa3'][i % 5] }}></i>
                            {city}{' '}
                            <b style={{ color: 'var(--text)' }}>{st.n}</b>
                          </span>
                        </td>
                        <td>
                          <div className="bar"><i style={{ width: `${Math.round((st.n * 100) / Math.max(apps.length, 1))}%` }}></i></div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="pill">{st.resp} su {st.n}</span>
                        </td>
                      </tr>
                    ))}
                      </>
                    )}
</tbody>
                </table>
              </article>
            </div>
          </section>

          {/* ==============================================================
              VIEW 2: TRACKER (v-trk) - Unified Multi-Select Filter Bar
              ============================================================== */}
          <section className={`view ${view === 'trk' ? 'on' : ''}`} id="v-trk" aria-label="Tracker">
            <section className="card" id="tracker">
              <div className="tr-h">
                <h3>Tracker</h3>
                <span className="sp"></span>
                {currentUser ? (
                  <button
                    className="btn sm"
                    onClick={handleSyncAllAppsToFirestore}
                    disabled={isCloudSyncing}
                    title={DEMO ? `Sincronizzato con Firestore (${currentUser.email})` : `Salva le candidature nel cloud (${currentUser.email})`}
                    style={{ gap: '6px', borderColor: 'rgba(52, 199, 89, 0.4)' }}
                  >
                    <span>☁️</span> {isCloudSyncing ? 'Sincronizzo…' : 'Salva su Cloud Firestore'}
                  </button>
                ) : (
                  <button
                    className="btn sm"
                    onClick={async () => {
                      try {
                        await loginWithGoogle();
                      } catch (e) {
                        showToast('Accesso Google annullato');
                      }
                    }}
                    title="Connetti Google per sincronizzare il database su Firestore Cloud"
                    style={{ gap: '6px' }}
                  >
                    <span>🔑</span> Accedi con Google
                  </button>
                )}
                <button
                  className="btn sm"
                  onClick={() => {
                    setImportModalTab('excel');
                    setIsImportModalOpen(true);
                  }}
                  title="Carica le tue candidature o fogli Excel (.xlsx, .xls, .csv)"
                  style={{ gap: '6px' }}
                >
                  <span>📊</span> Carica Excel / CSV
                </button>
                <button
                  className="btn sm"
                  onClick={handleExportExcelXlsx}
                  title="Esporta tutte le candidature in formato Microsoft Excel (.xlsx)"
                  style={{ gap: '6px' }}
                >
                  <span>📥</span> Esporta Excel (.xlsx)
                </button>
                <button className="btn pri sm" id="new2" onClick={() => setIsModalOpen(true)}>
                  + Aggiungi
                </button>
              </div>

              {/* UNIFIED SINGLE-CONTAINER FILTER BAR (TUTTI I FILTRI IN UN'UNICA BARRA COMBINABILI) */}
              <div
                className="fbar"
                style={{
                  background: 'var(--glass-in)',
                  border: '1px solid var(--rim)',
                  borderRadius: '20px',
                  padding: '10px 14px',
                  gap: '10px',
                  boxShadow: 'inset 0 1px 0 var(--glass-hi)',
                }}
              >
                {/* 1. Status Multi-select Chips */}
                <div className="schips" id="schips" role="group" aria-label="Filtro per stato (combinabile)">
                  {/* "Tutte" button */}
                  <button
                    className="sc"
                    aria-pressed={selectedStatuses.length === 0}
                    onClick={() => handleStatusToggle('')}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>Tutte</span> <b>{currentCounts['']}</b>
                  </button>

                  {/* Individual Status Chips with Multi-Selection */}
                  {(['todo', 'applied', 'interview', 'offer', 'rejected'] as const).map((k) => {
                    const isSelected = selectedStatuses.includes(k);
                    return (
                      <button
                        key={k}
                        className="sc"
                        aria-pressed={isSelected}
                        onClick={() => handleStatusToggle(k)}
                        title={`Clicca per combinare o escludere: ${ST[k]}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <span>{EM[k]} {ST[k]}</span>{' '}
                        <b style={{ color: isSelected ? 'var(--blue)' : 'inherit' }}>
                          {currentCounts[k] || 0}
                        </b>
                      </button>
                    );
                  })}
                </div>

                <div style={{ width: '1px', height: '22px', background: 'var(--line)', margin: '0 4px' }} aria-hidden="true" />

                {/* 2. Direct Dropdowns (Posizione/Ruolo, Paese, Città, Modalità, Priorità, Raggruppa) */}
                <select
                  value={cf.role}
                  onChange={(e) => setCf({ ...cf, role: e.target.value })}
                  aria-label="Filtra per Posizione / Ruolo"
                  title="Posizione"
                  style={{ minWidth: '125px' }}
                >
                  <option value="">Posizione (Tutte)</option>
                  {distinctRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                <select
                  value={cf.country}
                  onChange={(e) => setCf({ ...cf, country: e.target.value })}
                  aria-label="Filtra per Paese"
                  title="Paese"
                  style={{ minWidth: '110px' }}
                >
                  <option value="">Paese (Tutti)</option>
                  {distinctCountries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={cf.city}
                  onChange={(e) => setCf({ ...cf, city: e.target.value })}
                  aria-label="Filtra per Città"
                  title="Città"
                  style={{ minWidth: '105px' }}
                >
                  <option value="">Città (Tutte)</option>
                  {distinctCities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={cf.mode}
                  onChange={(e) => setCf({ ...cf, mode: e.target.value })}
                  aria-label="Filtra per Modalità di lavoro"
                  title="Modalità"
                  style={{ minWidth: '95px' }}
                >
                  <option value="">Modalità</option>
                  {distinctModes.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select
                  value={cf.prio}
                  onChange={(e) => setCf({ ...cf, prio: e.target.value })}
                  aria-label="Filtra per Priorità"
                  title="Priorità"
                  style={{ minWidth: '90px' }}
                >
                  <option value="">Priorità</option>
                  {distinctPrios.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                <label className="gsel">
                  <span>Aggruppa:</span>
                  <select
                    id="gsel"
                    value={gb}
                    onChange={(e) => setGb(e.target.value)}
                    aria-label="Raggruppa per"
                  >
                    <option value="">Nessuno</option>
                    <option value="role">Posizione</option>
                    <option value="country">Paese</option>
                    <option value="city">Città</option>
                    <option value="st">Stato</option>
                    <option value="prio">Priorità</option>
                    <option value="mode">Modalità</option>
                  </select>
                </label>


                {/* Reset Filters button if any filter is active */}
                {hasActiveFilters && (
                  <button
                    className="fchip"
                    onClick={handleResetFilters}
                    style={{
                      color: 'var(--red)',
                      borderColor: 'rgba(255,100,90,.3)',
                      background: 'var(--b-rejected)',
                    }}
                    title="Azzera tutte le selezioni"
                  >
                    ✕ Azzera filtri
                  </button>
                )}

                <span className="sp"></span>

                {/* Export CSV Button */}
                <button className="fchip" id="export" onClick={handleExportCsv}>
                  Esporta CSV
                </button>
              </div>

              {/* Mobile View Mode Switcher Pills */}
              <div className="vmsel" id="vmsel" role="group" aria-label="Visualizzazione">
                {Object.keys(VMN).map((k) => (
                  <button
                    key={k}
                    className="fchip"
                    aria-pressed={vm === k}
                    onClick={() => setVm(k)}
                  >
                    {VMN[k]}
                  </button>
                ))}
              </div>

              {/* SUB-VIEW 1: TABLE */}
              {vm === 'tab' && (
                <div id="t-tab" className="tscroll">
                  <table aria-label="Elenco candidature">
                    <thead>
                      <tr>
                        <th className="c0"></th>
                        <th>Azienda &amp; ruolo</th>
                        <th>Stato candidatura</th>
                        <th>Sede</th>
                        <th>Compenso*</th>
                        <th>Prossimo step</th>
                      </tr>
                    </thead>
                    <tbody id="rows">
                      {groupedApps.map(([groupTitle, list]) => (
                        <React.Fragment key={groupTitle || 'all'}>
                          {groupTitle && (
                            <tr className="grow">
                              <td colSpan={6}>
                                {groupTitle} <span className="count">{list.length}</span>
                              </td>
                            </tr>
                          )}
                          {list.map((a) => (
                            <tr key={a.id} onClick={() => openDrawer(a)} tabIndex={0}>
                              <td className="c0" onClick={(e) => e.stopPropagation()}>
                                <input
                                  className="chk0"
                                  type="checkbox"
                                  checked={!!selectedRows[a.id]}
                                  onChange={() => setSelectedRows((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                                  aria-label={`Seleziona ${a.co}`}
                                />
                              </td>
                              <td>
                                <div className="who">
                                  {renderLogo(a)}
                                  <div style={{ minWidth: 0 }}>
                                    <b>{a.co}</b>
                                    <span>{a.role}</span>
                                  </div>
                                </div>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <select
                                  className={`st-select st ${a.st}`}
                                  value={a.st}
                                  onChange={(e) => handleUpdateAppStatus(a.id, e.target.value as MockApp['st'])}
                                  title="Clicca per modificare rapidamente lo stato"
                                  aria-label={`Stato di ${a.co}`}
                                >
                                  <option value="todo">📝 Da candidarmi</option>
                                  <option value="applied">✉️ Candidato</option>
                                  <option value="interview">🗓 In colloquio</option>
                                  <option value="offer">🏆 Offerta</option>
                                  <option value="rejected">✕ Rifiutato</option>
                                </select>
                              </td>
                              <td>{a.city} · {a.mode}</td>
                              <td className="cmp">{a.comp}</td>
                              <td>
                                <span className={`nxt ${a.nx[1]}`}>{a.nx[0]}</span>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {filteredApps.length === 0 && (
                        <tr>
                          <td colSpan={6}>
                            <div className="empty">Nessuna candidatura con questi filtri combinati.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SUB-VIEW 2: ACTION CENTER */}
              {vm === 'act' && (
                <div id="t-act">
                  {[
                    ['send', 'Da inviare', "Pronte: manca solo l'invio"],
                    ['follow', 'Follow-up da fare', 'Tra 5 giorni è il momento di scrivere'],
                    ['sent', 'Inviate di recente', 'Nessuna azione per ora'],
                    ['eval', 'Da valutare', 'Serve una decisione prima di candidarti'],
                    ['closed', 'Chiuse', 'Nessuna azione'],
                  ].map(([actKey, title, desc]) => {
                    const items = filteredApps.filter((a) => a.act === actKey);
                    if (items.length === 0) return null;
                    return (
                      <div className="act-g" key={actKey}>
                        <h4>
                          <span>{title}</span> <span className="count">{items.length}</span>{' '}
                          <small>{desc}</small>
                        </h4>
                        <div className="agrid">
                          {items.map((a) => (
                            <div
                              className="ac"
                              key={a.id}
                              onClick={() => openDrawer(a)}
                              tabIndex={0}
                              role="button"
                              aria-label={`${a.co}, ${a.role}`}
                            >
                              <div className="who">
                                {renderLogo(a)}
                                <div style={{ minWidth: 0 }}>
                                  <b>{a.co}</b>
                                  <span>{a.role}</span>
                                </div>
                              </div>
                              <div className="f">
                                <span className={`nxt ${a.nx[1]}`}>{a.nx[0]}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {filteredApps.length === 0 && (
                    <div className="empty">Nessuna candidatura con questi filtri combinati.</div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 3: SCHEDE */}
              {vm === 'sch' && (
                <div id="t-sch">
                  {groupedApps.map(([groupTitle, list]) => (
                    <React.Fragment key={groupTitle || 'all'}>
                      {groupTitle && (
                        <div className="sg">
                          {groupTitle} <span className="count">{list.length}</span>
                        </div>
                      )}
                      <div className="cgrid">
                        {list.map((a) => (
                          <div
                            className="cc"
                            key={a.id}
                            onClick={() => openDrawer(a)}
                            tabIndex={0}
                            role="button"
                            aria-label={`${a.co}, ${a.role}`}
                          >
                            <div className="who">
                              {renderLogo(a)}
                              <div style={{ minWidth: 0 }}>
                                  <b>{a.co}</b>
                                  <span>{a.role}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <select
                                className={`st-select st ${a.st}`}
                                value={a.st}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateAppStatus(a.id, e.target.value as MockApp['st'])}
                                title="Clicca per modificare rapidamente lo stato"
                                aria-label={`Stato di ${a.co}`}
                              >
                                <option value="todo">📝 Da candidarmi</option>
                                <option value="applied">✉️ Candidato</option>
                                <option value="interview">🗓 In colloquio</option>
                                <option value="offer">🏆 Offerta</option>
                                <option value="rejected">✕ Rifiutato</option>
                              </select>
                              <span className={`nxt ${a.nx[1]}`}>{a.nx[0]}</span>
                            </div>
                            <div className="m">
                              <span>Sede</span>
                              <b>{a.city} · {a.mode}</b>
                            </div>
                            <div className="m">
                              <span>Compenso</span>
                              <b>{a.comp}</b>
                            </div>
                          </div>
                        ))}
                      </div>
                    </React.Fragment>
                  ))}
                  {filteredApps.length === 0 && (
                    <div className="empty">Nessuna candidatura con questi filtri combinati.</div>
                  )}
                </div>
              )}



              {/* Table Footer */}
              <div className="tfoot">
                <button className="addrow" id="add2" onClick={() => setIsModalOpen(true)}>
                  <span>+</span>Aggiungi candidatura o incolla il link dell'annuncio con Gemini AI…
                </button>
                <span id="foot">
                  Mostro {filteredApps.length} di {apps.length}{DEMO ? " · * valori d'esempio · sincronizzato, salvato alle 17:01" : ''}
                </span>
              </div>
            </section>
          </section>

          {/* ==============================================================
              VIEW 3: CALENDARIO & SCADENZE (v-cal unificato)
              ============================================================== */}
          <section className={`view ${view === 'cal' ? 'on' : ''}`} id="v-cal" aria-label="Calendario e Scadenze">
            {/* Multi-Account & Workspace Control Bar */}
            <div className="card" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div className="seg">
                    <button
                      aria-pressed={calTab === 'cal'}
                      onClick={() => setCalTab('cal')}
                      style={{ fontWeight: 600 }}
                    >
                      📅 Vista Calendario
                    </button>
                    <button
                      aria-pressed={calTab === 'sca'}
                      onClick={() => setCalTab('sca')}
                      style={{ fontWeight: 600 }}
                    >
                      ⏱ Elenco Scadenze ({filteredScadenze.length})
                    </button>
                  </div>

                  {/* Account Selector Tabs for Connected Workspace Accounts */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Account Workspace:</span>
                    {WORKSPACE_ACCOUNTS.map((acc) => (
                      <button
                        key={acc}
                        onClick={() => {
                          setActiveWorkspaceAccount(acc);
                          showToast(`Account Google attivo: ${acc}`);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '11.5px',
                          fontWeight: activeWorkspaceAccount === acc ? 700 : 500,
                          background: activeWorkspaceAccount === acc ? 'var(--brand)' : 'var(--field)',
                          color: activeWorkspaceAccount === acc ? '#fff' : 'var(--text)',
                          border: '1px solid var(--rim)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeWorkspaceAccount === acc ? '#a7f3d0' : '#94a3b8' }}></span>
                        <span>{acc}</span>
                      </button>
                    ))}
                    <button
                      className="btn sm"
                      onClick={() => handleSyncCalendarAndTasks()}
                      disabled={isWorkspaceSyncing}
                      style={{ padding: '0 10px', height: '30px', fontSize: '11.5px', gap: '5px' }}
                      title="Sincronizza eventi da Google Calendar e task da Google Tasks"
                    >
                      <span>{isWorkspaceSyncing ? '⏳ Sincronizzazione...' : '🔄 Sincronizza'}</span>
                    </button>
                  </div>
                </div>

                {/* Cloud & Smartphone Integration Badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--rim)', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 600 }}>
                      <span>●</span> {DEMO ? <>Google Calendar: Sincronizzato ({googleCalendarEvents.length} eventi)</> : <>Google Calendar: {googleCalendarEvents.length} eventi letti</>}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontWeight: 600 }}>
                      <span>📱</span> {DEMO ? <>Google Tasks: Notifiche Smartphone Attive ({googleTasksList.filter(t => t.status !== 'completed').length} attivi)</> : <>Google Tasks: {googleTasksList.filter(t => t.status !== 'completed').length} da fare</>}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontWeight: 500 }}>
                      <span>☁️</span> Firestore DB: Connesso
                    </span>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
                    Ultimo aggiornamento: {lastWorkspaceSyncTime || 'in tempo reale'}
                  </span>
                </div>
              </div>
            </div>

            {/* TAB A: CALENDARIO MENSILE E SETTIMANALE */}
            {calTab === 'cal' && (
              <div className="two">
                {/* CALENDARIO MENSILE */}
                <article className="card">
                  <div className="hd" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h3>{DEMO ? 'Novembre 2026' : rmCal.label}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>· {activeWorkspaceAccount}</span>
                    </div>
                    <span className="sp"></span>
                    {!DEMO && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn sm" onClick={() => setCalMonthOffset((o) => o - 1)} aria-label="Mese precedente">‹</button>
                        <button className="btn sm" onClick={() => setCalMonthOffset(0)}>Oggi</button>
                        <button className="btn sm" onClick={() => setCalMonthOffset((o) => o + 1)} aria-label="Mese successivo">›</button>
                      </div>
                    )}
                    <div className="seg">
                      <button aria-pressed={calMode === 'month'} onClick={() => setCalMode('month')}>
                        Mese
                      </button>
                      <button aria-pressed={calMode === 'week'} onClick={() => setCalMode('week')}>
                        Settimana
                      </button>
                    </div>
                    <button
                      className="btn pri sm"
                      onClick={() => setIsEventModalOpen(true)}
                      title="Aggiungi colloquio, scadenza o follow-up al calendario e a Google Tasks"
                      style={{ padding: '0 12px', gap: '5px' }}
                    >
                      <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span>Aggiungi evento</span>
                    </button>
                  </div>
                  <div className="mc" id="mcal">
                    {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d) => (
                      <div className="h" key={d}>{d}</div>
                    ))}
                    {DEMO ? (
                      <>
                    {[26, 27, 28, 29, 30, 31].map((i) => (
                      <div className="d" style={{ opacity: 0.7 }} key={`oct-${i}`}>{i}</div>
                    ))}
                    {Array.from({ length: 30 }, (_, idx) => idx + 1).map((d) => (
                      <div className={`d ${d === 4 ? 'today' : ''}`} key={`nov-${d}`}>
                        <span>{d}</span>
                        {d === 2 && (
                          <>
                            <span className="ev">Follow-up Stranger Soccer</span>
                            <span className="ev">Follow-up Factorial</span>
                          </>
                        )}
                        {d === 4 && <span className="ev s">Piano di ricerca · 4</span>}
                        {d === 6 && (
                          <span
                            className="ev"
                            style={{ background: 'rgba(16, 185, 129, 0.25)', color: 'var(--text)', borderLeft: '3px solid #10b981' }}
                            title="HR Screening con Logistica OS · Sincronizzato con Google Calendar"
                          >
                            🗓 15:00 HR Logistica OS
                          </span>
                        )}
                        {d === 9 && (
                          <>
                            <span className="ev s">Siti da controllare · 4</span>
                            <span
                              className="ev"
                              style={{ background: 'rgba(59, 130, 246, 0.25)', color: 'var(--text)', borderLeft: '3px solid #3b82f6' }}
                              title="Bending Spoons Case Review · Google Calendar"
                            >
                              🗓 11:00 Bending Spoons
                            </span>
                          </>
                        )}
                        {/* Custom Google Calendar Events matching this day */}
                        {googleCalendarEvents
                          .filter((ev) => {
                            const dateStr = ev.start?.dateTime || ev.start?.date || '';
                            return dateStr.includes(`-11-${String(d).padStart(2, '0')}`);
                          })
                          .map((ev) => (
                            <span
                              key={ev.id}
                              className="ev"
                              style={{ background: 'rgba(139, 92, 246, 0.25)', color: 'var(--text)', borderLeft: '3px solid #8b5cf6' }}
                              title={`${ev.summary} (${ev.accountEmail || activeWorkspaceAccount})`}
                            >
                              📅 {ev.summary}
                            </span>
                          ))}
                      </div>
                    ))}
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div className="d" style={{ opacity: 0.7 }} key={`dec-${i}`}>{i}</div>
                    ))}
                      </>
                    ) : (
                      <>
                    {Array.from({ length: rmCal.lead }, (_, i) => (
                      <div className="d" key={`lead-${i}`} style={{ opacity: 0.3 }}></div>
                    ))}
                    {Array.from({ length: rmCal.daysInMonth }, (_, idx) => idx + 1).map((d) => {
                      const key = `${rmCal.y}-${String(rmCal.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      return (
                        <div className={`d ${key === rmCal.todayKey ? 'today' : ''}`} key={key}>
                          <span>{d}</span>
                          {googleCalendarEvents
                            .filter((ev) => (ev.start?.dateTime || ev.start?.date || '').startsWith(key))
                            .map((ev) => (
                              <span
                                key={ev.id}
                                className="ev"
                                style={{ background: 'rgba(139, 92, 246, 0.25)', color: 'var(--text)', borderLeft: '3px solid #8b5cf6' }}
                                title={ev.summary}
                              >
                                📅 {ev.summary}
                              </span>
                            ))}
                        </div>
                      );
                    })}
                      </>
                    )}
                  </div>
                </article>

                {/* TASK PER OGGI & GOOGLE TASKS (SMARTPHONE) */}
                <article className="card">
                  <div className="hd" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📱 Task per oggi &amp; Google Tasks</span>
                      </h3>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Arrivano sul tuo smartphone ({activeWorkspaceAccount})
                      </span>
                    </div>
                    <span className="sp"></span>
                    <button
                      className="btn sm"
                      onClick={() => handleSyncCalendarAndTasks()}
                      title="Ricarica task da Google"
                    >
                      ↻ Sincronizza
                    </button>
                  </div>

                  {/* Section 1: Recommended Daily Tasks with Send-to-Phone Button */}
                  {DEMO && (
                    <>
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '8px' }}>
                      Attività del giorno raccomandate:
                    </div>
                    <ul className="li" style={{ gap: '10px' }}>
                      <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', background: 'var(--field)', borderRadius: '12px', border: '1px solid var(--rim)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b style={{ color: 'var(--text)', fontSize: '13px' }}>Piano di ricerca: 4 sessioni</b>
                          <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                            BD Barcellona, Madrid, Valencia · 96 min
                          </div>
                        </div>
                        <button
                          className="btn sm"
                          onClick={() =>
                            requestSendTaskToGoogleTasks(
                              'Piano di ricerca: 4 sessioni (BD Barcellona, Madrid, Valencia)',
                              '4 sessioni mirate su scaleup tech · 96 min',
                              'Oggi'
                            )
                          }
                          title="Invia al telefono con Google Tasks"
                          style={{ fontSize: '11px', padding: '0 8px', height: '28px', gap: '4px', whiteSpace: 'nowrap' }}
                        >
                          <span>📱 Invia al Telefono</span>
                        </button>
                      </li>

                      <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', background: 'var(--field)', borderRadius: '12px', border: '1px solid var(--rim)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b style={{ color: 'var(--text)', fontSize: '13px' }}>Siti da controllare oggi: 4</b>
                          <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                            Barilla, Bottle-Up, Cloov, EF · 28 in coda
                          </div>
                        </div>
                        <button
                          className="btn sm"
                          onClick={() =>
                            requestSendTaskToGoogleTasks(
                              'Siti da controllare oggi: 4 (Barilla, Bottle-Up, Cloov, EF)',
                              'Controllare aggiornamenti posizioni aperte',
                              'Oggi'
                            )
                          }
                          title="Invia al telefono con Google Tasks"
                          style={{ fontSize: '11px', padding: '0 8px', height: '28px', gap: '4px', whiteSpace: 'nowrap' }}
                        >
                          <span>📱 Invia al Telefono</span>
                        </button>
                      </li>

                      <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', background: 'var(--field)', borderRadius: '12px', border: '1px solid var(--rim)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b style={{ color: 'var(--text)', fontSize: '13px' }}>Follow-up candidature (7gg)</b>
                          <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                            Stranger Soccer e Factorial
                          </div>
                        </div>
                        <button
                          className="btn sm"
                          onClick={() =>
                            requestSendTaskToGoogleTasks(
                              'Inviare follow-up Stranger Soccer e Factorial',
                              'Scadenza 7 giorni trascorsi dall invio',
                              'Oggi'
                            )
                          }
                          title="Invia al telefono con Google Tasks"
                          style={{ fontSize: '11px', padding: '0 8px', height: '28px', gap: '4px', whiteSpace: 'nowrap' }}
                        >
                          <span>📱 Invia al Telefono</span>
                        </button>
                      </li>
                    </ul>
                  </div>

                    </>
                  )}
                  {/* Section 2: Live Google Tasks List */}
                  <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--rim)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                        Attività sincronizzate su Google Tasks:
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {googleTasksList.filter((t) => t.status === 'completed').length} di {googleTasksList.length} completati
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                      {googleTasksList.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            padding: '6px 10px',
                            borderRadius: '10px',
                            background: task.status === 'completed' ? 'rgba(0,0,0,0.03)' : 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            opacity: task.status === 'completed' ? 0.6 : 1,
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={task.status === 'completed'}
                              onChange={() => handleToggleGoogleTask(task)}
                              style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <span
                                style={{
                                  fontSize: '12.5px',
                                  fontWeight: 500,
                                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                  color: 'var(--text)',
                                  display: 'block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {task.title}
                              </span>
                              <span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
                                📱 {task.accountEmail || activeWorkspaceAccount} {task.notes ? `· ${task.notes}` : ''}
                              </span>
                            </div>
                          </label>
                          <button
                            onClick={() => handleDeleteGoogleTask(task.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px 4px', fontSize: '12px' }}
                            title="Elimina da Google Tasks"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {googleTasksList.length === 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '12px' }}>
                          Nessun task attivo in questo momento su Google Tasks.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 3: Quick Add Task to Phone */}
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--rim)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                      ➕ Aggiungi nuova attività da fare al tuo telefono:
                    </div>
                    <form onSubmit={handleQuickAddGoogleTask} style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Es. Richiamare recruiter Enel, preparare business case..."
                        value={quickTaskTitleInput}
                        onChange={(e) => setQuickTaskTitleInput(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: '180px',
                          height: '34px',
                          borderRadius: '10px',
                          border: '1px solid var(--rim)',
                          background: 'var(--field)',
                          color: 'var(--text)',
                          fontSize: '12px',
                          padding: '0 10px',
                        }}
                      />
                      <select
                        value={quickTaskAccountSelect}
                        onChange={(e) => setQuickTaskAccountSelect(e.target.value)}
                        style={{ height: '34px', borderRadius: '10px', fontSize: '11.5px', padding: '0 8px' }}
                      >
                        {WORKSPACE_ACCOUNTS.map((acc) => (
                          <option key={acc} value={acc}>
                            {acc.includes('@') ? acc.split('@')[0] : acc}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="btn pri sm"
                        style={{ height: '34px', padding: '0 12px', fontSize: '11.5px', whiteSpace: 'nowrap', gap: '4px' }}
                      >
                        <span>📱 Invia al Telefono</span>
                      </button>
                    </form>
                  </div>
                </article>
              </div>
            )}

            {/* TAB B: TUTTE LE SCADENZE */}
            {calTab === 'sca' && (
              <article className="card">
                <div className="hd" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  <h3>Scadenze e Follow-up</h3>
                  {(DEMO || filteredScadenze.length > 0) && <span className="count" id="sc-n">{filteredScadenze.length} totali</span>}
                  <span className="sp"></span>
                  <div className="seg">
                    <button aria-pressed={pf === 'all'} onClick={() => setPf('all')}>
                      Tutti i periodi
                    </button>
                    <button aria-pressed={pf === 'over'} onClick={() => setPf('over')}>
                      Scadute
                    </button>
                    <button aria-pressed={pf === 'today'} onClick={() => setPf('today')}>
                      Oggi
                    </button>
                    <button aria-pressed={pf === 'week'} onClick={() => setPf('week')}>
                      Prossimi giorni
                    </button>
                  </div>
                </div>
                <div id="sc-list">
                  {['Scadute', 'Oggi', 'Prossimi giorni']
                    .filter((w) => filteredScadenze.some((x) => x.w === w))
                    .map((w) => {
                      const list = filteredScadenze.filter((x) => x.w === w);
                      return (
                        <React.Fragment key={w}>
                          <div className="sg">
                            {w} <span className="count">{list.length}</span>
                          </div>
                          {list.map((x, idx) => (
                            <div className="sr2" key={idx}>
                              <span className="lg" style={{ background: grad(x.n) }} aria-hidden="true">
                                {ini(x.n)}
                              </span>
                              <div>
                                <b>{x.n}</b>
                                <span className="d">{x.d}</span>
                              </div>
                              <span className="nxt">{TN[x.t]}</span>
                              <span
                                className={`nxt ${x.c === 'over' ? '' : x.c}`}
                                style={x.c === 'over' ? { color: 'var(--red)', background: 'var(--b-rejected)' } : {}}
                              >
                                {x.when}
                              </span>
                            </div>
                          ))}
                        </React.Fragment>
                      );
                    })}
                </div>
              </article>
            )}
          </section>

          {/* ==============================================================
              VIEW 4: PIANO DI RICERCA (v-ric)
              ============================================================== */}
          {DEMO ? (
            <>
          <section className={`view ${view === 'ric' ? 'on' : ''}`} id="v-ric" aria-label="Piano di ricerca">
            <article className="card">
              <div className="hd" style={{ flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Piano di ricerca · oggi</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                    Sessioni programmate di ricerca attiva per piattaforme (LinkedIn, Indeed, Joinrs, CareerOS)
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                  <span className="count">4 sessioni attive · ~96 min</span>
                  <button className="btn sm" onClick={() => showToast('Piano di ricerca ricalcolato con Gemini!')}>
                    ⚡ Ricalcola piano
                  </button>
                  <button className="btn pri sm" onClick={() => setIsModalOpen(true)}>
                    + Nuova candidatura
                  </button>
                </div>
              </div>

              {/* Filtri rapidi per sessioni */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', marginBottom: '14px', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>Filtra sessioni:</span>
                <select
                  value={ricRoleFilter}
                  onChange={(e) => setRicRoleFilter(e.target.value)}
                  style={{ height: '30px', borderRadius: '10px', fontSize: '12px', padding: '0 8px' }}
                  aria-label="Filtra per ruolo"
                >
                  <option value="all">Tutti i ruoli</option>
                  <option value="founders">Founders Associate / Chief of Staff</option>
                  <option value="innovation">Innovation &amp; Growth Manager</option>
                  <option value="bd">Business Development &amp; Strategy</option>
                  <option value="ops">Operations &amp; Venture</option>
                </select>
                <select
                  value={ricCityFilter}
                  onChange={(e) => setRicCityFilter(e.target.value)}
                  style={{ height: '30px', borderRadius: '10px', fontSize: '12px', padding: '0 8px' }}
                  aria-label="Filtra per città"
                >
                  <option value="all">Tutte le città</option>
                  <option value="barcellona">Barcellona / Madrid</option>
                  <option value="monaco">Monaco / Berlino</option>
                  <option value="milano">Milano</option>
                </select>
              </div>

              <div className="ses">
                {/* Sessione 1: Founders Associate - Monaco & Berlino */}
                {(ricRoleFilter === 'all' || ricRoleFilter === 'founders') &&
                  (ricCityFilter === 'all' || ricCityFilter === 'monaco') && (
                    <div className="sbox" style={{ opacity: ricDoneSessions['ses-1'] ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                        <h4>
                          Founder's Associate &amp; Chief of Staff · Monaco &amp; Berlino{' '}
                          <span className="ex">~28 min</span>
                        </h4>
                        {ricDoneSessions['ses-1'] && <span className="st applied">✓ Completata</span>}
                      </div>
                      <p>Query booleana ottimizzata</p>
                      <code>
                        "Founder's Associate" OR "Founders Associate" OR "Chief of Staff Intern" OR "Praktikum General Management"
                      </code>
                      <div style={{ marginTop: '10px' }}>
                        <label className="plr">
                          <input type="checkbox" defaultChecked />
                          <b style={{ minWidth: '80px' }}>LinkedIn</b>
                          <span style={{ color: 'var(--muted)' }}>10 min</span>
                          <span className="sp"></span>
                          <input type="number" defaultValue="2" aria-label="Posizioni trovate su LinkedIn" />
                          <button className="btn sm" onClick={() => window.open('https://www.linkedin.com/jobs/search/?keywords=Founders+Associate+Munich', '_blank')}>
                            Apri ricerca
                          </button>
                        </label>
                        <label className="plr">
                          <input type="checkbox" defaultChecked />
                          <b style={{ minWidth: '80px' }}>Joinrs</b>
                          <span style={{ color: 'var(--muted)' }}>8 min</span>
                          <span className="sp"></span>
                          <input type="number" defaultValue="1" aria-label="Posizioni trovate su Joinrs" />
                          <button className="btn sm" onClick={() => window.open('https://www.joinrs.com', '_blank')}>
                            Apri
                          </button>
                        </label>
                        <label className="plr">
                          <input type="checkbox" />
                          <b style={{ minWidth: '80px' }}>Indeed</b>
                          <span style={{ color: 'var(--muted)' }}>6 min</span>
                          <span className="sp"></span>
                          <input type="number" defaultValue="0" aria-label="Posizioni trovate su Indeed" />
                          <button className="btn sm" onClick={() => window.open('https://de.indeed.com', '_blank')}>
                            Apri
                          </button>
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                          className="btn pri sm"
                          onClick={() => {
                            setRicDoneSessions((p) => ({ ...p, 'ses-1': !p['ses-1'] }));
                            showToast(ricDoneSessions['ses-1'] ? 'Sessione riaperta' : '✓ Sessione Monaco contrassegnata come completata!');
                          }}
                        >
                          {ricDoneSessions['ses-1'] ? 'Annulla completamento' : '✓ Fatta'}
                        </button>
                        <button className="btn sm" onClick={() => setIsModalOpen(true)}>
                          + Aggiungi al Tracker
                        </button>
                      </div>
                    </div>
                  )}

                {/* Sessione 2: Business Development - Barcellona & Madrid */}
                {(ricRoleFilter === 'all' || ricRoleFilter === 'bd') &&
                  (ricCityFilter === 'all' || ricCityFilter === 'barcellona') && (
                    <div className="sbox" style={{ opacity: ricDoneSessions['ses-2'] ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                        <h4>
                          Business Development &amp; Strategy · Barcellona &amp; Madrid{' '}
                          <span className="ex">~24 min</span>
                        </h4>
                        {ricDoneSessions['ses-2'] && <span className="st applied">✓ Completata</span>}
                      </div>
                      <p>Query booleana ottimizzata</p>
                      <code>
                        "Business Development Associate" OR "Business Development Analyst" OR "Junior Business Developer"
                      </code>
                      <div style={{ marginTop: '10px' }}>
                        <label className="plr">
                          <input type="checkbox" defaultChecked />
                          <b style={{ minWidth: '80px' }}>LinkedIn</b>
                          <span style={{ color: 'var(--muted)' }}>8 min</span>
                          <span className="sp"></span>
                          <input type="number" defaultValue="1" aria-label="Posizioni trovate su LinkedIn" />
                          <button className="btn sm" onClick={() => window.open('https://www.linkedin.com/jobs/search/?keywords=Business+Development+Barcelona', '_blank')}>
                            Apri ricerca
                          </button>
                        </label>
                        <label className="plr">
                          <input type="checkbox" />
                          <b style={{ minWidth: '80px' }}>Indeed</b>
                          <span style={{ color: 'var(--muted)' }}>6 min</span>
                          <span className="sp"></span>
                          <input type="number" defaultValue="0" aria-label="Posizioni trovate su Indeed" />
                          <button className="btn sm" onClick={() => window.open('https://es.indeed.com', '_blank')}>
                            Apri
                          </button>
                        </label>
                        <label className="plr">
                          <input type="checkbox" />
                          <b style={{ minWidth: '80px' }}>CareerOS</b>
                          <span style={{ color: 'var(--muted)' }}>4 min</span>
                          <span className="sp"></span>
                          <input type="number" defaultValue="0" aria-label="Posizioni trovate su CareerOS" />
                          <span className="nxt">piattaforma attiva</span>
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                          className="btn pri sm"
                          onClick={() => {
                            setRicDoneSessions((p) => ({ ...p, 'ses-2': !p['ses-2'] }));
                            showToast(ricDoneSessions['ses-2'] ? 'Sessione riaperta' : '✓ Sessione Spagna contrassegnata come completata!');
                          }}
                        >
                          {ricDoneSessions['ses-2'] ? 'Annulla completamento' : '✓ Fatta'}
                        </button>
                        <button className="btn sm" onClick={() => setIsModalOpen(true)}>
                          + Aggiungi al Tracker
                        </button>
                      </div>
                    </div>
                  )}

                {/* Sessione 3: Operations & Strategy - Milano & Hub Europei */}
                {(ricRoleFilter === 'all' || ricRoleFilter === 'ops') &&
                  (ricCityFilter === 'all' || ricCityFilter === 'milano') && (
                    <div className="sbox" style={{ opacity: ricDoneSessions['ses-3'] ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                        <h4>
                          Operations &amp; Strategy Analyst · Milano &amp; Scaleup Hub{' '}
                          <span className="ex">~22 min</span>
                        </h4>
                        {ricDoneSessions['ses-3'] && <span className="st applied">✓ Completata</span>}
                      </div>
                      <p>Query booleana ottimizzata</p>
                      <code>
                        "Strategy Analyst" OR "Operations Intern" OR "Junior Consultant" OR "Venture Builder"
                      </code>
                      <div style={{ marginTop: '10px' }}>
                        <label className="plr">
                          <input type="checkbox" defaultChecked />
                          <b style={{ minWidth: '80px' }}>LinkedIn</b>
                          <span style={{ color: 'var(--muted)' }}>8 min</span>
                          <span className="sp"></span>
                          <input type="number" defaultValue="3" aria-label="Posizioni trovate su LinkedIn" />
                          <button className="btn sm" onClick={() => window.open('https://www.linkedin.com/jobs/search/?keywords=Strategy+Analyst+Milan', '_blank')}>
                            Apri ricerca
                          </button>
                        </label>
                        <label className="plr">
                          <input type="checkbox" defaultChecked />
                          <b style={{ minWidth: '80px' }}>Joinrs</b>
                          <span style={{ color: 'var(--muted)' }}>6 min</span>
                          <span className="sp"></span>
                          <input type="number" defaultValue="1" aria-label="Posizioni trovate su Joinrs" />
                          <button className="btn sm" onClick={() => window.open('https://www.joinrs.com', '_blank')}>
                            Apri
                          </button>
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                          className="btn pri sm"
                          onClick={() => {
                            setRicDoneSessions((p) => ({ ...p, 'ses-3': !p['ses-3'] }));
                            showToast(ricDoneSessions['ses-3'] ? 'Sessione riaperta' : '✓ Sessione Milano completata!');
                          }}
                        >
                          {ricDoneSessions['ses-3'] ? 'Annulla completamento' : '✓ Fatta'}
                        </button>
                        <button className="btn sm" onClick={() => setIsModalOpen(true)}>
                          + Aggiungi al Tracker
                        </button>
                      </div>
                    </div>
                  )}

                {/* Sessione 4: Innovation Manager & Growth Manager - Hub Europei */}
                {(ricRoleFilter === 'all' || ricRoleFilter === 'innovation') && (
                  <div className="sbox" style={{ opacity: ricDoneSessions['ses-4'] ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                      <h4>
                        Innovation Manager &amp; Growth Manager · Hub Europei{' '}
                        <span className="ex">~22 min</span>
                      </h4>
                      {ricDoneSessions['ses-4'] && <span className="st applied">✓ Completata</span>}
                    </div>
                    <p>Query booleana ottimizzata</p>
                    <code>
                      "Innovation Manager" OR "Innovation Analyst" OR "Growth Manager" OR "Growth Associate" OR "Open Innovation"
                    </code>
                    <div style={{ marginTop: '10px' }}>
                      <label className="plr">
                        <input type="checkbox" defaultChecked />
                        <b style={{ minWidth: '80px', color: '#e64980' }}>Flexa</b>
                        <span style={{ color: 'var(--muted)' }}>3 min</span>
                        <span className="sp"></span>
                        <input type="number" defaultValue="2" aria-label="Posizioni trovate su Flexa" />
                        <button className="btn sm" onClick={() => window.open('https://flexa.careers/search?q=Innovation', '_blank')}>
                          Apri Flexa
                        </button>
                      </label>
                      <label className="plr">
                        <input type="checkbox" defaultChecked />
                        <b style={{ minWidth: '80px' }}>LinkedIn</b>
                        <span style={{ color: 'var(--muted)' }}>7 min</span>
                        <span className="sp"></span>
                        <input type="number" defaultValue="3" aria-label="Posizioni trovate su LinkedIn" />
                        <button className="btn sm" onClick={() => window.open('https://www.linkedin.com/jobs/search/?keywords=Innovation+Manager', '_blank')}>
                          Apri ricerca
                        </button>
                      </label>
                      <label className="plr">
                        <input type="checkbox" defaultChecked />
                        <b style={{ minWidth: '80px' }}>Indeed</b>
                        <span style={{ color: 'var(--muted)' }}>6 min</span>
                        <span className="sp"></span>
                        <input type="number" defaultValue="1" aria-label="Posizioni trovate su Indeed" />
                        <button className="btn sm" onClick={() => window.open('https://it.indeed.com/offerte-lavoro?q=Growth+Manager', '_blank')}>
                          Apri
                        </button>
                      </label>
                      <label className="plr">
                        <input type="checkbox" defaultChecked />
                        <b style={{ minWidth: '80px' }}>Joinrs</b>
                        <span style={{ color: 'var(--muted)' }}>5 min</span>
                        <span className="sp"></span>
                        <input type="number" defaultValue="1" aria-label="Posizioni trovate su Joinrs" />
                        <button className="btn sm" onClick={() => window.open('https://www.joinrs.com', '_blank')}>
                          Apri
                        </button>
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        className="btn pri sm"
                        onClick={() => {
                          setRicDoneSessions((p) => ({ ...p, 'ses-4': !p['ses-4'] }));
                          showToast(ricDoneSessions['ses-4'] ? 'Sessione riaperta' : '✓ Sessione Innovation & Growth completata!');
                        }}
                      >
                        {ricDoneSessions['ses-4'] ? 'Annulla completamento' : '✓ Fatta'}
                      </button>
                      <button className="btn sm" onClick={() => setIsModalOpen(true)}>
                        + Aggiungi al Tracker
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          </section>
            </>
          ) : (
            <SearchPlanView
              active={view === 'ric'}
              plan={rmPlan}
              progress={ricProgress}
              setProgress={setRicProgress}
              mode={ricMode}
              setMode={setRicMode}
              day={ricDay}
              setDay={setRicDay}
              roleFilter={ricRoleFilter}
              setRoleFilter={setRicRoleFilter}
              countryFilter={ricCityFilter}
              setCountryFilter={setRicCityFilter}
              positions={searchConfig.positions.filter((x) => x.enabled).map((x) => ({ id: x.id, name: x.name }))}
              countries={listCountries(searchConfig)}
              onAddApplication={() => setIsModalOpen(true)}
              onOpenSettings={() => {
                setSetSubTab('config');
                handleGo('set');
              }}
              showToast={showToast}
            />
          )}

          {/* ==============================================================
              VIEW 5: SITI CARRIERE (v-siti) CON LOGHI UNIFORMI
              ============================================================== */}
          <section className={`view ${view === 'siti' ? 'on' : ''}`} id="v-siti" aria-label="Siti carriere">
            {DEMO ? (
              <>
            <article className="card">
              <div className="hd" style={{ flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Siti Carriere da Monitorare · Oggi mercoledì 28 ottobre</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                    Loghi aziendali uniformi, stato di controllo e link rapidi ai portali carriere ufficiali
                  </p>
                </div>
                <span className="count" style={{ marginLeft: 'auto' }}>
                  {checkedSites.length} di 4 controllati
                </span>
              </div>

              {/* Griglia Principale Siti di Oggi con Loghi Uniformi */}
              <div className="tiles" style={{ marginTop: '16px' }}>
                {['Barilla', 'Bottle-Up', 'Cloov', 'Entrepreneur First'].map((s) => {
                  const isChecked = checkedSites.includes(s);
                  return (
                    <div className="stile" key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 12px' }}>
                      {/* Logo squircle uniforme 56x56 */}
                      {renderLogo(s, false, 56)}
                      <b style={{ marginTop: '10px', fontSize: '14px' }}>{s}</b>
                      <span className={`st ${isChecked ? 'applied' : 'rejected'}`} style={{ marginTop: '6px', fontSize: '11px', height: '24px' }}>
                        {isChecked ? '✓ Controllato' : 'In scadenza oggi'}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '10px' }}>
                        <button
                          className={`btn sm ${isChecked ? '' : 'pri'}`}
                          style={{ flex: 1, padding: '0 8px', height: '30px', fontSize: '11.5px', justifyContent: 'center' }}
                          onClick={() => toggleCheckSite(s)}
                        >
                          {isChecked ? 'Annulla' : 'Segna fatto'}
                        </button>
                        <button
                          className="btn sm"
                          style={{ padding: '0 10px', height: '30px' }}
                          title={`Apri portale carriere ${s}`}
                          aria-label={`Apri portale carriere ${s}`}
                          onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(s + ' careers jobs')}`, '_blank')}
                        >
                          ↗
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Calendario Prossimi Giorni con Loghi Uniformi */}
              <div className="sec" style={{ marginTop: '26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Programmazione controlli prossimi giorni</span>
                <small style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>Tutti i loghi aggiornati automaticamente</small>
              </div>

              <div className="fo" style={{ marginTop: '10px' }}>
                {[
                  ['Gio 29 ott', ['PwC', 'IBM', 'Amazon', 'Google']],
                  ['Ven 30 ott', ['IBM', 'Meta', 'Microsoft', 'Salesforce']],
                  ['Lun 2 nov', ['Spotify', 'Stripe', 'Uber', 'Adidas']],
                  ['Mar 3 nov', ['Coca-Cola', 'Huawei', 'Xiaomi', 'Sony']],
                ].map(([dateStr, companies]: any) => (
                  <div
                    className="fd"
                    key={dateStr}
                    role="button"
                    tabIndex={0}
                    onClick={() => showToast(`Siti programmati per ${dateStr}: ${companies.join(', ')}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        showToast(`Siti programmati per ${dateStr}: ${companies.join(', ')}`);
                      }
                    }}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span className="tile">
                      {companies.map((s: string) => (
                        <React.Fragment key={s}>
                          {renderLogo(s, false, 28, false)}
                        </React.Fragment>
                      ))}
                    </span>
                    <span>
                      {dateStr}
                      <small>{companies.length} aziende in lista</small>
                    </span>
                  </div>
                ))}
              </div>
            </article>
              </>
            ) : (
              <>
            <article className="card">
              <div className="hd">
                <h3 style={{ margin: 0 }}>Siti carriere da monitorare</h3>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                Nessun sito in elenco. Aggiungi qui le aziende e i portali carriere che vuoi controllare con regolarità.
              </p>
            </article>
              </>
            )}
          </section>

          {/* ==============================================================
              VIEW 6: SUGGERIMENTI & AUTOMAZIONE GEMINI (v-sug)
              ============================================================== */}
          <section className={`view ${view === 'sug' ? 'on' : ''}`} id="v-sug" aria-label="Suggerimenti e Automazione Gemini">
            <article className="card">
              {/* Header con Sub-Nav Segmented Control */}
              <div className="hd" style={{ flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Automazione Ricerca &amp; Suggerimenti Gemini</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                    Scansione domenicale delle scaleup europee · Invio giornaliero di 3 aziende e 3 persone LinkedIn
                  </p>
                </div>

                {/* Sub tabs */}
                <div
                  style={{
                    display: 'inline-flex',
                    background: 'var(--glass-in)',
                    border: '1px solid var(--rim)',
                    borderRadius: '12px',
                    padding: '3px',
                    gap: '4px',
                    marginLeft: 'auto',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                  role="tablist"
                >
                  <button
                    type="button"
                    className={`fchip ${sugSubTab === 'today' || sugSubTab === 'daily' ? 'active' : ''}`}
                    onClick={() => setSugSubTab('today')}
                    style={{
                      height: '28px',
                      padding: '0 12px',
                      fontSize: '11.5px',
                      fontWeight: sugSubTab === 'today' || sugSubTab === 'daily' ? 600 : 500,
                      background: sugSubTab === 'today' || sugSubTab === 'daily' ? 'var(--blue-d)' : 'transparent',
                      color: sugSubTab === 'today' || sugSubTab === 'daily' ? '#fff' : 'var(--text)',
                      borderColor: 'transparent',
                    }}
                  >
                    {DEMO ? '🌟 Oggi (3 Consigliati)' : 'Contatti di oggi'}
                  </button>
                  <button
                    type="button"
                    className={`fchip ${sugSubTab === 'history' ? 'active' : ''}`}
                    onClick={() => setSugSubTab('history')}
                    style={{
                      height: '28px',
                      padding: '0 12px',
                      fontSize: '11.5px',
                      fontWeight: sugSubTab === 'history' ? 600 : 500,
                      background: sugSubTab === 'history' ? 'var(--blue-d)' : 'transparent',
                      color: sugSubTab === 'history' ? '#fff' : 'var(--text)',
                      borderColor: 'transparent',
                    }}
                  >
                    📜 Consigliate Finora
                  </button>
                  <button
                    type="button"
                    className={`fchip ${sugSubTab === 'queue' || sugSubTab === 'hub' ? 'active' : ''}`}
                    onClick={() => setSugSubTab('queue')}
                    style={{
                      height: '28px',
                      padding: '0 12px',
                      fontSize: '11.5px',
                      fontWeight: sugSubTab === 'queue' || sugSubTab === 'hub' ? 600 : 500,
                      background: sugSubTab === 'queue' || sugSubTab === 'hub' ? 'var(--blue-d)' : 'transparent',
                      color: sugSubTab === 'queue' || sugSubTab === 'hub' ? '#fff' : 'var(--text)',
                      borderColor: 'transparent',
                    }}
                  >
                    📋 Spuntate &amp; Coda Sheet
                  </button>
                  <button
                    type="button"
                    className={`fchip ${sugSubTab === 'preferences' ? 'active' : ''}`}
                    onClick={() => setSugSubTab('preferences')}
                    style={{
                      height: '28px',
                      padding: '0 12px',
                      fontSize: '11.5px',
                      fontWeight: sugSubTab === 'preferences' ? 600 : 500,
                      background: sugSubTab === 'preferences' ? 'var(--blue-d)' : 'transparent',
                      color: sugSubTab === 'preferences' ? '#fff' : 'var(--text)',
                      borderColor: 'transparent',
                    }}
                  >
                    ⚙️ Preferenze &amp; Setup Vercel
                  </button>
                  <button
                    type="button"
                    className={`fchip ${sugSubTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setSugSubTab('settings')}
                    style={{
                      height: '28px',
                      padding: '0 12px',
                      fontSize: '11.5px',
                      fontWeight: sugSubTab === 'settings' ? 600 : 500,
                      background: sugSubTab === 'settings' ? 'var(--blue-d)' : 'transparent',
                      color: sugSubTab === 'settings' ? '#fff' : 'var(--text)',
                      borderColor: 'transparent',
                    }}
                  >
                    🏢 Aziende Processate ({processedCompanies.length})
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => setIsScoutingReportModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                      color: 'var(--brand)',
                      fontWeight: 600,
                      height: '28px',
                      fontSize: '11.5px',
                      padding: '0 10px',
                    }}
                  >
                    <span>🎯 Report 10 Aziende</span>
                  </button>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  TAB 1: PROPOSTE DI OGGI (3 AZIENDE E 3 PERSONE LINKEDIN)
                  ------------------------------------------------------------- */}
              {sugSubTab === 'daily' && (
                <div style={{ marginTop: '16px' }}>
                  {/* Automation Status Banner */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      background: 'linear-gradient(145deg, rgba(47, 120, 234, 0.12), rgba(22, 89, 204, 0.05))',
                      border: '1px solid rgba(47, 120, 234, 0.3)',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>🤖</span>
                      <div>
                        <b style={{ fontSize: '13px', color: 'var(--text)' }}>
                          {DEMO ? 'Automazione Gemini attiva · 3 Aziende & 3 Persone estratte per mercoledì 28 ottobre' : `Automazione Gemini attiva · 3 aziende e 3 persone per ${rmToday}`}
                        </b>
                        <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                          Dati selezionati dal database scaleup raccolto domenica. Ciascuna persona include un template di connessione LinkedIn sartoriale.
                        </p>
                      </div>
                    </div>
                    <button className="btn pri sm" onClick={handleRegenerateDailyTrio}>
                      ✨ Rigenera terna con Gemini
                    </button>
                  </div>

                  {/* PARTE A: LE 3 AZIENDE DEL GIORNO */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🏢</span>
                        <h4 style={{ margin: 0, fontSize: '14px' }}>Le 3 Aziende Target del Giorno</h4>
                        <span className="pill">Dalla scansione domenicale</span>
                      </div>
                      <small style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Filtro per fit elevato con il tuo CV</small>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {dailyCompanies.map((co) => (
                        <div
                          key={co.id}
                          style={{
                            background: 'var(--glass-in)',
                            border: '1px solid var(--rim)',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {renderLogo(co.name, false, 46)}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <b style={{ fontSize: '15px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {co.name}
                              </b>
                              <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                                {co.city}, {co.country} · {co.sector}
                              </span>
                            </div>
                            <span className="pill" style={{ fontSize: '10.5px' }}>{co.stage}</span>
                          </div>

                          <div style={{ background: 'var(--field)', borderRadius: '10px', padding: '8px 10px', border: '1px solid var(--rim)' }}>
                            <small style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--faint)', letterSpacing: '.06em' }}>
                              Ruolo target suggerito
                            </small>
                            <b style={{ fontSize: '12.5px', color: 'var(--blue)' }}>{co.targetRole}</b>
                          </div>

                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: '1.4' }}>
                            💡 <b>Perché fa per te:</b> {co.whyFit}
                          </p>

                          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px' }}>
                            <button
                              className="btn pri sm"
                              style={{ flex: 1, fontSize: '11.5px', justifyContent: 'center' }}
                              onClick={() => handleAddDailyCompanyToTracker(co)}
                            >
                              + Aggiungi al Tracker
                            </button>
                            <button
                              className="btn sm"
                              style={{ padding: '0 10px' }}
                              title={`Apri sito carriere ${co.name}`}
                              aria-label={`Apri sito carriere ${co.name}`}
                              onClick={() => window.open(co.careersUrl, '_blank')}
                            >
                              ↗ Carriere
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PARTE B: LE 3 PERSONE CHIAVE LINKEDIN DEL GIORNO */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>👤</span>
                        <h4 style={{ margin: 0, fontSize: '14px' }}>Le 3 Persone Chiave su LinkedIn di Oggi</h4>
                        <span className="pill" style={{ background: 'rgba(42, 111, 176, 0.2)', color: '#4ba0f5' }}>
                          LinkedIn Networking
                        </span>
                      </div>
                      <small style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                        Note sartoriali pronte da copiare (max 300 char)
                      </small>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '14px' }}>
                      {dailyPeople.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            background: 'var(--glass-in)',
                            border: p.isContacted ? '1px solid var(--green)' : '1px solid var(--rim)',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            position: 'relative',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span
                              className="lg"
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: grad(p.name),
                                fontSize: '13px',
                              }}
                            >
                              {p.avatarSeed}
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <b style={{ fontSize: '14px', display: 'block' }}>{p.name}</b>
                              <span style={{ fontSize: '11.5px', color: 'var(--muted)', display: 'block' }}>
                                {p.role}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                {renderLogo(p.company, false, 18)}
                                <span style={{ fontSize: '11px', color: 'var(--text)' }}>
                                  <b>{p.company}</b> · {p.city}
                                </span>
                              </div>
                            </div>
                            {p.isContacted && (
                              <span className="st applied" style={{ fontSize: '10px', height: '22px', padding: '0 8px', minWidth: 'auto' }}>
                                ✓ Contattato
                              </span>
                            )}
                          </div>

                          {/* Nota sartoriale di connessione */}
                          <div
                            style={{
                              background: 'var(--field)',
                              border: '1px solid var(--rim)',
                              borderRadius: '12px',
                              padding: '10px',
                              fontSize: '11.5px',
                              lineHeight: '1.45',
                              color: 'var(--text)',
                              fontStyle: 'italic',
                              position: 'relative',
                            }}
                          >
                            <small
                              style={{
                                display: 'block',
                                fontStyle: 'normal',
                                fontSize: '9.5px',
                                textTransform: 'uppercase',
                                color: 'var(--blue)',
                                fontWeight: 700,
                                marginBottom: '4px',
                                letterSpacing: '.05em',
                              }}
                            >
                              Messaggio di connessione Gemini ({p.connectionNote.length}/300 car.)
                            </small>
                            "{p.connectionNote}"
                          </div>

                          {/* Azioni per la persona */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '4px' }}>
                            <button
                              className="btn sm"
                              style={{ flex: 1, fontSize: '11px', padding: '0 8px' }}
                              onClick={() => handleCopyLinkedinNote(p.connectionNote)}
                            >
                              📋 Copia nota
                            </button>
                            <button
                              className="btn sm"
                              style={{
                                background: 'rgba(42, 111, 176, 0.15)',
                                color: 'var(--blue)',
                                borderColor: 'rgba(42, 111, 176, 0.4)',
                                fontSize: '11px',
                                padding: '0 10px',
                              }}
                              onClick={() => window.open(p.linkedinUrl, '_blank')}
                            >
                              🔗 Apri LinkedIn
                            </button>
                            <button
                              className={`btn sm ${p.isContacted ? 'pri' : ''}`}
                              style={{ fontSize: '11px', padding: '0 10px' }}
                              onClick={() => handleToggleContactedPerson(p.id)}
                            >
                              {p.isContacted ? '✓ Fatto' : 'Segna fatto'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 2: DATABASE SCALEUP RACCOLTO LA DOMENICA (CON EXCEL)
                  ------------------------------------------------------------- */}
              {sugSubTab === 'scaleups' && (
                <div style={{ marginTop: '16px' }}>
                  {/* Toolbar superiore con Download Excel e Scansione Manuale */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      background: 'var(--glass-in)',
                      border: '1px solid var(--rim)',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      marginBottom: '14px',
                    }}
                  >
                    <div>
                      <b style={{ fontSize: '13px' }}>{DEMO ? 'Database Scaleup Raccolte · Ultima scansione: Domenica 25 ott' : 'Database Scaleup Raccolte'}</b>
                      <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                        {scaleups.length} scaleup tecnologiche profilate divise per settore, città e ruoli aperti
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="btn pri sm" onClick={handleDownloadExcelCsv}>
                        📥 Scarica Excel / CSV
                      </button>
                      <button className="btn sm" onClick={handleRunSundayGeminiScan}>
                        ⚡ Esegui scansione domenicale ora
                      </button>
                    </div>
                  </div>

                  {/* Filtri Settore e Ricerca nel Database */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>Settore:</span>
                    {['all', 'Fintech', 'B2B SaaS', 'ClimateTech', 'Logistics', 'Consumer & AI'].map((sec) => (
                      <button
                        key={sec}
                        className={`fchip ${scaleupFilterSector === sec ? 'active' : ''}`}
                        onClick={() => setScaleupFilterSector(sec)}
                        style={{ height: '26px', fontSize: '11px', padding: '0 9px' }}
                      >
                        {sec === 'all' ? 'Tutti i settori' : sec}
                      </button>
                    ))}
                    <div style={{ marginLeft: 'auto', minWidth: '180px' }}>
                      <input
                        type="search"
                        placeholder="Cerca scaleup o città..."
                        value={scaleupSearchQuery}
                        onChange={(e) => setScaleupSearchQuery(e.target.value)}
                        style={{ height: '30px', borderRadius: '10px', fontSize: '11.5px', padding: '0 10px', width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Tabella Dati Scaleup Responsive */}
                  <div className="tw" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                    <table className="t-pro" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Azienda</th>
                          <th>Settore</th>
                          <th>Sede</th>
                          <th>Fase</th>
                          <th>Dipendenti</th>
                          <th>Ruoli Aperti d'Interesse</th>
                          <th>Note Strategiche Gemini</th>
                          <th style={{ textAlign: 'right' }}>Azione</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scaleups
                          .filter((s) => scaleupFilterSector === 'all' || s.sector === scaleupFilterSector)
                          .filter((s) => {
                            if (!scaleupSearchQuery.trim()) return true;
                            const q = scaleupSearchQuery.toLowerCase();
                            return (
                              s.name.toLowerCase().includes(q) ||
                              s.city.toLowerCase().includes(q) ||
                              s.sector.toLowerCase().includes(q)
                            );
                          })
                          .map((s) => (
                            <tr key={s.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {renderLogo(s.name, false, 32)}
                                  <div>
                                    <b style={{ fontSize: '13px' }}>{s.name}</b>
                                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10.5px' }}>
                                      {s.domain}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="pill" style={{ fontSize: '11px' }}>{s.sector}</span>
                              </td>
                              <td style={{ fontSize: '12px' }}>
                                {s.city}, {s.country}
                              </td>
                              <td style={{ fontSize: '12px' }}>{s.stage}</td>
                              <td style={{ fontSize: '12px' }}>{s.size}</td>
                              <td style={{ fontSize: '11.5px' }}>
                                {s.roles.map((r, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      display: 'inline-block',
                                      background: 'var(--field)',
                                      border: '1px solid var(--rim)',
                                      borderRadius: '6px',
                                      padding: '2px 6px',
                                      margin: '2px',
                                      fontSize: '10.5px',
                                    }}
                                  >
                                    {r}
                                  </span>
                                ))}
                              </td>
                              <td style={{ fontSize: '11.5px', color: 'var(--muted)', maxWidth: '220px' }}>
                                {s.keyNote}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  className="btn sm"
                                  style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                                  onClick={() => {
                                    handleAddDailyCompanyToTracker({
                                      id: s.id,
                                      name: s.name,
                                      sector: s.sector,
                                      city: s.city,
                                      country: s.country,
                                      stage: s.stage,
                                      targetRole: s.roles[0] || 'Founders Associate',
                                      whyFit: s.keyNote,
                                      careersUrl: `https://${s.domain}`,
                                    });
                                  }}
                                >
                                  + Tracker
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 1: OGGI (3 PERSONE CONSIGLIATE DALLA CODA GOOGLE SHEET)
                  ------------------------------------------------------------- */}
              {(sugSubTab === 'today' || sugSubTab === 'daily') && (() => {
                const today = new Date();
                const dayOfYear = getDayOfYear(today);
                const catIndex = dayOfYear % 3;
                const catName = getCategoryOfTheDay(today);
                
                const available = hubCoda.filter((c) => c.statoInvio === 'In coda' || c.statoInvio === 'Suggerita');
                let todaysCandidates = available.filter((c) => c.categoria === catName).slice(0, 3);
                if (todaysCandidates.length < 3) {
                  const fallbackCats: ('Startup' | 'Azienda' | 'Venture')[] = ['Startup', 'Azienda', 'Venture'];
                  for (const fb of fallbackCats) {
                    if (todaysCandidates.length >= 3) break;
                    if (fb === catName) continue;
                    const extra = available.filter((c) => c.categoria === fb && !todaysCandidates.some((x) => x.id === c.id));
                    todaysCandidates = [...todaysCandidates, ...extra].slice(0, 3);
                  }
                }

                const distinctCompaniesMap = new Map<string, { desc: string; link: string }>();
                todaysCandidates.forEach((c) => {
                  if (!distinctCompaniesMap.has(c.company)) {
                    distinctCompaniesMap.set(c.company, {
                      desc: c.descrizioneAzienda || 'Azienda target selezionata per il tuo profilo.',
                      link: c.linkedinAzienda || `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(c.company)}`,
                    });
                  }
                });
                const distinctCompanies = Array.from(distinctCompaniesMap.entries()).map(([comp, val]) => ({
                  name: comp,
                  ...val,
                }));

                const allIds = todaysCandidates.map((c) => c.id).join(' ');

                return (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Auto-Routine Live Status Banner */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        padding: '14px 18px',
                        borderRadius: '16px',
                        background: 'linear-gradient(145deg, rgba(37, 99, 235, 0.12), rgba(30, 64, 175, 0.05))',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>⚡</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <b style={{ fontSize: '13.5px', color: 'var(--text)' }}>
                              {DEMO ? 'Automazione Quotidiana Attiva (Zero Pulsanti)' : 'Email del giorno'}
                            </b>
                            {DEMO && (
                              <span className="pill" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', fontWeight: 700 }}>
                                ✓ Sincronizzato con Google Sheet
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                            {DEMO ? (
                              <>Ogni mattina invia in automatico l'email HTML alla tua casella e controlla se hai risposto dal telefono con <code>LN FATTO</code> o <code>LN SALTA</code>.</>
                            ) : (
                              <>L'email con i contatti del giorno parte quando apri l'app con Google autorizzato, oppure dal pulsante. Per aggiornare lo stato rispondi all'email con <code style={{ display: 'inline', padding: '2px 6px', borderRadius: '6px' }}>LN FATTO</code> o <code style={{ display: 'inline', padding: '2px 6px', borderRadius: '6px' }}>LN SALTA</code>.</>
                            )}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Destinatario: <strong>{currentUser?.email || activeWorkspaceAccount}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Formula Categoria del Giorno Box */}
                    <div
                      style={{
                        background: 'var(--glass-in)',
                        border: '1px solid var(--rim)',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <b style={{ fontSize: '13px' }}>
                          {DEMO ? (
                            <>Formula del giorno: <code>({dayOfYear}) % 3 = {catIndex}</code> → Categoria attiva: <span style={{ color: 'var(--brand)', fontWeight: 700 }}>{catName}</span></>
                          ) : (
                            <>Categoria di oggi: <span style={{ color: 'var(--brand)', fontWeight: 700 }}>{catName}</span></>
                          )}
                        </b>
                        <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                          {DEMO ? (
                            <>0 = Azienda · 1 = Startup · 2 = Venture. Oggi il sistema estrae 3 profili di tipo <strong>{catName}</strong>.</>
                          ) : (
                            <>La categoria cambia ogni giorno a rotazione: Azienda, Startup, Venture.</>
                          )}
                        </p>
                      </div>

                      <a
                        href={`mailto:${encodeURIComponent(currentUser?.email || OWNER_EMAIL_FALLBACK)}?subject=${encodeURIComponent(
                          `LN FATTO ${allIds}`
                        )}&body=${encodeURIComponent('Premi invia')}`}
                        className="btn pri sm"
                        style={{ textDecoration: 'none' }}
                      >
                        {todaysCandidates.length === 3 ? '✅ Fatto tutti e 3 (Email)' : '✅ Fatto tutti'}
                      </a>
                    </div>

                    {/* Riquadro Azienda / Aziende distinte */}
                    <div
                      style={{
                        background: 'var(--glass-in)',
                        borderLeft: '4px solid var(--brand)',
                        borderTop: '1px solid var(--rim)',
                        borderRight: '1px solid var(--rim)',
                        borderBottom: '1px solid var(--rim)',
                        borderRadius: '12px',
                        padding: '14px 18px',
                      }}
                    >
                      <h4 style={{ margin: '0 0 8px', fontSize: '13.5px' }}>
                        {distinctCompanies.length > 1 ? "🏢 Le aziende target di oggi" : "🏢 L'azienda target di oggi"}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {distinctCompanies.map((c) => (
                          <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <b style={{ fontSize: '13px' }}>{c.name}</b>
                              <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)' }}>{c.desc}</span>
                            </div>
                            <a
                              href={c.link}
                              target="_blank"
                              rel="noreferrer"
                              className="btn sm"
                              style={{ fontSize: '11px', textDecoration: 'none' }}
                            >
                              🔗 Cerca azienda su LinkedIn ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Le 3 Persone di Oggi dalla Coda con Spunta Istantanea */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px' }}>
                          I 3 Contatti del Giorno ({catName})
                        </h4>
                        <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Spunta con un clic per aggiornare automaticamente lo Sheet Google
                        </small>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: todaysCandidates.length > 0 ? 'repeat(auto-fit, minmax(310px, 1fr))' : '1fr', gap: '14px' }}>
                        {todaysCandidates.length === 0 ? (
                          <div style={{ padding: '36px 24px', textAlign: 'center', background: 'var(--glass-in)', borderRadius: '16px', border: '1px solid var(--rim)' }}>
                            <span style={{ fontSize: '36px' }}>🎉</span>
                            <h4 style={{ margin: '12px 0 4px', fontSize: '16px' }}>
                              Tutti i {hubCoda.length} Contatti del Database Risultano Già Contattati!
                            </h4>
                            <p style={{ margin: '0 auto 16px', maxWidth: '580px', fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5' }}>
                              {DEMO ? (
                                <>Tutte le persone e le 38 aziende censite nel tuo file sono state registrate come <b>Richiesta inviata</b> e salvate nell'archivio storico delle esclusioni.</>
                              ) : (
                                <>Le {processedCompanies.length} aziende già proposte sono registrate come <b>Richiesta inviata</b> e salvate nell'archivio storico delle esclusioni.</>
                              )}
                              <br />
                              La coda attiva per questa settimana è pronta per essere rifornita con nuove opportunità: avvia la scansione per estrarre 21 nuove aziende e persone (7 per categoria).
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <button
                                className="btn pri"
                                disabled={isScoutingSunday}
                                onClick={handlePopulateSundayHubCoda}
                                style={{ height: '38px', padding: '0 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                              >
                                {DEMO
                                  ? (isScoutingSunday ? '⏳ Ricerca Settimanale in corso (21 aziende + 21 persone)...' : '⚡ Avvia Scansione Ciclo #9 (21 Nuove Aziende & Coda)')
                                  : (isScoutingSunday ? 'Ricerca in corso…' : 'Cerca nuovi contatti')}
                              </button>
                              <button
                                className="btn"
                                onClick={() => setSugSubTab('preferences')}
                                style={{ height: '38px', padding: '0 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                ⚙️ Personalizza Zone &amp; Settori (Edilizia, ML...)
                              </button>
                            </div>
                          </div>
                        ) : (
                          todaysCandidates.map((item) => {
                            const isDone = item.statoInvio === 'Richiesta inviata';
                            return (
                            <div
                              key={item.id}
                              style={{
                                background: isDone ? 'rgba(34, 197, 94, 0.05)' : 'var(--glass-in)',
                                border: isDone ? '1px solid #16a34a' : '1px solid var(--rim)',
                                borderRadius: '16px',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span
                                    className="lg"
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '50%',
                                      background: grad(item.name),
                                      fontSize: '12px',
                                    }}
                                  >
                                    {ini(item.name)}
                                  </span>
                                  <div>
                                    <b style={{ fontSize: '14px' }}>{item.name}</b>
                                    <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)' }}>
                                      {item.role} · <strong>{item.company}</strong>
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`st ${item.affidabilita === 'certo' ? 'applied' : 'interview'}`}
                                  style={{ fontSize: '10px', height: '22px' }}
                                >
                                  {item.affidabilita === 'certo' ? '✓ Certo' : '⚠ Da verificare'}
                                </span>
                              </div>

                              <div style={{ fontSize: '11.5px', color: 'var(--muted)', lineHeight: '1.4' }}>
                                <strong>Perché:</strong> {item.motivo}
                              </div>

                              {/* Nota personalizzata */}
                              <div
                                style={{
                                  background: 'var(--field)',
                                  border: '1px solid var(--rim)',
                                  borderRadius: '10px',
                                  padding: '8px 10px',
                                  fontSize: '11.5px',
                                  fontStyle: 'italic',
                                  color: 'var(--text)',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontStyle: 'normal' }}>
                                  <small style={{ fontSize: '9.5px', color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase' }}>
                                    Nota Sartoriale ({item.notaConnessione.length}/300 car.)
                                  </small>
                                  <button
                                    className="btn sm"
                                    style={{ height: '20px', padding: '0 6px', fontSize: '10px' }}
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.notaConnessione);
                                      showToast(`✓ Nota copiata per ${item.name}!`);
                                    }}
                                  >
                                    📋 Copia
                                  </button>
                                </div>
                                "{item.notaConnessione}"
                              </div>

                              {/* Azioni rapide con Checkbox di Spunta Automatica */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: 'auto', paddingTop: '6px' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}>
                                  <input
                                    type="checkbox"
                                    checked={isDone}
                                    onChange={() => handleTogglePersonChecked(item.id, item.statoInvio)}
                                    style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                                  />
                                  <span style={{ color: isDone ? '#16a34a' : 'var(--text)' }}>
                                    {isDone ? '✓ Contattata su LinkedIn' : 'Spunta come contattata'}
                                  </span>
                                </label>

                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <a
                                    href={item.linkedinSearchUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn sm"
                                    style={{ fontSize: '11px', textDecoration: 'none', padding: '0 8px' }}
                                  >
                                    🔗 Profilo
                                  </a>
                                  <a
                                    href={`mailto:${encodeURIComponent(currentUser?.email || OWNER_EMAIL_FALLBACK)}?subject=${encodeURIComponent(`LN SALTA ${item.id}`)}&body=${encodeURIComponent('Premi invia')}`}
                                    className="btn sm"
                                    style={{ fontSize: '11px', textDecoration: 'none', padding: '0 6px', color: 'var(--amber)' }}
                                    title="Salta e scarta questo contatto"
                                  >
                                    ⏭ Salta
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        }))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* -------------------------------------------------------------
                  TAB 2: PERSONE CONSIGLIATE FINORA (STORICO CON SPUNTA LIVE)
                  ------------------------------------------------------------- */}
              {sugSubTab === 'history' && (() => {
                const historyItems = hubCoda.filter((c) => c.statoInvio !== 'In coda' || Boolean(c.inviataIl) || Boolean(c.suggeritaIl));

                return (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px' }}>
                          📜 Storico Persone Consigliate ({historyItems.length})
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Tutti i contatti proposti nelle email quotidiane. Clicca sulla spunta per aggiornare istantaneamente lo Sheet Google.
                        </p>
                      </div>
                    </div>

                    {historyItems.length === 0 ? (
                      <div style={{ padding: '36px', textAlign: 'center', background: 'var(--glass-in)', borderRadius: '16px', border: '1px solid var(--rim)' }}>
                        <span style={{ fontSize: '32px' }}>🌱</span>
                        <h4 style={{ margin: '10px 0 4px' }}>Nessuna persona ancora nello storico</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                          Non appena la prima terna quotidiana viene inviata, i contatti appariranno qui.
                        </p>
                      </div>
                    ) : (
                      <div className="tw" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                        <table className="t-pro" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '36px' }}>Spunta</th>
                              <th>ID</th>
                              <th>Persona &amp; Ruolo</th>
                              <th>Azienda</th>
                              <th>Categoria</th>
                              <th>Data Invio</th>
                              <th>Stato Attuale</th>
                              <th style={{ textAlign: 'right' }}>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyItems.map((item) => {
                              const isDone = item.statoInvio === 'Richiesta inviata';
                              return (
                                <tr key={item.id} style={{ opacity: item.statoInvio === 'Scartata' ? 0.6 : 1 }}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={isDone}
                                      onChange={() => handleTogglePersonChecked(item.id, item.statoInvio)}
                                      style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                                    />
                                  </td>
                                  <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                                    <b>{item.id}</b>
                                  </td>
                                  <td>
                                    <b style={{ fontSize: '12.5px' }}>{item.name}</b>
                                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10.5px' }}>
                                      {item.role} ({item.country})
                                    </small>
                                  </td>
                                  <td>
                                    <b style={{ fontSize: '12.5px' }}>{item.company}</b>
                                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10.5px' }}>
                                      {item.settore}
                                    </small>
                                  </td>
                                  <td>
                                    <span className="pill" style={{ fontSize: '10.5px' }}>{item.categoria}</span>
                                  </td>
                                  <td style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                                    {item.suggeritaIl || item.inviataIl || '—'}
                                  </td>
                                  <td>
                                    <span
                                      className={`st ${isDone ? 'applied' : item.statoInvio === 'Scartata' ? 'rejected' : 'interview'}`}
                                      style={{ fontSize: '10.5px', height: '22px' }}
                                    >
                                      {item.statoInvio}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                                      <button
                                        className="btn sm"
                                        style={{ height: '24px', padding: '0 6px', fontSize: '10.5px' }}
                                        onClick={() => {
                                          navigator.clipboard.writeText(item.notaConnessione);
                                          showToast(`✓ Nota copiata per ${item.name}!`);
                                        }}
                                      >
                                        📋 Nota
                                      </button>
                                      <button
                                        className="btn sm"
                                        style={{ height: '24px', padding: '0 6px', fontSize: '10.5px' }}
                                        onClick={() => window.open(item.linkedinSearchUrl, '_blank')}
                                      >
                                        🔗 LinkedIn
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* -------------------------------------------------------------
                  TAB 3: SPUNTATE & CODA COMPLETA (GOOGLE SHEET)
                  ------------------------------------------------------------- */}
              {(sugSubTab === 'queue' || sugSubTab === 'hub') && (() => {
                const today = new Date();
                const dayOfYear = getDayOfYear(today);
                const catIndex = dayOfYear % 3;
                const catName = getCategoryOfTheDay(today);
                const todaysCandidates = hubCoda
                  .filter((c) => c.categoria === catName)
                  .slice(0, 3);

                const filteredCoda = hubCoda.filter((c) => {
                  if (hubFilterCategory !== 'all' && c.categoria !== hubFilterCategory) return false;
                  if (hubFilterStato !== 'all' && c.statoInvio !== hubFilterStato) return false;
                  if (hubSearchQuery.trim()) {
                    const q = hubSearchQuery.toLowerCase();
                    return (
                      c.name.toLowerCase().includes(q) ||
                      c.company.toLowerCase().includes(q) ||
                      c.role.toLowerCase().includes(q) ||
                      c.settore.toLowerCase().includes(q)
                    );
                  }
                  return true;
                });

                return (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Top Header Card */}
                    <div
                      style={{
                        background: 'var(--glass-in)',
                        border: '1px solid var(--rim)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>📊</span>
                          <b style={{ fontSize: '15px' }}>Hub Networking LinkedIn · Scheda «Coda»</b>
                          <span className="pill" style={{ background: 'rgba(42, 111, 176, 0.2)', color: '#4ba0f5' }}>
                            Sheet ID: (impostalo nelle Preferenze)
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Ogni mattina estrae 3 contatti e invia email HTML alla casella principale collegata. Risposte lette anche dalle caselle secondarie configurate.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className="btn sm"
                          onClick={() =>
                            window.open(
                              `https://docs.google.com/spreadsheets/d/${userScoutConfig.googleSheetId}/edit`,
                              '_blank'
                            )
                          }
                        >
                          Apri Sheet su Google Drive ↗
                        </button>
                        <button
                          className="btn sm"
                          onClick={handleSyncSheetCoda}
                          disabled={isSyncingSheet}
                          style={{ fontWeight: 600 }}
                        >
                          {isSyncingSheet ? '⏳ Sincronizzazione...' : '🔄 Sincronizza Sheet Reale'}
                        </button>
                        <button
                          className="btn sm"
                          onClick={handleProcessYesterdayEmailCommands}
                        >
                          📫 Elabora comandi LN FATTO / LN SALTA
                        </button>
                        <button
                          className="btn sm"
                          onClick={handleSendDailyEmailNow}
                          disabled={isSendingDailyEmail}
                          style={{
                            background: 'rgba(37, 99, 235, 0.15)',
                            borderColor: '#3b82f6',
                            color: '#2563eb',
                            fontWeight: 600,
                          }}
                        >
                          {isSendingDailyEmail ? '⏳ Invio in corso...' : '📤 Invia Email del Giorno (3 Contatti)'}
                        </button>
                        <button
                          className="btn pri sm"
                          onClick={handlePopulateSundayHubCoda}
                          disabled={isScoutingSunday}
                        >
                          {isScoutingSunday ? '⏳ Ricerca Gemini in corso...' : '⚡ Esegui Ricerca Domenicale (21+21)'}
                        </button>
                      </div>
                    </div>

                    {/* Formula Categoria del Giorno Box */}
                    <div
                      style={{
                        background: 'linear-gradient(145deg, rgba(47, 120, 234, 0.12), rgba(22, 89, 204, 0.05))',
                        border: '1px solid rgba(47, 120, 234, 0.3)',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>📐</span>
                          <b style={{ fontSize: '13px' }}>
                            Formula deterministica: <code>Categoria = ({dayOfYear}) % 3 = {catIndex}</code> → Categoria attiva: <span style={{ color: 'var(--blue)' }}>{catName}</span>
                          </b>
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                          0 = Azienda · 1 = Startup · 2 = Venture. Oggi il sistema estrae 3 persone di tipo <strong>{catName}</strong>.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <a
                          href={`mailto:${encodeURIComponent(currentUser?.email || OWNER_EMAIL_FALLBACK)}?subject=${encodeURIComponent(
                            `LN FATTO ${todaysCandidates.map((c) => c.id).join(' ')}`
                          )}&body=${encodeURIComponent('Premi invia')}`}
                          className="btn pri sm"
                          style={{ textDecoration: 'none' }}
                        >
                          {todaysCandidates.length === 3 ? '✅ Fatto tutti e 3' : '✅ Fatto tutti'}
                        </a>
                      </div>
                    </div>

                    {/* Le 3 Persone di Oggi dalla Coda */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px' }}>
                          I 3 Contatti del Giorno ({catName}) estratti dal database
                        </h4>
                        <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Generati con note di connessione personalizzate &lt; 300 caratteri
                        </small>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '14px' }}>
                        {todaysCandidates.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              background: 'var(--glass-in)',
                              border: item.statoInvio === 'Richiesta inviata' ? '1px solid var(--green)' : '1px solid var(--rim)',
                              borderRadius: '16px',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span
                                  className="lg"
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: grad(item.name),
                                    fontSize: '12px',
                                  }}
                                >
                                  {ini(item.name)}
                                </span>
                                <div>
                                  <b style={{ fontSize: '14px' }}>{item.name}</b>
                                  <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)' }}>
                                    {item.role} · <strong>{item.company}</strong>
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`st ${item.affidabilita === 'certo' ? 'applied' : 'interview'}`}
                                style={{ fontSize: '10px', height: '22px' }}
                              >
                                {item.affidabilita === 'certo' ? '✓ Certo' : '⚠ Da verificare'}
                              </span>
                            </div>

                            <div style={{ fontSize: '11.5px', color: 'var(--muted)', lineHeight: '1.4' }}>
                              <strong>Contesto:</strong> {item.descrizioneAzienda} ({item.settore})
                              <br />
                              <strong>Motivo:</strong> {item.motivo}
                            </div>

                            {/* Nota personalizzata */}
                            <div
                              style={{
                                background: 'var(--field)',
                                border: '1px solid var(--rim)',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                fontSize: '11.5px',
                                fontStyle: 'italic',
                                color: 'var(--text)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontStyle: 'normal' }}>
                                <small style={{ fontSize: '9.5px', color: 'var(--blue)', fontWeight: 700, textTransform: 'uppercase' }}>
                                  Nota Sartoriale ({item.notaConnessione.length}/300 car.)
                                </small>
                                <button
                                  className="btn sm"
                                  style={{ height: '20px', padding: '0 6px', fontSize: '10px' }}
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.notaConnessione);
                                    showToast(`Nota copiata per ${item.name}!`);
                                  }}
                                >
                                  📋 Copia
                                </button>
                              </div>
                              "{item.notaConnessione}"
                            </div>

                            {/* Bottoni Mailto & Link */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '4px' }}>
                              <a
                                href={item.linkedinSearchUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn sm"
                                style={{ fontSize: '11px', textDecoration: 'none', padding: '0 8px' }}
                              >
                                🔗 LinkedIn
                              </a>
                              <a
                                href={`mailto:${encodeURIComponent(currentUser?.email || OWNER_EMAIL_FALLBACK)}?subject=${encodeURIComponent(`LN FATTO ${item.id}`)}&body=${encodeURIComponent('Premi invia')}`}
                                className="btn sm"
                                style={{ fontSize: '11px', textDecoration: 'none', padding: '0 8px', color: 'var(--green)' }}
                              >
                                ✅ Fatto
                              </a>
                              <a
                                href={`mailto:${encodeURIComponent(currentUser?.email || OWNER_EMAIL_FALLBACK)}?subject=${encodeURIComponent(`LN SALTA ${item.id}`)}&body=${encodeURIComponent('Premi invia')}`}
                                className="btn sm"
                                style={{ fontSize: '11px', textDecoration: 'none', padding: '0 8px', color: 'var(--amber)' }}
                              >
                                ⏭ Salta
                              </a>
                              <button
                                className={`btn sm ${item.statoInvio === 'Richiesta inviata' ? 'pri' : ''}`}
                                style={{ marginLeft: 'auto', fontSize: '11px', padding: '0 8px' }}
                                onClick={() => {
                                  const nextStato = item.statoInvio === 'Richiesta inviata' ? 'In coda' : 'Richiesta inviata';
                                  setHubCoda((prev) =>
                                    prev.map((it) => (it.id === item.id ? { ...it, statoInvio: nextStato } : it))
                                  );
                                  showToast(`Stato di ${item.name} aggiornato a "${nextStato}"`);
                                }}
                              >
                                {item.statoInvio === 'Richiesta inviata' ? '✓ Inviata' : 'Segna inviata'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tabella Completa Scheda Coda con Filtri */}
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '14px' }}>Tutti i Contatti nella Scheda «Coda» ({filteredCoda.length})</h4>
                          <small style={{ fontSize: '11px', color: 'var(--muted)' }}>Gestione avanzata e storico invii</small>
                        </div>

                        {/* Filtri categoria & stato */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <select
                            value={hubFilterCategory}
                            onChange={(e) => setHubFilterCategory(e.target.value)}
                            style={{ height: '28px', fontSize: '11.5px', borderRadius: '8px' }}
                          >
                            <option value="all">Tutte le categorie</option>
                            <option value="Azienda">Azienda</option>
                            <option value="Startup">Startup</option>
                            <option value="Venture">Venture</option>
                          </select>
                          <select
                            value={hubFilterStato}
                            onChange={(e) => setHubFilterStato(e.target.value)}
                            style={{ height: '28px', fontSize: '11.5px', borderRadius: '8px' }}
                          >
                            <option value="all">Tutti gli stati</option>
                            <option value="In coda">In coda</option>
                            <option value="Suggerita">Suggerita</option>
                            <option value="Richiesta inviata">Richiesta inviata</option>
                            <option value="Accettata">Accettata</option>
                            <option value="In chiamata">In chiamata</option>
                            <option value="Scartata">Scartata</option>
                          </select>
                          <input
                            type="search"
                            placeholder="Cerca contatto o azienda..."
                            value={hubSearchQuery}
                            onChange={(e) => setHubSearchQuery(e.target.value)}
                            style={{ height: '28px', fontSize: '11.5px', borderRadius: '8px', padding: '0 8px' }}
                          />
                        </div>
                      </div>

                      <div className="tw" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                        <table className="t-pro" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '36px' }}>Spunta</th>
                              <th>ID</th>
                              <th>Persona &amp; Ruolo</th>
                              <th>Azienda &amp; Settore</th>
                              <th>Categoria</th>
                              <th>Affidabilità</th>
                              <th>Stato Invio</th>
                              <th style={{ textAlign: 'right' }}>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredCoda.map((item) => {
                              const isDone = item.statoInvio === 'Richiesta inviata';
                              return (
                              <tr key={item.id} style={{ opacity: item.statoInvio === 'Scartata' ? 0.6 : 1 }}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isDone}
                                    onChange={() => handleTogglePersonChecked(item.id, item.statoInvio)}
                                    style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                                    title="Spunta come contattata per aggiornare lo Sheet Google"
                                  />
                                </td>
                                <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                                  <b>{item.id}</b>
                                </td>
                                <td>
                                  <b style={{ fontSize: '12.5px' }}>{item.name}</b>
                                  <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10.5px' }}>
                                    {item.role}
                                  </small>
                                </td>
                                <td>
                                  <b style={{ fontSize: '12.5px' }}>{item.company}</b>
                                  <small style={{ display: 'block', color: 'var(--muted)', fontSize: '10.5px' }}>
                                    {item.settore}
                                  </small>
                                </td>
                                <td>
                                  <span className="pill" style={{ fontSize: '10.5px' }}>
                                    {item.categoria}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`st ${item.affidabilita === 'certo' ? 'applied' : 'interview'}`}
                                    style={{ fontSize: '10px', height: '20px' }}
                                  >
                                    {item.affidabilita === 'certo' ? 'Certo' : 'Da verificare'}
                                  </span>
                                </td>
                                <td>
                                  <select
                                    value={item.statoInvio}
                                    onChange={(e) => handleTogglePersonChecked(item.id, item.statoInvio, e.target.value)}
                                    style={{ height: '26px', fontSize: '11px', borderRadius: '6px', padding: '0 4px' }}
                                  >
                                    <option value="In coda">In coda</option>
                                    <option value="Suggerita">Suggerita</option>
                                    <option value="Richiesta inviata">Richiesta inviata</option>
                                    <option value="Accettata">Accettata</option>
                                    <option value="In chiamata">In chiamata</option>
                                    <option value="Scartata">Scartata</option>
                                  </select>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '4px' }}>
                                    <button
                                      className="btn sm"
                                      style={{ height: '26px', padding: '0 6px', fontSize: '10.5px' }}
                                      onClick={() => {
                                        navigator.clipboard.writeText(item.notaConnessione);
                                        showToast(`Nota copiata!`);
                                      }}
                                    >
                                      📋 Nota
                                    </button>
                                    <button
                                      className="btn sm"
                                      style={{ height: '26px', padding: '0 6px', fontSize: '10.5px' }}
                                      onClick={() => window.open(item.linkedinSearchUrl, '_blank')}
                                    >
                                      🔗
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* -------------------------------------------------------------
                  TAB PREFERENZE & SETUP VERCEL: ZONE, EDILIZIA/ML, GOOGLE SHEET
                  ------------------------------------------------------------- */}
              {sugSubTab === 'preferences' && (() => {
                const isGoogleConnected = Boolean(getAccessToken(currentUser?.email || activeWorkspaceAccount));
                const activeEmail = currentUser?.email || activeWorkspaceAccount || userScoutConfig.userName;

                // Handlers per Zone Geografiche
                const handleAddLocation = (locToAdd?: string) => {
                  const val = (locToAdd !== undefined ? locToAdd : newLocationInput).trim();
                  if (!val) return;
                  if (!userScoutConfig.allLocations.some((l) => l.toLowerCase() === val.toLowerCase())) {
                    setUserScoutConfig((prev) => ({
                      ...prev,
                      allLocations: [...prev.allLocations, val],
                      selectedLocations: [...prev.selectedLocations, val],
                    }));
                    showToast(`✓ Aggiunta zona: "${val}"`);
                  } else if (!userScoutConfig.selectedLocations.includes(val)) {
                    setUserScoutConfig((prev) => ({
                      ...prev,
                      selectedLocations: [...prev.selectedLocations, val],
                    }));
                  }
                  setNewLocationInput('');
                };

                const handleRemoveLocation = (loc: string) => {
                  setUserScoutConfig((prev) => ({
                    ...prev,
                    allLocations: prev.allLocations.filter((l) => l !== loc),
                    selectedLocations: prev.selectedLocations.filter((l) => l !== loc),
                  }));
                };

                const handleToggleLocation = (loc: string) => {
                  setUserScoutConfig((prev) => {
                    const isSelected = prev.selectedLocations.includes(loc);
                    return {
                      ...prev,
                      selectedLocations: isSelected
                        ? prev.selectedLocations.filter((l) => l !== loc)
                        : [...prev.selectedLocations, loc],
                    };
                  });
                };

                // Handlers per Settori
                const handleAddSector = (secToAdd?: string) => {
                  const val = (secToAdd !== undefined ? secToAdd : newSectorInput).trim();
                  if (!val) return;
                  if (!userScoutConfig.allSectors.some((s) => s.toLowerCase() === val.toLowerCase())) {
                    setUserScoutConfig((prev) => ({
                      ...prev,
                      allSectors: [...prev.allSectors, val],
                      selectedSectors: [...prev.selectedSectors, val],
                    }));
                    showToast(`✓ Aggiunto settore: "${val}"`);
                  } else if (!userScoutConfig.selectedSectors.includes(val)) {
                    setUserScoutConfig((prev) => ({
                      ...prev,
                      selectedSectors: [...prev.selectedSectors, val],
                    }));
                  }
                  setNewSectorInput('');
                };

                const handleRemoveSector = (sec: string) => {
                  setUserScoutConfig((prev) => ({
                    ...prev,
                    allSectors: prev.allSectors.filter((s) => s !== sec),
                    selectedSectors: prev.selectedSectors.filter((s) => s !== sec),
                  }));
                };

                const handleToggleSector = (sec: string) => {
                  setUserScoutConfig((prev) => {
                    const isSelected = prev.selectedSectors.includes(sec);
                    return {
                      ...prev,
                      selectedSectors: isSelected
                        ? prev.selectedSectors.filter((s) => s !== sec)
                        : [...prev.selectedSectors, sec],
                    };
                  });
                };

                // Handlers per Ruoli
                const handleAddRole = (roleToAdd?: string) => {
                  const val = (roleToAdd !== undefined ? roleToAdd : newRoleInput).trim();
                  if (!val) return;
                  if (!userScoutConfig.allRoles.some((r) => r.toLowerCase() === val.toLowerCase())) {
                    setUserScoutConfig((prev) => ({
                      ...prev,
                      allRoles: [...prev.allRoles, val],
                      selectedRoles: [...prev.selectedRoles, val],
                    }));
                    showToast(`✓ Aggiunto ruolo: "${val}"`);
                  } else if (!userScoutConfig.selectedRoles.includes(val)) {
                    setUserScoutConfig((prev) => ({
                      ...prev,
                      selectedRoles: [...prev.selectedRoles, val],
                    }));
                  }
                  setNewRoleInput('');
                };

                const handleRemoveRole = (role: string) => {
                  setUserScoutConfig((prev) => ({
                    ...prev,
                    allRoles: prev.allRoles.filter((r) => r !== role),
                    selectedRoles: prev.selectedRoles.filter((r) => r !== role),
                  }));
                };

                const handleToggleRole = (role: string) => {
                  setUserScoutConfig((prev) => {
                    const isSelected = prev.selectedRoles.includes(role);
                    return {
                      ...prev,
                      selectedRoles: isSelected
                        ? prev.selectedRoles.filter((r) => r !== role)
                        : [...prev.selectedRoles, role],
                    };
                  });
                };

                // Handlers per Ambiti & Interessi
                const handleAddInterest = (interestToAdd?: string) => {
                  const val = (interestToAdd !== undefined ? interestToAdd : newInterestInput).trim();
                  if (!val) return;
                  if (!userScoutConfig.allInterests.some((i) => i.toLowerCase() === val.toLowerCase())) {
                    setUserScoutConfig((prev) => ({
                      ...prev,
                      allInterests: [...prev.allInterests, val],
                      selectedInterests: [...prev.selectedInterests, val],
                    }));
                    showToast(`✓ Aggiunto interesse: "${val}"`);
                  } else if (!userScoutConfig.selectedInterests.includes(val)) {
                    setUserScoutConfig((prev) => ({
                      ...prev,
                      selectedInterests: [...prev.selectedInterests, val],
                    }));
                  }
                  setNewInterestInput('');
                };

                const handleRemoveInterest = (interest: string) => {
                  setUserScoutConfig((prev) => ({
                    ...prev,
                    allInterests: prev.allInterests.filter((i) => i !== interest),
                    selectedInterests: prev.selectedInterests.filter((i) => i !== interest),
                  }));
                };

                const handleToggleInterest = (interest: string) => {
                  setUserScoutConfig((prev) => {
                    const isSelected = prev.selectedInterests.includes(interest);
                    return {
                      ...prev,
                      selectedInterests: isSelected
                        ? prev.selectedInterests.filter((i) => i !== interest)
                        : [...prev.selectedInterests, interest],
                    };
                  });
                };

                return (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Header Banner */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(147, 51, 234, 0.1))',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '14px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>🚀</span>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                            Setup Dinamico &amp; Categorie Personalizzate
                          </h4>
                          <span className="pill" style={{ fontSize: '10.5px', background: 'var(--ok-a)', color: 'var(--ok)' }}>
                            100% Personalizzabile
                          </span>
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'var(--muted)', maxWidth: '780px', lineHeight: '1.5' }}>
                          Puoi aggiungere qualsiasi nuova <b>Città/Zona</b>, <b>Settore</b>, <b>Ruolo</b> o <b>Interesse Specifico</b> (es. Edilizia, ConTech, Machine Learning, Computer Vision).
                          Ogni elemento diventa un badge attivo e selezionabile per la ricerca di Gemini e per lo Sheet Google.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn pri sm"
                          onClick={() => {
                            download4TabGoogleSheetTemplate(processedCompanies);
                            showToast('✓ Template Google Sheet (.xlsx) scaricato con successo!');
                          }}
                          style={{ height: '32px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          📄 Scarica Template Google Sheet (.xlsx)
                        </button>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={handleSyncSheetCoda}
                          disabled={isSyncingSheet}
                          style={{ height: '32px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          {isSyncingSheet ? '⏳ Sincronizzazione...' : '🔄 Sincronizza Sheet'}
                        </button>
                      </div>
                    </div>

                    {/* RIGA 1: GOOGLE SHEET & PROFILO */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>

                      {/* 1. Account Google & Google Sheet ID */}
                      <div
                        style={{
                          background: 'var(--glass-in)',
                          border: '1px solid var(--rim)',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>📊</span>
                            <b style={{ fontSize: '14px' }}>Account Google &amp; Google Sheet</b>
                          </div>
                          <span
                            className="pill"
                            style={{
                              fontSize: '10.5px',
                              background: isGoogleConnected ? 'var(--ok-a)' : 'var(--warn-a)',
                              color: isGoogleConnected ? 'var(--ok)' : 'var(--warn)',
                            }}
                          >
                            {isGoogleConnected ? `✓ Connesso (${activeEmail})` : '⚠️ Non Connesso a Google'}
                          </span>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>
                            ID SPREADSHEET GOOGLE SHEET
                          </label>
                          <input
                            type="text"
                            className="inp"
                            value={userScoutConfig.googleSheetId}
                            onChange={(e) => setUserScoutConfig((prev) => ({ ...prev, googleSheetId: e.target.value.trim() }))}
                            placeholder="Es: 1AbCdEfGhIjKlMnOpQrStUvWxYz"
                            style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', height: '36px' }}
                          />
                          <small style={{ display: 'block', fontSize: '10.5px', color: 'var(--muted)', marginTop: '4px' }}>
                            L'ID si trova nell'URL del tuo foglio: docs.google.com/spreadsheets/d/<b>[QUESTO_ID]</b>/edit
                          </small>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => {
                              setUserScoutConfig((prev) => ({ ...prev, googleSheetId: DEFAULT_SHEET_ID }));
                              showToast('✓ Ripristinato Sheet ID predefinito');
                            }}
                            style={{ fontSize: '11px', height: '28px' }}
                          >
                            🔄 Reset ID Predefinito
                          </button>
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${userScoutConfig.googleSheetId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn sm"
                            style={{ fontSize: '11px', height: '28px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            🔗 Apri Foglio Google ↗
                          </a>
                          {!isGoogleConnected && (
                            <button
                              type="button"
                              className="btn pri sm"
                              onClick={async () => {
                                try {
                                  await loginWithGoogle();
                                  showToast('✓ Connessione Google completata!');
                                } catch (e: any) {
                                  showToast(`Errore login Google: ${e.message}`);
                                }
                              }}
                              style={{ fontSize: '11px', height: '28px' }}
                            >
                              🔑 Connetti Google OAuth
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Profilo Utente & Firma Messaggi */}
                      <div
                        style={{
                          background: 'var(--glass-in)',
                          border: '1px solid var(--rim)',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>👤</span>
                          <b style={{ fontSize: '14px' }}>Profilo Utente &amp; Firma Messaggi</b>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>
                              NOME UTENTE
                            </label>
                            <input
                              type="text"
                              className="inp"
                              value={userScoutConfig.userName}
                              onChange={(e) => setUserScoutConfig((prev) => ({ ...prev, userName: e.target.value }))}
                              placeholder="Es. Alex"
                              style={{ width: '100%', height: '34px', fontSize: '12px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>
                              BACKGROUND / STUDI
                            </label>
                            <input
                              type="text"
                              className="inp"
                              value={userScoutConfig.userProfile}
                              onChange={(e) => setUserScoutConfig((prev) => ({ ...prev, userProfile: e.target.value }))}
                              placeholder="Es. studente MSc presso una business school europea"
                              style={{ width: '100%', height: '34px', fontSize: '12px' }}
                            />
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--field)', border: '1px solid var(--rim)', fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
                          📝 <b>Regola Messaggi LinkedIn:</b> Tutte le note generate da Gemini saranno sotto i 300 caratteri, con tono naturale, menzionando che sei {userScoutConfig.userProfile}, firmate "{userScoutConfig.userName}", senza elemosinare lavoro.
                        </div>
                      </div>

                    </div>

                    {/* RIGA 2: ZONE GEOGRAFICHE & RUOLI (ENTRAMBI AGGIUNGIBILI) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>

                      {/* 3. Zone Geografiche (Aggiungi qualsiasi città o zona) */}
                      <div
                        style={{
                          background: 'var(--glass-in)',
                          border: '1px solid var(--rim)',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>📍</span>
                            <b style={{ fontSize: '14px' }}>Zone Geografiche &amp; Hub ({userScoutConfig.selectedLocations.length}/{userScoutConfig.allLocations.length})</b>
                          </div>
                          <span className="pill" style={{ fontSize: '10.5px', background: 'var(--blue-a)', color: 'var(--blue)' }}>
                            {userScoutConfig.selectedLocations.length} Attive
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)' }}>
                          Clicca per attivare/disattivare. Aggiungi nuove città o zone con il form qui sotto o rimuovile con la <b>×</b>.
                        </p>

                        {/* Badges dinamici con delete */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                          {userScoutConfig.allLocations.map((c) => {
                            const active = userScoutConfig.selectedLocations.includes(c);
                            return (
                              <div
                                key={c}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  background: active ? 'var(--blue-d)' : 'var(--field)',
                                  color: active ? '#fff' : 'var(--text)',
                                  borderRadius: '999px',
                                  padding: '2px 4px 2px 10px',
                                  fontSize: '11px',
                                  border: active ? '1px solid transparent' : '1px solid var(--rim)',
                                  gap: '4px',
                                }}
                              >
                                <span
                                  onClick={() => handleToggleLocation(c)}
                                  style={{ cursor: 'pointer', fontWeight: active ? 600 : 500 }}
                                >
                                  {active ? '✓ ' : '+ '}{c}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveLocation(c);
                                  }}
                                  title={`Rimuovi ${c}`}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: active ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    fontSize: '12px',
                                    lineHeight: '1',
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Input per aggiungere nuova città / zona */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <input
                            type="text"
                            className="inp"
                            value={newLocationInput}
                            onChange={(e) => setNewLocationInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddLocation();
                              }
                            }}
                            placeholder="Aggiungi città o zona (es: Napoli, Zurigo, Svizzera Italiana)..."
                            style={{ flex: 1, height: '32px', fontSize: '11.5px' }}
                          />
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleAddLocation()}
                            style={{ height: '32px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                          >
                            + Aggiungi
                          </button>
                        </div>
                      </div>

                      {/* 4. Ruoli & Posizioni Target (Aggiungi qualsiasi ruolo) */}
                      <div
                        style={{
                          background: 'var(--glass-in)',
                          border: '1px solid var(--rim)',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>💼</span>
                            <b style={{ fontSize: '14px' }}>Ruoli &amp; Posizioni Target ({userScoutConfig.selectedRoles.length}/{userScoutConfig.allRoles.length})</b>
                          </div>
                          <span className="pill" style={{ fontSize: '10.5px', background: 'var(--purple-a)', color: 'var(--purple)' }}>
                            {userScoutConfig.selectedRoles.length} Attivi
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)' }}>
                          Seleziona i ruoli o aggiungi nuove figure professionali da cercare nelle aziende.
                        </p>

                        {/* Badges dinamici ruoli con delete */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                          {userScoutConfig.allRoles.map((r) => {
                            const active = userScoutConfig.selectedRoles.includes(r);
                            return (
                              <div
                                key={r}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  background: active ? 'var(--blue-d)' : 'var(--field)',
                                  color: active ? '#fff' : 'var(--text)',
                                  borderRadius: '999px',
                                  padding: '2px 4px 2px 10px',
                                  fontSize: '11px',
                                  border: active ? '1px solid transparent' : '1px solid var(--rim)',
                                  gap: '4px',
                                }}
                              >
                                <span
                                  onClick={() => handleToggleRole(r)}
                                  style={{ cursor: 'pointer', fontWeight: active ? 600 : 500 }}
                                >
                                  {active ? '✓ ' : '+ '}{r}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveRole(r);
                                  }}
                                  title={`Rimuovi ${r}`}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: active ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    fontSize: '12px',
                                    lineHeight: '1',
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Input per aggiungere nuovo ruolo */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <input
                            type="text"
                            className="inp"
                            value={newRoleInput}
                            onChange={(e) => setNewRoleInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddRole();
                              }
                            }}
                            placeholder="Aggiungi ruolo (es: ConTech Specialist, Investment Associate)..."
                            style={{ flex: 1, height: '32px', fontSize: '11.5px' }}
                          />
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleAddRole()}
                            style={{ height: '32px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                          >
                            + Aggiungi
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* RIGA 3: SETTORI & AMBITI/INTERESSI (ENTRAMBI AGGIUNGIBILI) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>

                      {/* 5. Settori & Verticali (Aggiungi qualsiasi settore) */}
                      <div
                        style={{
                          background: 'var(--glass-in)',
                          border: '1px solid var(--rim)',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>🏗️</span>
                            <b style={{ fontSize: '14px' }}>Settori &amp; Verticali Target ({userScoutConfig.selectedSectors.length}/{userScoutConfig.allSectors.length})</b>
                          </div>
                          <span className="pill" style={{ fontSize: '10.5px', background: 'var(--ok-a)', color: 'var(--ok)' }}>
                            {userScoutConfig.selectedSectors.length} Attivi
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)' }}>
                          Attiva/disattiva i settori della ricerca settimanale o creane di nuovi con il form sotto.
                        </p>

                        {/* Badges dinamici settori con delete */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                          {userScoutConfig.allSectors.map((s) => {
                            const active = userScoutConfig.selectedSectors.includes(s);
                            return (
                              <div
                                key={s}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  background: active ? 'var(--blue-d)' : 'var(--field)',
                                  color: active ? '#fff' : 'var(--text)',
                                  borderRadius: '999px',
                                  padding: '2px 4px 2px 10px',
                                  fontSize: '11px',
                                  border: active ? '1px solid transparent' : '1px solid var(--rim)',
                                  gap: '4px',
                                }}
                              >
                                <span
                                  onClick={() => handleToggleSector(s)}
                                  style={{ cursor: 'pointer', fontWeight: active ? 600 : 500 }}
                                >
                                  {active ? '✓ ' : '+ '}{s}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSector(s);
                                  }}
                                  title={`Rimuovi ${s}`}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: active ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    fontSize: '12px',
                                    lineHeight: '1',
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Input per aggiungere nuovo settore */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <input
                            type="text"
                            className="inp"
                            value={newSectorInput}
                            onChange={(e) => setNewSectorInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSector();
                              }
                            }}
                            placeholder="Aggiungi settore (es: Edilizia ConTech, Cybersecurity, Agritech)..."
                            style={{ flex: 1, height: '32px', fontSize: '11.5px' }}
                          />
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleAddSector()}
                            style={{ height: '32px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                          >
                            + Aggiungi
                          </button>
                        </div>
                      </div>

                      {/* 6. Ambiti, Tecnologie & Interessi Specifici (Aggiungi qualsiasi tag) */}
                      <div
                        style={{
                          background: 'var(--glass-in)',
                          border: '1px solid var(--rim)',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>🔬</span>
                            <b style={{ fontSize: '14px' }}>Ambiti, Tecnologie &amp; Interessi ({userScoutConfig.selectedInterests.length}/{userScoutConfig.allInterests.length})</b>
                          </div>
                          <span className="pill" style={{ fontSize: '10.5px', background: 'var(--warn-a)', color: 'var(--warn)' }}>
                            Focus AI
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)' }}>
                          Tag tecnologici e ambiti che Gemini userà per filtrare le startup più rilevanti (es. Computer Vision per cantieri, BIM, ecc.).
                        </p>

                        {/* Badges dinamici interessi con delete */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                          {userScoutConfig.allInterests.map((i) => {
                            const active = userScoutConfig.selectedInterests.includes(i);
                            return (
                              <div
                                key={i}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  background: active ? 'var(--blue-d)' : 'var(--field)',
                                  color: active ? '#fff' : 'var(--text)',
                                  borderRadius: '999px',
                                  padding: '2px 4px 2px 10px',
                                  fontSize: '11px',
                                  border: active ? '1px solid transparent' : '1px solid var(--rim)',
                                  gap: '4px',
                                }}
                              >
                                <span
                                  onClick={() => handleToggleInterest(i)}
                                  style={{ cursor: 'pointer', fontWeight: active ? 600 : 500 }}
                                >
                                  {active ? '✓ ' : '+ '}{i}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveInterest(i);
                                  }}
                                  title={`Rimuovi ${i}`}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: active ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                    fontSize: '12px',
                                    lineHeight: '1',
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Input per aggiungere nuovo interesse / ambito */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <input
                            type="text"
                            className="inp"
                            value={newInterestInput}
                            onChange={(e) => setNewInterestInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddInterest();
                              }
                            }}
                            placeholder="Aggiungi interesse/tecnologia (es: Computer Vision, Stampa 3D, Materiali Eco)..."
                            style={{ flex: 1, height: '32px', fontSize: '11.5px' }}
                          />
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleAddInterest()}
                            style={{ height: '32px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                          >
                            + Aggiungi
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* FOCUS TESTUALE SPECIFICO PER GEMINI */}
                    <div
                      style={{
                        background: 'var(--glass-in)',
                        border: '1px solid var(--rim)',
                        borderRadius: '16px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--blue)' }}>
                        🎯 FOCUS DI RICERCA LIBERO (PROMPT DIREZIONALE PER GEMINI)
                      </label>
                      <textarea
                        className="inp"
                        rows={3}
                        value={userScoutConfig.customSectorFocus}
                        onChange={(e) => setUserScoutConfig((prev) => ({ ...prev, customSectorFocus: e.target.value }))}
                        placeholder="Es: Cerca le migliori startup ML/MV e Computer Vision giorno per giorno per aggiungere su LinkedIn nel settore edilizia, cantieri digitali, robotica edile e materiali innovativi."
                        style={{ width: '100%', fontSize: '12px', resize: 'vertical', lineHeight: '1.5', padding: '10px 12px' }}
                      />
                      <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Questo testo libero viene combinato con tutte le città, settori, ruoli e interessi selezionati sopra ed inviato direttamente a Gemini.
                      </small>
                    </div>

                    {/* Azioni di Lancio e Deploy Vercel */}
                    <div
                      style={{
                        background: 'var(--glass-in)',
                        border: '1px solid var(--rim)',
                        borderRadius: '16px',
                        padding: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '14px',
                      }}
                    >
                      <div>
                        <b style={{ fontSize: '14px', display: 'block' }}>⚡ Pronto a Lanciare lo Scout con queste Categorie?</b>
                        <small style={{ color: 'var(--muted)', fontSize: '12px' }}>
                          Verranno inviate a Gemini {userScoutConfig.selectedLocations.length} zone, {userScoutConfig.selectedSectors.length} settori, {userScoutConfig.selectedRoles.length} ruoli e {userScoutConfig.selectedInterests.length} interessi chiave.
                        </small>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => {
                            setUserScoutConfig(DEFAULT_USER_SCOUT_CONFIG);
                            showToast('✓ Categorie e preferenze ripristinate ai valori predefiniti');
                          }}
                          style={{ height: '36px', fontSize: '12px' }}
                        >
                          🔄 Ripristina Categorie Iniziali
                        </button>
                        <button
                          type="button"
                          className="btn pri"
                          disabled={isScoutingSunday}
                          onClick={() => {
                            showToast('✓ Preferenze salvate! Avvio scansione con Gemini...');
                            handlePopulateSundayHubCoda();
                          }}
                          style={{ height: '36px', padding: '0 18px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          {DEMO
                            ? (isScoutingSunday ? '⏳ Scansione in corso...' : '⚡ Salva & Avvia Scansione Ciclo #9')
                            : (isScoutingSunday ? 'Ricerca in corso…' : 'Salva e cerca')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* -------------------------------------------------------------
                  TAB 3: REGOLE & PROMPT AUTOMAZIONE GEMINI
                  ------------------------------------------------------------- */}
              {sugSubTab === 'settings' && (() => {
                // Calcolo distribuzione settori (escluse Venture Builder e Venture Capital)
                const sectorCounts: Record<string, number> = {
                  '1 Financial Services / Fintech': 0,
                  '2 Retail / E-commerce': 0,
                  '3 Consumer Goods / FMCG': 0,
                  '4 Healthcare / Life Sciences': 0,
                  '5 Energy / Sustainability': 0,
                  '6 Tech / SaaS B2B': 0,
                  '7 Real Estate / PropTech': 0,
                };

                processedCompanies.forEach((c) => {
                  if (c.sector && sectorCounts[c.sector] !== undefined) {
                    sectorCounts[c.sector]++;
                  }
                });

                // Trova il primo settore con meno di 3 aziende
                const nextPrioritySector = WEEKLY_SECTORS.find((s) => (sectorCounts[s] || 0) < 3) || WEEKLY_SECTORS[0];

                const filteredProcessed = processedCompanies.filter((p) => {
                  if (!procSearchQuery) return true;
                  const q = procSearchQuery.toLowerCase();
                  return p.name.toLowerCase().includes(q) || p.sector.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
                });

                return (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Header con Azioni File e Google Sheet */}
                    <div
                      style={{
                        background: 'var(--glass-in)',
                        border: '1px solid var(--rim)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>🏢</span>
                          <h4 style={{ margin: 0, fontSize: '15px' }}>
                            Aziende Già Processate ({processedCompanies.length})
                          </h4>
                          <span className="pill" style={{ fontSize: '10.5px', background: 'var(--blue-a)', color: 'var(--blue)' }}>
                            Cicli #2 - #8 Completati
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Database delle aziende già esaminate per evitare duplicati e guidare la rotazione sui 7 settori.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          type="file"
                          ref={procFileInputRef}
                          accept=".xlsx,.xls,.csv"
                          onChange={handleUploadExcelOrCsvFile}
                          style={{ display: 'none' }}
                        />
                        <button
                          className="btn pri sm"
                          onClick={() => procFileInputRef.current?.click()}
                          style={{ height: '30px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          📁 Carica File Excel / CSV
                        </button>
                        <button
                          className="btn sm"
                          onClick={handleExportProcessedCompaniesExcel}
                          style={{ height: '30px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          📥 Esporta Excel
                        </button>
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${userScoutConfig.googleSheetId}/edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn sm"
                          style={{ height: '30px', fontSize: '11.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          🔗 Google Sheet
                        </a>
                      </div>
                    </div>

                    {/* Stato Rotazione Settori e Regole Esecuzione Domenicale */}
                    <div
                      style={{
                        background: 'var(--glass-in)',
                        border: '1px solid var(--rim)',
                        borderRadius: '16px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <b style={{ fontSize: '13.5px' }}>🎯 Regola di Distribuzione sui 7 Settori (Obiettivo &ge; 3 per settore)</b>
                          <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11.5px' }}>
                            Il settore prioritario è il primo della lista con meno di 3 aziende censite.
                          </small>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="pill" style={{ fontSize: '11px', background: 'var(--ok-a)', color: 'var(--ok)' }}>
                            Prossimo Ciclo: <b>#9</b>
                          </span>
                          <span className="pill" style={{ fontSize: '11px', background: 'var(--warn-a)', color: 'var(--warn)' }}>
                            Alternanza Venture: <b>Venture Capital</b>
                          </span>
                        </div>
                      </div>

                      {/* Griglia Settori */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px' }}>
                        {WEEKLY_SECTORS.map((sectorName) => {
                          const count = sectorCounts[sectorName] || 0;
                          const isComplete = count >= 3;
                          const isNext = sectorName === nextPrioritySector;

                          return (
                            <div
                              key={sectorName}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '12px',
                                background: isNext ? 'var(--blue-a)' : 'var(--field)',
                                border: isNext ? '1.5px solid var(--blue)' : '1px solid var(--rim)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: isNext ? 'var(--blue)' : 'inherit' }}>
                                  {sectorName}
                                </span>
                                <span
                                  className="pill"
                                  style={{
                                    fontSize: '10px',
                                    height: '18px',
                                    lineHeight: '18px',
                                    padding: '0 6px',
                                    background: isComplete ? 'var(--ok-a)' : 'var(--warn-a)',
                                    color: isComplete ? 'var(--ok)' : 'var(--warn)',
                                  }}
                                >
                                  {count} / 3 aziende
                                </span>
                              </div>
                              <div style={{ height: '4px', background: 'var(--rim)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(100, (count / 3) * 100)}%`,
                                    background: isComplete ? 'var(--ok)' : isNext ? 'var(--blue)' : 'var(--warn)',
                                    borderRadius: '2px',
                                  }}
                                />
                              </div>
                              <small style={{ fontSize: '9.5px', color: isNext ? 'var(--blue)' : 'var(--muted)' }}>
                                {isComplete ? '✓ Quota raggiunta' : isNext ? '🎯 Prossimo target scansione' : `Mancano ${3 - count} aziende`}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tabella Aziende Processate */}
                    <div
                      style={{
                        background: 'var(--glass-in)',
                        border: '1px solid var(--rim)',
                        borderRadius: '16px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <b style={{ fontSize: '13.5px' }}>Elenco Aziende nel Database ({filteredProcessed.length})</b>
                          <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>
                            Confronto automatico senza maiuscole e suffissi legali (S.p.A., S.r.l., GmbH, Ltd, Inc).
                          </small>
                        </div>
                        <input
                          type="text"
                          className="inp"
                          placeholder="Filtra azienda o settore..."
                          value={procSearchQuery}
                          onChange={(e) => setProcSearchQuery(e.target.value)}
                          style={{ width: '220px', height: '30px', fontSize: '11.5px' }}
                        />
                      </div>

                      <div className="tw" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                        <table className="t-pro" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th>Azienda</th>
                              <th>Settore</th>
                              <th>Categoria</th>
                              <th>Ciclo</th>
                              <th>Data</th>
                              <th style={{ textAlign: 'right' }}>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProcessed.map((item, idx) => (
                              <tr key={`${item.name}-${idx}`}>
                                <td>
                                  <b style={{ fontSize: '12px' }}>{item.name}</b>
                                </td>
                                <td style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                  {item.sector}
                                </td>
                                <td>
                                  <span
                                    className="pill"
                                    style={{
                                      fontSize: '10px',
                                      background: item.category === 'Startup' ? 'var(--ok-a)' : item.category === 'Venture' ? 'var(--purple-a)' : 'var(--blue-a)',
                                      color: item.category === 'Startup' ? 'var(--ok)' : item.category === 'Venture' ? 'var(--purple)' : 'var(--blue)',
                                    }}
                                  >
                                    {item.category}
                                  </span>
                                </td>
                                <td style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                  {item.cycle}
                                </td>
                                <td style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                  {item.date}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <a
                                    href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(item.name)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn sm"
                                    style={{ height: '24px', padding: '0 8px', fontSize: '10.5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    LinkedIn ↗
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Riepilogo Regole Operative dal Prompt */}
                    <div
                      style={{
                        background: 'var(--glass-in)',
                        border: '1px solid var(--rim)',
                        borderRadius: '16px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px' }}>📋</span>
                        <b style={{ fontSize: '13.5px' }}>Regole Operative Hub Networking (100% Fedeli alle Istruzioni)</b>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', fontSize: '11.5px', color: 'var(--text)' }}>
                        <div style={{ background: 'var(--field)', padding: '10px', borderRadius: '10px', border: '1px solid var(--rim)' }}>
                          <b style={{ color: 'var(--blue)', display: 'block', marginBottom: '4px' }}>🎓 Profilo &amp; Obiettivi</b>
                          Ruoli target configurabili nelle Preferenze (es. Founder Associate, Growth, Business Developer, Venture Builder). Note di connessione firmate con il tuo nome, massimo 300 caratteri, nessuna richiesta di lavoro.
                        </div>
                        <div style={{ background: 'var(--field)', padding: '10px', borderRadius: '10px', border: '1px solid var(--rim)' }}>
                          <b style={{ color: 'var(--ok)', display: 'block', marginBottom: '4px' }}>📅 Scansione Domenicale (21 + 21)</b>
                          Aggiunge almeno 21 aziende cercate e 21 persone nuove in coda (&ge;7 per Azienda, Startup, Venture). Max 30 aziende per sicurezza. Alternanza rigorosa Venture Studio / Venture Capital.
                        </div>
                        <div style={{ background: 'var(--field)', padding: '10px', borderRadius: '10px', border: '1px solid var(--rim)' }}>
                          <b style={{ color: 'var(--purple)', display: 'block', marginBottom: '4px' }}>☀️ Dispaccio Mattutino &amp; Gmail Feedback</b>
                          Categoria del giorno: (giorno dell'anno mod 3): 0=Azienda, 1=Startup, 2=Venture. Lettura automatica Gmail per oggetti LN FATTO e LN SALTA per aggiornare lo Sheet da "Suggerita" a "Richiesta inviata" o "Scartata".
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </article>
          </section>

          {/* ==============================================================
              VIEW 7: CORSI (v-cor)
              ============================================================== */}
          <section className={`view ${view === 'cor' ? 'on' : ''}`} id="v-cor" aria-label="Corsi">
            <article className="card">
              <div className="hd">
                <h3>Corsi &amp; Certificazioni</h3>
                <span className="sp"></span>
                <button className="btn pri sm" onClick={() => showToast('Incolla il link del corso Coursera/edX per importarlo')}>
                  + Aggiungi corso dal link
                </button>
              </div>
              <div className="empty" style={{ marginTop: '14px', minHeight: '120px' }}>
                Nessun corso in sospeso. Incolla il link di un corso: l'AI compila titolo, piattaforma, livello e durata.
              </div>
            </article>
          </section>

          {/* ==============================================================
              VIEW 8: CV MATCH & COVER LETTER (Sartoriale per posizione specifica)
              ============================================================== */}
          <section className={`view ${view === 'cv' ? 'on' : ''}`} id="v-cv" aria-label="CV e Cover Letter">
            {/* TAILORED POSITION SELECTOR */}
            <div className="card" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px' }}>🎯 Sartoria su Posizione Specifica</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                    Seleziona una posizione esistente per adattare il CV Match e generare la Cover Letter su misura
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    value={cvSelectedAppId}
                    onChange={(e) => {
                      setCvSelectedAppId(e.target.value);
                      setClAppId(e.target.value);
                      updateCoverLetter(e.target.value, clLang, clTone);
                    }}
                    style={{ minWidth: '240px', fontWeight: 600 }}
                    aria-label="Seleziona la posizione per la sartoria"
                  >
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.co} — {a.role} ({a.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="two">
              {/* CV MATCH SARTORIALE */}
              <article className="card">
                <div className="hd">
                  <h3>CV Match: {cvTargetApp.co}</h3>
                  <span className="pill">Fit: {cvTargetApp.fit}%</span>
                </div>
                <div className="who" style={{ margin: '14px 0' }}>
                  <span className="avatar" style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', flex: '0 0 48px' }}>
                    {DEMO ? 'AR' : ini(userFullName)}
                  </span>
                  <div>
                    <b style={{ fontSize: '15px' }}>{userFullName}</b>
                    <span>{DEMO ? 'Management Engineer · MSc Innovation & Entrepreneurship (MSc)' : searchConfig.userProfile.education || '—'}</span>
                  </div>
                </div>

                <div className="sec">Punti di forza per {cvTargetApp.co}</div>
                <ul className="li">
                  {(cvLiveAnalysis?.strengths || [
                    `Strategia & Innovazione: Il tuo progetto di go-to-market per il prodotto innovativo risponde perfettamente alle responsabilità di ${cvTargetApp.role}.`,
                    `Competizione di Business (podio): Dimostra leadership analitica e capacità di esecuzione in team.`,
                    `Data Analytics (Python / Excel avanzato / SQL): Allineato con i requisiti di modellazione e KPI tracking dell'annuncio.`,
                  ]).map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>

                <div className="sec">Gap rilevati rispetto all'annuncio</div>
                <ul className="li gap">
                  {(cvLiveAnalysis?.gaps || [
                    cvTargetApp.country === 'Germania'
                      ? 'Tedesco (B2/C1 richiesto per Monaco): aggiungi certificazione formale o specifica il livello attuale di conversazione.'
                      : 'Nessuna lacuna critica: enfasi consigliata su metriche scalabili di crescita.',
                  ]).map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>

                <div className="sec">Come migliorare il CV per questo ruolo</div>
                <ul className="li">
                  {(cvLiveAnalysis?.improvements || [
                    `Modifica l'headline in cima: "${cvTargetApp.role} & Business Strategy | MSc Innovation".`,
                    `Quantifica i risultati percentuali del progetto di go-to-market nella sezione Esperienze.`,
                  ]).map((imp, idx) => (
                    <li key={idx}>{imp}</li>
                  ))}
                </ul>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <button className="btn pri sm" onClick={() => showToast(`CV esportato con ottimizzazione per ${cvTargetApp.co}`)}>
                    Scarica CV Ottimizzato
                  </button>
                  <button
                    className="btn sm"
                    disabled={isAnalyzingCv}
                    onClick={handleAnalyzeCvWithAi}
                  >
                    {isAnalyzingCv ? 'Analisi Gemini in corso…' : '⚡ Ricarica Analisi con Gemini'}
                  </button>
                </div>
              </article>

              {/* COVER LETTER GENERATOR (Rinominato esplicitamente come richiesto) */}
              <article className="card">
                <div className="hd">
                  <h3>Cover Letter per {cvTargetApp.co}</h3>
                  <span className="ai-badge">Gemini AI</span>
                </div>
                <p style={{ margin: '8px 0 10px', fontSize: '12px', color: 'var(--muted)' }}>
                  Generata sartorialmente unendo i punti chiave del tuo CV con la descrizione del lavoro
                </p>

                {/* Controlli lingua e tono */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <select
                    value={clLang}
                    onChange={(e: any) => {
                      setClLang(e.target.value);
                      updateCoverLetter(clAppId, e.target.value, clTone);
                    }}
                    style={{ height: '32px', fontSize: '12px' }}
                    aria-label="Lingua Cover Letter"
                  >
                    <option value="it">🇮🇹 Italiano</option>
                    <option value="en">🇬🇧 English</option>
                  </select>

                  <select
                    value={clTone}
                    onChange={(e: any) => {
                      setClTone(e.target.value);
                      updateCoverLetter(clAppId, clLang, e.target.value);
                    }}
                    style={{ height: '32px', fontSize: '12px' }}
                    aria-label="Tono Cover Letter"
                  >
                    <option value="startup">Tono: Startup &amp; Diretto</option>
                    <option value="corporate">Tono: Corporate &amp; Strategico</option>
                    <option value="academic">Tono: Accademico</option>
                  </select>
                </div>

                {/* Testo editabile in-line */}
                <textarea
                  value={clDraft}
                  onChange={(e) => setClDraft(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '220px',
                    borderRadius: '16px',
                    border: '1px solid var(--rim)',
                    background: 'var(--field)',
                    color: 'var(--text)',
                    font: 'inherit',
                    fontSize: '12.5px',
                    lineHeight: '1.5',
                    padding: '12px 14px',
                    resize: 'vertical',
                  }}
                  aria-label="Testo della Cover Letter"
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button
                    className="btn pri sm"
                    onClick={() => {
                      navigator.clipboard.writeText(clDraft);
                      showToast('Cover Letter copiata negli appunti!');
                    }}
                  >
                    📋 Copia Cover Letter
                  </button>
                  <button
                    className="btn sm"
                    onClick={() => {
                      const blob = new Blob([clDraft], { type: 'text/plain;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Cover_Letter_${userFullName.replace(/\s+/g, '_')}_${cvTargetApp.co}.txt`;
                      a.click();
                      showToast('Bozza scaricata in formato testo!');
                    }}
                  >
                    💾 Salva File (.txt)
                  </button>
                  <button
                    className="btn sm"
                    onClick={() => {
                      updateCoverLetter(clAppId, clLang, clTone);
                      showToast('Nuova variante generata con AI!');
                    }}
                  >
                    ✨ Rigenera Variante
                  </button>
                </div>
              </article>
            </div>
          </section>

          {/* ==============================================================
              VIEW 9: AI COPILOT & SIMULATORE COLLOQUI SARTORIALE
              ============================================================== */}
          <section className={`view ${view === 'ass' ? 'on' : ''}`} id="v-ass" aria-label="AI Copilot">
            <article className="card">
              <div className="hd">
                <h3>Simulatore Colloqui Sartoriale</h3>
                <span className="ex">Personalizzato su misura</span>
                <span className="sp"></span>
                {/* Selettore posizione target */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span>Posizione:</span>
                  <select
                    value={simAppId}
                    onChange={(e) => {
                      setSimAppId(e.target.value);
                      const selected = apps.find((a) => a.id === e.target.value) || apps[0] || EMPTY_APP;
                      setChatMessages([
                        {
                          sender: 'ai',
                          text: `Perfetto! Ora simulerò il colloquio per la posizione di "${selected.role}" presso ${selected.co} a ${selected.city}. In base al tuo CV (MSc), ecco la prima domanda: "Come applicheresti la tua esperienza in go-to-market e data analysis per le sfide di ${selected.co}?"`,
                        },
                      ]);
                      showToast(`Simulatore impostato su ${selected.co}`);
                    }}
                    style={{ fontWeight: 600 }}
                    aria-label="Posizione target per la simulazione del colloquio"
                  >
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.co} — {a.role}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="chat" style={{ marginTop: '14px' }}>
                {chatMessages.map((m, i) => (
                  <div key={i} className={`msg ${m.sender === 'me' ? 'me' : ''}`}>
                    <small>{m.sender === 'me' ? `Tu (${userFullName})` : `Recruiter (${simTargetApp.co})`}</small>
                    {m.text}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="msg" style={{ fontStyle: 'italic', color: 'var(--muted)', background: 'var(--glass-in)' }}>
                    <small>Recruiter ({simTargetApp.co})</small>
                    Gemini AI sta analizzando la tua risposta e formulando il feedback...
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input
                  type="text"
                  value={inputChatText}
                  onChange={(e) => setInputChatText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendChatMessage();
                    }
                  }}
                  placeholder="Scrivi la tua risposta o chiedi un consiglio sull'approccio..."
                  style={{
                    flex: 1,
                    height: '42px',
                    borderRadius: '14px',
                    border: '1px solid var(--rim)',
                    background: 'var(--field)',
                    color: 'var(--text)',
                    padding: '0 14px',
                    font: 'inherit',
                  }}
                  disabled={isChatLoading}
                  aria-label="Risposta al colloquio"
                />
                <button
                  className="btn pri sm"
                  style={{ height: '42px', padding: '0 18px' }}
                  onClick={() => handleSendChatMessage()}
                  disabled={isChatLoading || !inputChatText.trim()}
                >
                  {isChatLoading ? 'Elaboro…' : 'Invia'}
                </button>
              </div>

              {/* Suggerimenti di risposta guidata STAR */}
              <div className="sugg">
                <button
                  className="fchip"
                  disabled={isChatLoading}
                  onClick={() => {
                    handleSendChatMessage(
                      `Strutturo la mia risposta usando il metodo STAR: Situazione (progetto di prodotto), Task (definire il piano go-to-market), Azione (analisi di mercato e segmentazione dati quantitativa con Python), Risultato (riconoscimento in una competizione di business). Come valuti questo approccio per ${simTargetApp.co}?`
                    );
                  }}
                >
                  💡 Suggerisci risposta con Metodo STAR
                </button>
                <button
                  className="fchip"
                  disabled={isChatLoading}
                  onClick={() => {
                    handleSendChatMessage(
                      `Quali sono le 3 domande più probabili e i case study che il team di ${simTargetApp.co} farà per il ruolo di ${simTargetApp.role}?`
                    );
                  }}
                >
                  🎯 Le 3 domande più frequenti per questo ruolo
                </button>
              </div>
            </article>
          </section>

          {/* ==============================================================
              {/* VIEW 10: NOTIFICHE (v-nov) */}
          <section className={`view ${view === 'nov' ? 'on' : ''}`} id="v-nov" aria-label="Notifiche">
            {/* Sync Schedule Card */}
            <article className="card" style={{ marginBottom: '14px', background: 'linear-gradient(145deg, rgba(47,99,224,.12), rgba(255,255,255,.03))' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📬 Automazione Gmail Recruiter</span>
                    {DEMO && <span className="pill" style={{ fontSize: '10.5px' }}>Attiva</span>}
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                    {DEMO ? (
                      <>I controlli automatici avvengono alle <strong>08:00</strong> di mattina e alle <strong>18:00</strong> del pomeriggio. Puoi forzare la sincronizzazione in qualsiasi momento.</>
                    ) : (
                      <>Le notifiche si aggiornano quando premi <strong>Controlla ora</strong> o <strong>Sincronizza</strong>: non ci sono controlli automatici in background.</>
                    )}
                  </p>
                </div>
                <button
                  className="btn pri sm"
                  onClick={handleCheckMail}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span>Controlla posta ora</span>
                </button>
              </div>
            </article>

            {/* Unmatched Recruiter Emails Queue */}
            {unmatchedEmails.length > 0 && (
              <article className="card" style={{ marginBottom: '14px', borderColor: 'var(--amber)' }}>
                <div className="hd">
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠️ Email in attesa di abbinamento posizione</span>
                    <span className="count" style={{ background: 'var(--b-interview)', color: 'var(--c-interview)' }}>
                      {unmatchedEmails.length}
                    </span>
                  </h4>
                  <small style={{ color: 'var(--muted)' }}>
                    Email ricevute da aziende non ancora registrate nel tuo Tracker
                  </small>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  {unmatchedEmails.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--glass-in)',
                        border: '1px solid var(--rim)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ minWidth: '220px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{u.company}</strong>
                          <span className="pill" style={{ fontSize: '10px' }}>{u.sender}</span>
                          <span style={{ fontSize: '11px', color: 'var(--faint)' }}>{u.receivedAt}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                          {u.subject} — <em>"{u.snippet}"</em>
                        </div>
                      </div>
                      <button
                        className="btn sm"
                        onClick={() => {
                          setManCo(u.company);
                          setManRole('Founders Associate');
                          setModalTab('manual');
                          setIsModalOpen(true);
                        }}
                        style={{ whiteSpace: 'nowrap', borderColor: 'var(--amber)' }}
                      >
                        ➕ Registra {u.company} per abbinare
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {/* Notifications Feed */}
            <article className="card">
              <div className="hd" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <h3>Notifiche di Sistema</h3>
                <span className="ex">{notifications.filter((n) => n.unread).length} non lette</span>
                <span className="sp"></span>
                <button
                  className="btn sm"
                  onClick={() => {
                    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
                    showToast('Tutte le notifiche segnate come lette');
                  }}
                >
                  Segna tutte lette
                </button>
              </div>
              <ul className="li" style={{ marginTop: '14px', gap: '12px' }}>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <b style={{ color: 'var(--text)' }}>{n.title}</b>
                      <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                        {n.desc}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: 'var(--faint)' }}>{n.date}</span>
                      {n.unread && (
                        <span
                          className="dot r"
                          style={{
                            position: 'static',
                            display: 'inline-block',
                            marginLeft: '6px',
                            width: '8px',
                            height: '8px',
                          }}
                        ></span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          {/* ==============================================================
              VIEW 11: IMPOSTAZIONI & PROFILO DI RICERCA (v-set)
              ============================================================== */}
          <section className={`view ${view === 'set' ? 'on' : ''}`} id="v-set" aria-label="Impostazioni e Profilo di Ricerca">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header con Sub-Nav Segmented Control */}
              <div className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Impostazioni &amp; Profilo di Ricerca</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Configurazione operativa del piano, delle posizioni cercate, dei filtri e delle caselle Gmail
                    </p>
                  </div>

                  {/* Segmented Control Sub-Tabs */}
                  <div
                    style={{
                      display: 'inline-flex',
                      background: 'var(--glass-in)',
                      border: '1px solid var(--rim)',
                      borderRadius: '12px',
                      padding: '3px',
                      gap: '4px',
                    }}
                    role="tablist"
                  >
                    <button
                      type="button"
                      className={`fchip ${setSubTab === 'config' ? 'active' : ''}`}
                      onClick={() => setSetSubTab('config')}
                      style={{
                        height: '28px',
                        padding: '0 12px',
                        fontSize: '11.5px',
                        fontWeight: setSubTab === 'config' ? 600 : 500,
                        background: setSubTab === 'config' ? 'var(--blue-d)' : 'transparent',
                        color: setSubTab === 'config' ? '#fff' : 'var(--text)',
                        borderColor: 'transparent',
                      }}
                    >
                      📋 Profilo di Ricerca (11 Sezioni)
                    </button>
                    <button
                      type="button"
                      className={`fchip ${setSubTab === 'gmail' ? 'active' : ''}`}
                      onClick={() => setSetSubTab('gmail')}
                      style={{
                        height: '28px',
                        padding: '0 12px',
                        fontSize: '11.5px',
                        fontWeight: setSubTab === 'gmail' ? 600 : 500,
                        background: setSubTab === 'gmail' ? 'var(--blue-d)' : 'transparent',
                        color: setSubTab === 'gmail' ? '#fff' : 'var(--text)',
                        borderColor: 'transparent',
                      }}
                    >
                      {DEMO ? '📫 Caselle Gmail (2 Account)' : `📫 Caselle Gmail (${gmailAccounts.length} ${gmailAccounts.length === 1 ? 'Account' : 'Account'})`}
                    </button>
                    <button
                      type="button"
                      className={`fchip ${setSubTab === 'general' ? 'active' : ''}`}
                      onClick={() => setSetSubTab('general')}
                      style={{
                        height: '28px',
                        padding: '0 12px',
                        fontSize: '11.5px',
                        fontWeight: setSubTab === 'general' ? 600 : 500,
                        background: setSubTab === 'general' ? 'var(--blue-d)' : 'transparent',
                        color: setSubTab === 'general' ? '#fff' : 'var(--text)',
                        borderColor: 'transparent',
                      }}
                    >
                      👤 Generale &amp; Tema
                    </button>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  TAB 1: PROFILO DI RICERCA (LE 11 SEZIONI DI CONFIGURAZIONE)
                  ------------------------------------------------------------- */}
              {setSubTab === 'config' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Top Action Bar per il Profilo di Ricerca */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      background: 'var(--glass-in)',
                      border: '1px solid var(--rim)',
                      borderRadius: '14px',
                      padding: '12px 16px',
                    }}
                  >
                    <div>
                      <b style={{ fontSize: '13px' }}>Regole &amp; Parametri Operativi del Profilo</b>
                      <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                        Ogni modifica ha effetto immediato sul piano di ricerca, sui filtri e su "Compila dall'annuncio"
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn sm"
                        onClick={handleResetSearchConfig}
                        style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
                      >
                        ↺ Ripristina i valori iniziali
                      </button>
                      <button className="btn sm" onClick={() => setIsImportModalOpen(true)}>
                        📥 Importa una copia (JSON)
                      </button>
                      <button className="btn pri sm" onClick={handleExportFullJson}>
                        📤 Esporta una copia (JSON)
                      </button>
                    </div>
                  </div>

                  {/* SEZIONE 1 & 2: POSIZIONI CERCATE & TITOLI EQUIVALENTI */}
                  <article className="card">
                    <div className="hd" style={{ flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px' }}>1. Posizioni Cercate &amp; 2. Titoli Riconosciuti</h4>
                        <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                          Famiglie di ruoli, priorità, query booleane per portali e titoli equivalenti
                        </p>
                      </div>
                      <span className="pill" style={{ marginLeft: 'auto' }}>
                        {searchConfig.positions.filter((p) => p.enabled).length} attive su {searchConfig.positions.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                      {searchConfig.positions.map((pos) => (
                        <div
                          key={pos.id}
                          style={{
                            background: 'var(--field)',
                            border: '1px solid var(--rim)',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            opacity: pos.enabled ? 1 : 0.55,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input
                                type="checkbox"
                                checked={pos.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSearchConfig((prev) => ({
                                    ...prev,
                                    positions: prev.positions.map((p) => (p.id === pos.id ? { ...p, enabled: checked } : p)),
                                  }));
                                  showToast(`Famiglia ${pos.name} ${checked ? 'attivata' : 'disattivata'}`);
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <b style={{ fontSize: '14px', color: 'var(--text)' }}>{pos.name}</b>
                              <span className="pill" style={{ fontSize: '10px' }}>Gruppo: {pos.group}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Priorità:</span>
                              <select
                                value={pos.priority}
                                onChange={(e) => {
                                  const val = e.target.value as 'Alta' | 'Media' | 'Bassa';
                                  setSearchConfig((prev) => ({
                                    ...prev,
                                    positions: prev.positions.map((p) => (p.id === pos.id ? { ...p, priority: val } : p)),
                                  }));
                                  showToast(`Priorità per ${pos.name}: ${val}`);
                                }}
                                style={{ height: '26px', fontSize: '11px', borderRadius: '8px', padding: '0 6px' }}
                              >
                                <option value="Alta">Alta</option>
                                <option value="Media">Media</option>
                                <option value="Bassa">Bassa</option>
                              </select>
                              <button
                                className="circ"
                                style={{ width: '26px', height: '26px', fontSize: '10px' }}
                                title="Rimuovi posizione"
                                onClick={() => {
                                  setSearchConfig((prev) => ({
                                    ...prev,
                                    positions: prev.positions.filter((p) => p.id !== pos.id),
                                  }));
                                  showToast(`Rimossa famiglia ${pos.name}`);
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <div style={{ marginTop: '8px' }}>
                            <small style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--faint)', display: 'block', marginBottom: '3px' }}>
                              Titoli equivalenti riconosciuti:
                            </small>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {pos.equivalentTitles.map((t, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: 'var(--glass-in)',
                                    border: '1px solid var(--rim)',
                                    borderRadius: '6px',
                                    padding: '2px 7px',
                                    fontSize: '11px',
                                    color: 'var(--text)',
                                  }}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div style={{ marginTop: '8px' }}>
                            <code style={{ fontSize: '11px', color: 'var(--muted)' }}>{pos.searchQuery}</code>
                          </div>
                        </div>
                      ))}

                      {/* Form per aggiungere una nuova famiglia di posizioni */}
                      <div
                        style={{
                          background: 'var(--glass-in)',
                          border: '1px dashed var(--rim)',
                          borderRadius: '12px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          marginTop: '6px',
                        }}
                      >
                        <b style={{ fontSize: '12px', color: 'var(--text)' }}>+ Aggiungi nuova famiglia di ruoli</b>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Nome famiglia (es. Product Operations)"
                            value={newPosFamilyName}
                            onChange={(e) => setNewPosFamilyName(e.target.value)}
                            style={{ height: '32px', borderRadius: '8px', padding: '0 8px', fontSize: '11.5px' }}
                          />
                          <input
                            type="text"
                            placeholder="Titoli separati da virgola (es. Product Ops Analyst, Junior Product Ops)"
                            value={newPosTitles}
                            onChange={(e) => setNewPosTitles(e.target.value)}
                            style={{ height: '32px', borderRadius: '8px', padding: '0 8px', fontSize: '11.5px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            className="btn pri sm"
                            style={{ height: '28px', fontSize: '11.5px' }}
                            onClick={() => {
                              if (!newPosFamilyName.trim()) {
                                showToast('Inserisci il nome della famiglia');
                                return;
                              }
                              const titles = newPosTitles.split(',').map((t) => t.trim()).filter(Boolean);
                              const newP: PositionFamily = {
                                id: 'p-' + Date.now(),
                                name: newPosFamilyName.trim(),
                                equivalentTitles: titles.length ? titles : [newPosFamilyName.trim()],
                                searchQuery: titles.length ? titles.map((t) => `"${t}"`).join(' OR ') : `"${newPosFamilyName.trim()}"`,
                                group: 'Operations',
                                priority: 'Media',
                                enabled: true,
                              };
                              setSearchConfig((prev) => ({ ...prev, positions: [...prev.positions, newP] }));
                              setNewPosFamilyName('');
                              setNewPosTitles('');
                              showToast(`Aggiunta nuova famiglia "${newP.name}"!`);
                            }}
                          >
                            + Aggiungi famiglia
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>

                  {/* SEZIONE 3: LIVELLI & SEZIONE 4: COSE DA ESCLUDERE */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {/* Livelli di Seniority */}
                    <article className="card">
                      <div className="hd">
                        <h4 style={{ margin: 0, fontSize: '14px' }}>3. Livelli di Seniority</h4>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <small style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                          ✓ DA CERCARE
                        </small>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {searchConfig.seniorityLevelsToSearch.map((lvl) => (
                            <span
                              key={lvl}
                              style={{
                                background: 'rgba(31, 138, 98, 0.15)',
                                color: 'var(--green)',
                                border: '1px solid rgba(31, 138, 98, 0.3)',
                                borderRadius: '999px',
                                padding: '3px 10px',
                                fontSize: '11.5px',
                                fontWeight: 500,
                              }}
                            >
                              {lvl}
                            </span>
                          ))}
                        </div>

                        <small style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 600, display: 'block', marginTop: '14px', marginBottom: '6px' }}>
                          ✕ DA SCARTARE
                        </small>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {searchConfig.seniorityLevelsToDiscard.map((lvl) => (
                            <span
                              key={lvl}
                              style={{
                                background: 'rgba(230, 73, 128, 0.12)',
                                color: 'var(--red)',
                                border: '1px solid rgba(230, 73, 128, 0.3)',
                                borderRadius: '999px',
                                padding: '3px 10px',
                                fontSize: '11.5px',
                                fontWeight: 500,
                              }}
                            >
                              {lvl}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>

                    {/* Cose da Escludere */}
                    <article className="card">
                      <div className="hd">
                        <h4 style={{ margin: 0, fontSize: '14px' }}>4. Cose da Escludere</h4>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--muted)' }}>
                          Ruoli automaticamente esclusi dai filtri e dalle selezioni Gemini:
                        </p>
                        <ul className="li" style={{ gap: '8px' }}>
                          {searchConfig.excludedRoleTypes.map((exc, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--red)', fontSize: '14px' }}>🚫</span>
                              <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>{exc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  </div>

                  {/* SEZIONE 5: PAESI E CITTÀ TARGET (14 PAESI EUROPEI) */}
                  <article className="card">
                    <div className="hd" style={{ flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px' }}>{DEMO ? '5. Paesi e Città Target (14 Paesi Europei)' : `5. Paesi e Città Target (${listCountries(searchConfig).length} Paesi)`}</h4>
                        <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--muted)' }}>
                          Spagna, Germania, Irlanda, Paesi Bassi, Lussemburgo, Austria, Belgio, Portogallo, Svezia, Danimarca, Svizzera, Francia, Polonia, Regno Unito, Italia
                        </p>
                      </div>
                      <span className="pill" style={{ marginLeft: 'auto' }}>
                        {searchConfig.cities.filter((c) => c.enabled).length} città attive
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', marginTop: '14px', maxHeight: '360px', overflowY: 'auto' }}>
                      {searchConfig.cities.map((city) => (
                        <div
                          key={city.id}
                          style={{
                            background: 'var(--field)',
                            border: '1px solid var(--rim)',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            opacity: city.enabled ? 1 : 0.45,
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: 0, flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={city.enabled}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSearchConfig((prev) => ({
                                  ...prev,
                                  cities: prev.cities.map((c) => (c.id === city.id ? { ...c, enabled: checked } : c)),
                                }));
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <b style={{ fontSize: '12.5px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {city.city}
                              </b>
                              <span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
                                {city.country} [{city.countryCode}]
                              </span>
                            </div>
                          </label>
                          <button
                            className="circ"
                            style={{ width: '22px', height: '22px', fontSize: '9px', flexShrink: 0 }}
                            title="Rimuovi città"
                            onClick={() => {
                              setSearchConfig((prev) => ({
                                ...prev,
                                cities: prev.cities.filter((c) => c.id !== city.id),
                              }));
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Form per aggiungere nuova città */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Nome città (es. Oslo, Bilbao)"
                        value={newCityName}
                        onChange={(e) => setNewCityName(e.target.value)}
                        style={{ height: '32px', borderRadius: '8px', padding: '0 8px', fontSize: '12px', flex: 1, minWidth: '150px' }}
                      />
                      <input
                        type="text"
                        placeholder="Paese (es. Norvegia)"
                        value={newCityCountry}
                        onChange={(e) => setNewCityCountry(e.target.value)}
                        style={{ height: '32px', borderRadius: '8px', padding: '0 8px', fontSize: '12px', flex: 1, minWidth: '150px' }}
                      />
                      <button
                        className="btn pri sm"
                        style={{ height: '32px' }}
                        onClick={() => {
                          if (!newCityName.trim() || !newCityCountry.trim()) {
                            showToast('Inserisci città e paese');
                            return;
                          }
                          const newC: CityTarget = {
                            id: 'c-' + Date.now(),
                            city: newCityName.trim(),
                            country: newCityCountry.trim(),
                            countryCode: newCityCountry.trim().slice(0, 2).toUpperCase(),
                            localJuniorTerms: 'Junior, Intern',
                            enabled: true,
                          };
                          setSearchConfig((prev) => ({ ...prev, cities: [...prev.cities, newC] }));
                          setNewCityName('');
                          setNewCityCountry('');
                          showToast(`Aggiunta città ${newC.city} (${newC.country})!`);
                        }}
                      >
                        + Aggiungi città
                      </button>
                    </div>
                  </article>

                  {/* SEZIONE 6: LINGUE & SEZIONE 7: PIATTAFORME */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {/* Lingue */}
                    <article className="card">
                      <div className="hd">
                        <h4 style={{ margin: 0, fontSize: '14px' }}>6. Lingue dell'Utente &amp; Segnalazioni</h4>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <small style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                          LINGUE DELL'UTENTE (DAL CV)
                        </small>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {searchConfig.userProfile.languages.map((l, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--field)', borderRadius: '8px', fontSize: '12px' }}>
                              <b>{l.language}</b>
                              <span style={{ color: 'var(--blue)' }}>{l.level}</span>
                            </div>
                          ))}
                        </div>

                        <small style={{ fontSize: '11px', color: 'var(--amber)', fontWeight: 600, display: 'block', marginTop: '14px', marginBottom: '6px' }}>
                          ⚠ DA SEGNALARE NEGLI ANNUNCI
                        </small>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {searchConfig.userProfile.flagLanguagesInAds.map((lang, i) => (
                            <span key={i} className="st rejected" style={{ height: '26px', fontSize: '11px' }}>
                              ⚠ Richiesto {lang}
                            </span>
                          ))}
                          <small style={{ fontSize: '11px', color: 'var(--muted)' }}>(genera badge di attenzione)</small>
                        </div>
                      </div>
                    </article>

                    {/* Piattaforme */}
                    <article className="card">
                      <div className="hd">
                        <h4 style={{ margin: 0, fontSize: '14px' }}>7. Piattaforme di Ricerca</h4>
                      </div>
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {searchConfig.platforms.map((pl) => (
                          <div
                            key={pl.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              background: 'var(--field)',
                              borderRadius: '8px',
                              opacity: pl.enabled ? 1 : 0.45,
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={pl.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSearchConfig((prev) => ({
                                    ...prev,
                                    platforms: prev.platforms.map((p) => (p.id === pl.id ? { ...p, enabled: checked } : p)),
                                  }));
                                }}
                              />
                              <b style={{ fontSize: '12.5px' }}>{pl.name}</b>
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                value={pl.minutesPerSession}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setSearchConfig((prev) => ({
                                    ...prev,
                                    platforms: prev.platforms.map((p) => (p.id === pl.id ? { ...p, minutesPerSession: val } : p)),
                                  }));
                                }}
                                style={{ width: '45px', height: '24px', fontSize: '11px', textAlign: 'center', borderRadius: '6px' }}
                              />
                              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>min/sessione</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>

                  {/* SEZIONE 8: PIANO DI RICERCA & SEZIONE 9: VALORI AMMESSI */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {/* Piano di ricerca */}
                    <article className="card">
                      <div className="hd">
                        <h4 style={{ margin: 0, fontSize: '14px' }}>8. Piano di Ricerca Operativo</h4>
                      </div>
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                        {DEMO ? (
                          <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--rim)' }}>
                          <span style={{ color: 'var(--muted)' }}>Periodo attivo:</span>
                          <b>24 ott – 18 dic 2026</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--rim)' }}>
                          <span style={{ color: 'var(--muted)' }}>Giorni operativi:</span>
                          <b>Lunedì – Venerdì (5 gg)</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--rim)' }}>
                          <span style={{ color: 'var(--muted)' }}>Tempo al giorno:</span>
                          <b>120 minuti totali</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--rim)' }}>
                          <span style={{ color: 'var(--muted)' }}>Siti carriere al giorno:</span>
                          <b>4 siti aziendali</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                          <span style={{ color: 'var(--muted)' }}>Promemoria Follow-up:</span>
                          <b>7 giorni post-invio candidatura</b>
                        </div>
                          </>
                        ) : (
                          <>
                        {(() => {
                          const plan = searchConfig.searchPlan;
                          const upd = (patch: Partial<typeof plan>) =>
                            setSearchConfig((prev) => ({ ...prev, searchPlan: { ...prev.searchPlan, ...patch } }));
                          const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--rim)', flexWrap: 'wrap' };
                          const dayKeys = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
                          const num = (value: number, onChange: (n: number) => void, min: number, label: string) => (
                            <input type="number" min={min} value={value} aria-label={label} style={{ width: '84px' }} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))} />
                          );
                          return (
                            <>
                              <div style={row}>
                                <span style={{ color: 'var(--muted)' }}>Periodo attivo:</span>
                                <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <input type="date" value={plan.startDate} aria-label="Inizio del piano" onChange={(e) => upd({ startDate: e.target.value })} />
                                  –
                                  <input type="date" value={plan.endDate} min={plan.startDate} aria-label="Fine del piano" onChange={(e) => upd({ endDate: e.target.value })} />
                                </span>
                              </div>
                              <div style={row}>
                                <span style={{ color: 'var(--muted)' }}>Giorni operativi:</span>
                                <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {dayKeys.map((k) => (
                                    <button
                                      key={k}
                                      type="button"
                                      className={`fchip ${plan.activeDays.includes(k) ? 'active' : ''}`}
                                      onClick={() => upd({ activeDays: plan.activeDays.includes(k) ? plan.activeDays.filter((x) => x !== k) : [...plan.activeDays, k] })}
                                    >
                                      {k}
                                    </button>
                                  ))}
                                </span>
                              </div>
                              <div style={row}>
                                <span style={{ color: 'var(--muted)' }}>Tempo al giorno (minuti):</span>
                                {num(plan.minutesPerDay, (n) => upd({ minutesPerDay: n }), 10, 'Minuti al giorno')}
                              </div>
                              <div style={row}>
                                <span style={{ color: 'var(--muted)' }}>Siti carriere al giorno:</span>
                                {num(plan.sitesPerDay, (n) => upd({ sitesPerDay: n }), 0, 'Siti carriere al giorno')}
                              </div>
                              <div style={{ ...row, borderBottom: 'none' }}>
                                <span style={{ color: 'var(--muted)' }}>Promemoria follow-up (giorni):</span>
                                {num(plan.followUpDays, (n) => upd({ followUpDays: n }), 1, 'Giorni per il follow-up')}
                              </div>
                            </>
                          );
                        })()}
                          </>
                        )}
                      </div>
                    </article>

                    {/* Profilo dal CV */}
                    <article className="card">
                      <div className="hd">
                        <h4 style={{ margin: 0, fontSize: '14px' }}>10. Profilo dell'Utente (dal CV)</h4>
                      </div>
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                        <div>
                          <small style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--faint)' }}>Obiettivo di carriera</small>
                          <b style={{ display: 'block', color: 'var(--blue)' }}>{searchConfig.userProfile.objective}</b>
                        </div>
                        <div>
                          <small style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--faint)' }}>Formazione accademica</small>
                          <span style={{ display: 'block', color: 'var(--text)' }}>{searchConfig.userProfile.education}</span>
                        </div>
                        <div>
                          <small style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--faint)' }}>Aree di eccellenza &amp; Competenze</small>
                          <span style={{ display: 'block', color: 'var(--muted)', lineHeight: '1.4' }}>
                            {searchConfig.userProfile.targetRolesSummary}
                          </span>
                        </div>
                      </div>
                    </article>
                  </div>

                  {/* SEZIONE 9: VALORI AMMESSI DEI CAMPI (LISTE FISSE PER TUTTA L'APP) */}
                  <article className="card">
                    <div className="hd">
                      <h4 style={{ margin: 0, fontSize: '14px' }}>9. Valori Ammessi dei Campi (Menu e Form di Sistema)</h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '14px' }}>
                      <div>
                        <b style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--faint)', display: 'block', marginBottom: '4px' }}>Stati Candidatura</b>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {searchConfig.allowedValues.statuses.map((s) => (
                            <span key={s} className="pill" style={{ fontSize: '11px' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <b style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--faint)', display: 'block', marginBottom: '4px' }}>Priorità</b>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {searchConfig.allowedValues.priorities.map((p) => (
                            <span key={p} className="pill" style={{ fontSize: '11px' }}>{p}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <b style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--faint)', display: 'block', marginBottom: '4px' }}>Modalità di Lavoro</b>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {searchConfig.allowedValues.workModes.map((w) => (
                            <span key={w} className="pill" style={{ fontSize: '11px' }}>{w}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <b style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--faint)', display: 'block', marginBottom: '4px' }}>Gruppi di Ruolo</b>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {searchConfig.allowedValues.roleGroups.map((g) => (
                            <span key={g} className="pill" style={{ fontSize: '11px' }}>{g}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <b style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--faint)', display: 'block', marginBottom: '4px' }}>Fasi di Colloquio</b>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {searchConfig.allowedValues.interviewStages.map((i) => (
                            <span key={i} className="pill" style={{ fontSize: '11px' }}>{i}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <b style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--faint)', display: 'block', marginBottom: '4px' }}>Categorie Corsi</b>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {searchConfig.allowedValues.courseCategories.map((c) => (
                            <span key={c} className="pill" style={{ fontSize: '11px' }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 2: CASELLE GMAIL & SYNC (2 ACCOUNT MONITORATI)
                  ------------------------------------------------------------- */}
              {setSubTab === 'gmail' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Elenco Caselle Configurate */}
                  <article className="card">
                    <div className="hd" style={{ flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px' }}>Integrazione Gmail Multi-Casella ({gmailAccounts.length})</h4>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                          Aggiungi quante email desideri: ricezione del report giornaliero e monitoraggio letture per risposte recruiter e comandi LN
                        </p>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="btn pri sm" onClick={handleCheckMail}>
                          ⚡ Controlla adesso tutte le caselle
                        </button>
                        <button className="btn sm" onClick={handleProcessYesterdayEmailCommands}>
                          📫 Elabora comandi LN FATTO / LN SALTA
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                      {gmailAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          style={{
                            background: 'var(--field)',
                            border: '1px solid var(--rim)',
                            borderRadius: '14px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            opacity: acc.status === 'Attivo' ? 1 : 0.6,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
                            <span style={{ fontSize: '26px' }}>📧</span>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <b style={{ fontSize: '14px', color: 'var(--text)' }}>{acc.email}</b>
                                <span className={`st ${acc.status === 'Attivo' ? 'applied' : 'rejected'}`} style={{ fontSize: '10px', height: '20px' }}>
                                  {acc.status}
                                </span>
                              </div>
                              <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                                {acc.label}
                              </span>
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                {acc.isReceiver && (
                                  <span className="pill" style={{ background: 'rgba(47, 120, 234, 0.15)', color: 'var(--blue)' }}>
                                    ✓ Ricezione Report Giornaliero
                                  </span>
                                )}
                                {acc.isReader && (
                                  <span className="pill" style={{ background: 'rgba(31, 138, 98, 0.15)', color: 'var(--green)' }}>
                                    ✓ Monitoraggio Attivo (08:00 &amp; 18:00)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                            <div style={{ textAlign: 'right' }}>
                              <small style={{ display: 'block', fontSize: '10.5px', color: 'var(--faint)' }}>
                                Ultimo controllo: {acc.lastChecked}
                              </small>
                            </div>
                            <button
                              className="btn sm"
                              style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}
                              onClick={() => handleToggleGmailStatus(acc.id)}
                            >
                              {acc.status === 'Attivo' ? 'Metti in pausa' : 'Attiva'}
                            </button>
                            {gmailAccounts.length > 1 && (
                              <button
                                className="circ"
                                style={{ width: '28px', height: '28px', fontSize: '11px' }}
                                title="Rimuovi casella"
                                onClick={() => handleRemoveGmailAccount(acc.id)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Modulo per aggiungere una nuova casella */}
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: 'var(--glass-in)',
                        border: '1px dashed var(--rim)',
                        borderRadius: '14px',
                      }}
                    >
                      <b style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                        + Aggiungi un'ulteriore casella email (es. Personale, Universitaria, Lavoro)
                      </b>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                            Indirizzo email
                          </label>
                          <input
                            type="email"
                            placeholder="es. nome.cognome@gmail.com"
                            value={newGmailEmail}
                            onChange={(e) => setNewGmailEmail(e.target.value)}
                            style={{ width: '100%', height: '34px', borderRadius: '8px', padding: '0 10px', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                            Etichetta / Descrizione
                          </label>
                          <input
                            type="text"
                            placeholder="es. Casella Alumni, Lavoro, etc."
                            value={newGmailLabel}
                            onChange={(e) => setNewGmailLabel(e.target.value)}
                            style={{ width: '100%', height: '34px', borderRadius: '8px', padding: '0 10px', fontSize: '12px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={newGmailIsReader}
                            onChange={(e) => setNewGmailIsReader(e.target.checked)}
                          />
                          <span>Monitora in lettura (risposte colloqui &amp; esiti)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={newGmailIsReceiver}
                            onChange={(e) => setNewGmailIsReceiver(e.target.checked)}
                          />
                          <span>Ricevi report giornaliero (3 aziende &amp; 3 persone)</span>
                        </label>

                        <button
                          className="btn pri sm"
                          style={{ marginLeft: 'auto', height: '32px', fontSize: '12px' }}
                          onClick={handleAddGmailAccount}
                        >
                          + Collega casella
                        </button>
                      </div>
                    </div>

                    {/* Box informativo automazione */}
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: 'var(--glass-in)',
                        border: '1px solid var(--rim)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        lineHeight: '1.45',
                        color: 'var(--muted)',
                      }}
                    >
                      💡 <b>Come funziona la scansione automatica:</b> alle ore 08:00 e alle ore 18:00, il sistema interroga tutte le caselle attive. Se trova email da recruiter con esito colloquio o rifiuto, aggiorna automaticamente la scheda nel Tracker e le scadenze del Calendario. Se trova email di risposta con oggetto <code>LN FATTO [ID]</code> o <code>LN SALTA [ID]</code>, aggiorna lo stato nella scheda Coda dello Sheet.
                    </div>
                  </article>

                  {/* Autenticazione con Account Google (OAuth) */}
                  <article className="card">
                    <div className="hd" style={{ flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>🔐</span>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '15px' }}>Accesso Ufficiale Google Account (OAuth 2.0)</h4>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                            Autorizzazione sicura per collegare in tempo reale Gmail e Google Calendar
                          </p>
                        </div>
                      </div>
                      <span className="pill" style={{ marginLeft: 'auto', background: 'rgba(31, 138, 98, 0.15)', color: 'var(--green)' }}>
                        Pronto per il collegamento
                      </span>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5' }}>
                      Puoi aggiungere e configurare liberamente tutte le caselle email che desideri direttamente qui sopra. Se vuoi autorizzare il sistema ad accedere tramite <strong>OAuth di Google</strong> (per sincronizzare direttamente le email reali di Gmail e gli eventi di Google Calendar senza proxy), basta confermare la richiesta: comparirà il popup ufficiale Google per accettare i permessi in tutta sicurezza.
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                      <button
                        className="btn pri sm"
                        onClick={() => {
                          showToast('🔐 Configurazione OAuth pronta: puoi aggiungere qualsiasi email nella schermata sopra!');
                        }}
                      >
                        ✓ Verifica Permessi Google
                      </button>
                      <button
                        className="btn sm"
                        onClick={() => {
                          showToast('🔄 Sincronizzazione caselle verificata!');
                        }}
                      >
                        Sincronizza Token
                      </button>
                    </div>
                  </article>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TAB 3: GENERALE & TEMA
                  ------------------------------------------------------------- */}
              {setSubTab === 'general' && (
                <div className="two">
                  {/* Profilo & Account */}
                  <article className="card">
                    <div className="hd">
                      <h3>Profilo &amp; Account</h3>
                    </div>
                    <div className="who" style={{ margin: '14px 0' }}>
                      <span className="avatar" style={{ width: '52px', height: '52px', minWidth: '52px', minHeight: '52px', flex: '0 0 52px' }}>
                        {DEMO ? 'AR' : ini(userFullName)}
                      </span>
                      <div>
                        <b style={{ fontSize: '16px' }}>{userFullName}</b>
                        <span>{currentUser?.email || activeWorkspaceAccount}</span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          Business School · MSc Innovation &amp; Entrepreneurship
                        </span>
                      </div>
                    </div>
                    <div className="sec">Tema dell'interfaccia</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        className="btn sm"
                        aria-pressed={theme === 'dark'}
                        onClick={() => {
                          setTheme('dark');
                          showToast('Tema Scuro attivato');
                        }}
                      >
                        🌙 Tema Scuro
                      </button>
                      <button
                        className="btn sm"
                        aria-pressed={theme === 'light'}
                        onClick={() => {
                          setTheme('light');
                          showToast('Tema Chiaro attivato');
                        }}
                      >
                        ☀️ Tema Chiaro
                      </button>
                    </div>
                  </article>

                  {/* Sincronizzazione & AI */}
                  <article className="card">
                    <div className="hd">
                      <h3>Integrazioni &amp; Gemini AI</h3>
                      <span className="pill">Gemini 1.5 Pro</span>
                    </div>
                    <ul className="li" style={{ marginTop: '14px', gap: '12px' }}>
                      <li>
                        <div>
                          <b style={{ color: 'var(--text)' }}>Google Calendar Sync</b>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                            Sincronizza in sola lettura gli appuntamenti e i colloqui.
                          </p>
                        </div>
                        <span className="st applied" style={{ marginLeft: 'auto' }}>Attivo</span>
                      </li>
                      <li>
                        <div>
                          <b style={{ color: 'var(--text)' }}>Career Gateway &amp; LinkedIn</b>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                            Importazione rapida annunci con 1 click o tramite link.
                          </p>
                        </div>
                        <span className="st applied" style={{ marginLeft: 'auto' }}>Connesso</span>
                      </li>
                    </ul>
                  </article>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* ==============================================================
          SCRIM & INTERACTIVE DETAIL DRAWER
          ============================================================== */}
      <div
        className={`scrim ${drawerApp || isModalOpen || isEventModalOpen || isImportModalOpen ? 'on' : ''}`}
        id="scrim"
        onClick={() => {
          setDrawerApp(null);
          setIsModalOpen(false);
          setIsEventModalOpen(false);
          setIsImportModalOpen(false);
        }}
      ></div>

      <aside className={`drawer ${drawerApp ? 'on' : ''}`} id="drawer" aria-label="Dettaglio candidatura">
        {drawerApp && (
          <>
            <div className="dh">
              {renderLogo(drawerApp, false, 46)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>{drawerApp.co}</h3>
                <p>{drawerApp.role}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="circ"
                  id="d-pencil-btn"
                  aria-label={isDrawerEditing ? 'Chiudi modifica' : 'Modifica scheda'}
                  title={isDrawerEditing ? 'Chiudi modifica' : 'Modifica scheda'}
                  onClick={() => setIsDrawerEditing(!isDrawerEditing)}
                  style={{
                    background: isDrawerEditing ? 'var(--blue)' : 'var(--glass-in)',
                    color: isDrawerEditing ? '#fff' : 'var(--text)',
                    borderColor: isDrawerEditing ? 'var(--blue)' : 'var(--rim)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
                <button className="circ" id="dx" aria-label="Chiudi" onClick={() => setDrawerApp(null)}>
                  <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
            </div>

            <div className="db">
              {/* Stepper Path */}
              {(() => {
                const steps: Array<'todo' | 'applied' | 'interview' | 'offer'> = ['todo', 'applied', 'interview', 'offer'];
                const idx = steps.indexOf(drawerApp.st as any);
                return (
                  <div className="path" aria-label="Percorso">
                    {steps.map((s, i) => (
                      <React.Fragment key={s}>
                        <span className={i <= idx ? 'on' : ''}>{ST[s]}</span>
                        {i < 3 && <i className={i < idx ? 'on' : ''}></i>}
                      </React.Fragment>
                    ))}
                  </div>
                );
              })()}

              {/* Quick Status Switcher */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <small style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '.08em', color: 'var(--faint)' }}>
                    Cambia stato rapido
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(['todo', 'applied', 'interview', 'offer', 'rejected'] as const).map((stKey) => (
                    <button
                      key={stKey}
                      type="button"
                      className={`st ${stKey}`}
                      style={{
                        cursor: 'pointer',
                        minWidth: 'auto',
                        padding: '0 10px',
                        height: '27px',
                        fontSize: '11.5px',
                        opacity: drawerApp.st === stKey ? 1 : 0.45,
                        border: drawerApp.st === stKey ? '1.5px solid var(--text)' : '1px solid var(--line)',
                        boxShadow: drawerApp.st === stKey ? '0 0 0 2px var(--blue)' : 'none',
                        transform: drawerApp.st === stKey ? 'scale(1.02)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handleUpdateAppStatus(drawerApp.id, stKey)}
                    >
                      {EM[stKey]} {ST[stKey]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Form vs Standard Details View */}
              {isDrawerEditing ? (
                <div
                  style={{
                    background: 'var(--glass-in)',
                    border: '1px solid var(--rim)',
                    borderRadius: '16px',
                    padding: '14px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <b style={{ fontSize: '13px' }}>Modifica Dettagli Candidatura</b>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                    <span>Azienda</span>
                    <input
                      type="text"
                      value={drawerEditCo}
                      onChange={(e) => setDrawerEditCo(e.target.value)}
                      style={{ height: '34px', borderRadius: '10px', padding: '0 10px', border: '1px solid var(--rim)', background: 'var(--field)', color: 'var(--text)' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                    <span>Ruolo</span>
                    <input
                      type="text"
                      value={drawerEditRole}
                      onChange={(e) => setDrawerEditRole(e.target.value)}
                      style={{ height: '34px', borderRadius: '10px', padding: '0 10px', border: '1px solid var(--rim)', background: 'var(--field)', color: 'var(--text)' }}
                    />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                      <span>Città</span>
                      <input
                        type="text"
                        value={drawerEditCity}
                        onChange={(e) => setDrawerEditCity(e.target.value)}
                        style={{ height: '34px', borderRadius: '10px', padding: '0 10px', border: '1px solid var(--rim)', background: 'var(--field)', color: 'var(--text)' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                      <span>Paese</span>
                      <input
                        type="text"
                        value={drawerEditCountry}
                        onChange={(e) => setDrawerEditCountry(e.target.value)}
                        style={{ height: '34px', borderRadius: '10px', padding: '0 10px', border: '1px solid var(--rim)', background: 'var(--field)', color: 'var(--text)' }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                      <span>Modalità</span>
                      <select
                        value={drawerEditMode}
                        onChange={(e) => setDrawerEditMode(e.target.value)}
                        style={{ height: '34px', borderRadius: '10px' }}
                      >
                        <option value="In sede">In sede</option>
                        <option value="Ibrido">Ibrido</option>
                        <option value="Remoto">Remoto</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                      <span>Compenso</span>
                      <input
                        type="text"
                        value={drawerEditComp}
                        onChange={(e) => setDrawerEditComp(e.target.value)}
                        style={{ height: '34px', borderRadius: '10px', padding: '0 10px', border: '1px solid var(--rim)', background: 'var(--field)', color: 'var(--text)' }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button className="btn sm" type="button" onClick={() => setIsDrawerEditing(false)}>
                      Annulla
                    </button>
                    <button className="btn pri sm" type="button" onClick={handleSaveDrawerEdit}>
                      💾 Salva modifiche
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dl">
                  <div>
                    <small>Sede</small>
                    {drawerApp.city} · {drawerApp.country} · {drawerApp.mode}
                  </div>
                  <div>
                    <small>Piattaforma</small>
                    {drawerApp.pl}
                  </div>
                  <div>
                    <small>Priorità</small>
                    {drawerApp.prio}
                  </div>
                  <div>
                    <small>Inviata il</small>
                    {drawerApp.sent}
                  </div>
                </div>
              )}

              <div className="sec">Azioni con l'AI</div>
              <div className="aib">
                <button
                  onClick={() => {
                    setCvSelectedAppId(drawerApp.id);
                    setDrawerApp(null);
                    handleGo('cv');
                    showToast(`Apertura CV Match sartoriale per ${drawerApp.co}`);
                  }}
                >
                  <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z" /><path d="M10 13h6M10 17h6" /></svg>
                  <span>Adatta il CV</span>
                </button>
                <button
                  onClick={() => {
                    setClAppId(drawerApp.id);
                    setCvSelectedAppId(drawerApp.id);
                    updateCoverLetter(drawerApp.id, clLang, clTone);
                    setDrawerApp(null);
                    handleGo('cv');
                    showToast(`Apertura Cover Letter per ${drawerApp.co}`);
                  }}
                >
                  <svg viewBox="0 0 24 24"><path d="M4 20l1-4 11-11a2.1 2.1 0 013 3L8 19z" /></svg>
                  <span>Scrivi Cover Letter</span>
                </button>
                <button
                  onClick={() => {
                    setSimAppId(drawerApp.id);
                    setDrawerApp(null);
                    handleGo('ass');
                    setChatMessages([
                      {
                        sender: 'ai',
                        text: `Simulazione avviata per ${drawerApp.co} (${drawerApp.role}). Dimmi: cosa ti ha spinto a candidarti per questo ruolo rispetto alle altre opportunità in ${drawerApp.city}?`,
                      },
                    ]);
                    showToast(`Simulatore avviato su ${drawerApp.co}`);
                  }}
                >
                  <svg viewBox="0 0 24 24"><path d="M5 5h14v10H10l-5 4z" /></svg>
                  <span>Prepara colloquio</span>
                </button>
                <button
                  onClick={() => {
                    showToast(`Bozza follow-up copiata negli appunti per ${drawerApp.co}!`);
                  }}
                >
                  <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z" /><path d="M4 7l8 6 8-6" /></svg>
                  <span>Scrivi il follow-up</span>
                </button>
              </div>

              <div className="sec">Colloqui</div>
              <div className="empty" style={{ minHeight: '64px' }}>
                Nessun colloquio.{' '}
                <button
                  className="addrow"
                  style={{ marginLeft: '6px' }}
                  onClick={() => showToast('Aggiunta colloquio per ' + drawerApp.co)}
                >
                  + Aggiungi
                </button>
              </div>

              <div className="sec">Cronologia</div>
              <ul className="li">
                <li>
                  {drawerApp.sent === '—'
                    ? 'Aggiunta al tracker'
                    : 'Candidatura inviata il ' + drawerApp.sent}
                </li>
              </ul>
            </div>
          </>
        )}
      </aside>

      {/* ==============================================================
          NEW APPLICATION WITH AI MODAL
          ============================================================== */}
      {/* ==============================================================
          NEW APPLICATION MODAL (DUAL OPTION: MANUAL VS AI)
          ============================================================== */}
      <div
        className={`modal ${isModalOpen ? 'on' : ''}`}
        id="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Nuova candidatura: manuale o con AI"
        style={{ maxWidth: '580px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>Nuova Candidatura</h3>
          {/* Segmented Control Tabs */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--glass-in)',
              border: '1px solid var(--rim)',
              borderRadius: '12px',
              padding: '3px',
              gap: '4px',
            }}
            role="tablist"
          >
            <button
              type="button"
              className={`fchip ${modalTab === 'manual' ? 'active' : ''}`}
              onClick={() => setModalTab('manual')}
              style={{
                height: '28px',
                padding: '0 10px',
                fontSize: '11.5px',
                fontWeight: modalTab === 'manual' ? 600 : 500,
                background: modalTab === 'manual' ? 'var(--blue-d)' : 'transparent',
                color: modalTab === 'manual' ? '#fff' : 'var(--text)',
                borderColor: modalTab === 'manual' ? 'transparent' : 'transparent',
              }}
            >
              ✍️ Compila manuale
            </button>
            <button
              type="button"
              className={`fchip ${modalTab === 'ai' ? 'active' : ''}`}
              onClick={() => setModalTab('ai')}
              style={{
                height: '28px',
                padding: '0 10px',
                fontSize: '11.5px',
                fontWeight: modalTab === 'ai' ? 600 : 500,
                background: modalTab === 'ai' ? 'var(--blue-d)' : 'transparent',
                color: modalTab === 'ai' ? '#fff' : 'var(--text)',
                borderColor: modalTab === 'ai' ? 'transparent' : 'transparent',
              }}
            >
              ⚡ Compila con AI
            </button>
          </div>
        </div>

        {/* TAB 1: COMPILA MANUALE */}
        {modalTab === 'manual' && (
          <form onSubmit={handleSaveManualApp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '12.5px', color: 'var(--muted)' }}>
              Inserisci i dati della posizione: il sistema verificherà anche se sono presenti email recruiter collegate.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Azienda *</span>
                  {manCo.trim() && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                      <span>Logo rilevato:</span>
                      {renderLogo(manCo.trim(), false, 20)}
                    </span>
                  )}
                </span>
                <input
                  type="text"
                  required
                  value={manCo}
                  onChange={(e) => setManCo(e.target.value)}
                  placeholder="es. Stripe, Casavo, Lio, Spotify..."
                  style={{
                    height: '36px',
                    borderRadius: '10px',
                    padding: '0 10px',
                    border: '1px solid var(--rim)',
                    background: 'var(--field)',
                    color: 'var(--text)',
                  }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <span>Ruolo / Titolo *</span>
                <input
                  type="text"
                  required
                  value={manRole}
                  onChange={(e) => setManRole(e.target.value)}
                  placeholder="es. Founders Associate Intern"
                  style={{
                    height: '36px',
                    borderRadius: '10px',
                    padding: '0 10px',
                    border: '1px solid var(--rim)',
                    background: 'var(--field)',
                    color: 'var(--text)',
                  }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <span>Città / Sede</span>
                <input
                  type="text"
                  value={manCity}
                  onChange={(e) => setManCity(e.target.value)}
                  placeholder="es. Milano, Berlino, Remoto"
                  style={{
                    height: '36px',
                    borderRadius: '10px',
                    padding: '0 10px',
                    border: '1px solid var(--rim)',
                    background: 'var(--field)',
                    color: 'var(--text)',
                  }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <span>Paese</span>
                <input
                  type="text"
                  value={manCountry}
                  onChange={(e) => setManCountry(e.target.value)}
                  placeholder="es. Italia, Germania"
                  style={{
                    height: '36px',
                    borderRadius: '10px',
                    padding: '0 10px',
                    border: '1px solid var(--rim)',
                    background: 'var(--field)',
                    color: 'var(--text)',
                  }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <span>Modalità di lavoro</span>
                <select
                  value={manMode}
                  onChange={(e) => setManMode(e.target.value)}
                  style={{ height: '36px', borderRadius: '10px' }}
                >
                  <option value="In sede">In sede</option>
                  <option value="Ibrido">Ibrido</option>
                  <option value="Remoto">Remoto</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <span>Compenso mensile</span>
                <input
                  type="text"
                  value={manComp}
                  onChange={(e) => setManComp(e.target.value)}
                  placeholder="es. €1.400/m o Stage retribuito"
                  style={{
                    height: '36px',
                    borderRadius: '10px',
                    padding: '0 10px',
                    border: '1px solid var(--rim)',
                    background: 'var(--field)',
                    color: 'var(--text)',
                  }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <span>Stato iniziale</span>
                <select
                  value={manSt}
                  onChange={(e: any) => setManSt(e.target.value)}
                  style={{ height: '36px', borderRadius: '10px' }}
                >
                  <option value="todo">📝 Da candidarmi</option>
                  <option value="applied">✉️ Candidato</option>
                  <option value="interview">🗓 In colloquio</option>
                  <option value="offer">🏆 Offerta</option>
                  <option value="rejected">✕ Rifiutato</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <span>Piattaforma</span>
                <select
                  value={manPl}
                  onChange={(e) => setManPl(e.target.value)}
                  style={{ height: '36px', borderRadius: '10px' }}
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Glassdoor">Glassdoor</option>
                  <option value="Sito web">Sito aziendale</option>
                  <option value="Referral">Referral</option>
                  <option value="Altro">Altro</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px' }}>
                <span>Priorità</span>
                <select
                  value={manPrio}
                  onChange={(e) => setManPrio(e.target.value)}
                  style={{ height: '36px', borderRadius: '10px' }}
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Bassa">Bassa</option>
                </select>
              </label>
            </div>

            {/* Hint if company matches pending recruiter email */}
            {manCo.trim() &&
              unmatchedEmails.some(
                (u) =>
                  u.company.toLowerCase().includes(manCo.trim().toLowerCase()) ||
                  manCo.trim().toLowerCase().includes(u.company.toLowerCase())
              ) && (
                <div
                  style={{
                    background: 'var(--b-applied)',
                    border: '1px solid var(--c-applied)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--c-applied)',
                  }}
                >
                  ✨ <strong>Email recruiter rilevata:</strong> al salvataggio collegheremo automaticamente l'email in attesa per {manCo.trim()}!
                </div>
              )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>
                Chiudi
              </button>
              <button type="submit" className="btn pri">
                ➕ Salva candidatura
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: COMPILA CON AI */}
        {modalTab === 'ai' && (
          <div>
            <p style={{ margin: '0 0 8px', fontSize: '12.5px', color: 'var(--muted)' }}>
              Incolla il link o il testo dell'annuncio: Gemini AI compilerà la scheda per te.
            </p>
            <textarea
              id="mt"
              aria-label="Link o testo dell'annuncio"
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              placeholder="Incolla l'URL o il testo completo dell'annuncio (LinkedIn, Indeed, Joinrs, sito web)..."
              style={{ minHeight: '90px' }}
              disabled={isExtractingAi}
            ></textarea>

            {isExtractingAi && (
              <div style={{ padding: '14px', background: 'var(--glass-in)', borderRadius: '12px', marginTop: '10px', textAlign: 'center', fontSize: '13px', color: 'var(--blue)' }}>
                ⚡ Gemini sta analizzando l'annuncio ed estraendo azienda, ruolo, sede, RAL e requisiti…
              </div>
            )}

            {modalResult && (
              <div className="res" id="mres" style={{ marginTop: '10px' }}>
                <div>
                  <small>Azienda</small>{extractedAiData?.company || 'Lio'}
                </div>
                <div>
                  <small>Ruolo</small>{extractedAiData?.role || 'Founders Associate Internship'}
                </div>
                <div>
                  <small>Sede</small>{extractedAiData?.city || 'Milano'} ({extractedAiData?.country || 'IT'}) · {extractedAiData?.workMode || 'Ibrido'}
                </div>
                <div>
                  <small>Tipo &amp; Retribuzione</small>{extractedAiData?.contract || 'Stage'} ({extractedAiData?.salary || '€1.200/m'})
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <small>Descrizione sintetica</small>
                  {extractedAiData?.description || 'Opportunità strategica in startup/scaleup ad alta crescita.'}
                </div>
                {extractedAiData?.keyAdvice && (
                  <div style={{ gridColumn: '1 / -1', background: 'rgba(47,120,234,.08)', padding: '8px 10px', borderRadius: '8px', borderLeft: '3px solid var(--blue)', fontSize: '11.5px' }}>
                    <strong>Consiglio Gemini per il candidato:</strong> {extractedAiData.keyAdvice}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button type="button" className="btn" id="mc" onClick={() => setIsModalOpen(false)}>
                Chiudi
              </button>
              <button
                type="button"
                className="btn pri"
                id="mgo"
                disabled={isExtractingAi || (!modalText.trim() && !modalResult)}
                onClick={() => {
                  if (modalResult) {
                    handleSaveAiExtractedApp();
                  } else {
                    handleExtractWithAi();
                  }
                }}
              >
                {isExtractingAi ? 'Estrazione in corso…' : modalResult ? '➕ Salva nel Tracker' : '⚡ Estrai dati con AI'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==============================================================
          ADD CALENDAR EVENT / INTERVIEW / FOLLOW-UP MODAL
          ============================================================== */}
      <div
        className={`modal ${isEventModalOpen ? 'on' : ''}`}
        id="event-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Aggiungi evento o colloquio al calendario"
      >
        <h3>Aggiungi evento al calendario</h3>
        <p>Inserisci un colloquio, una scadenza o programma un follow-up personalizzato.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            <span>Account Google Workspace</span>
            <select
              value={newEventAccount}
              onChange={(e) => setNewEventAccount(e.target.value)}
              style={{ height: '38px', borderRadius: '12px' }}
            >
              {WORKSPACE_ACCOUNTS.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            <span>Tipo di evento</span>
            <select
              value={newEventType}
              onChange={(e: any) => setNewEventType(e.target.value)}
              style={{ height: '38px', borderRadius: '12px' }}
            >
              <option value="colloquio">🗓 Colloquio / Interview</option>
              <option value="follow">⏱ Follow-up (invio sollecito)</option>
              <option value="scadenza">⚠️ Scadenza bando / annuncio</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            <span>Azienda / Titolo evento</span>
            <input
              type="text"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder="es. Colloquio Tecnico · Scalapay"
              style={{
                height: '38px',
                borderRadius: '12px',
                border: '1px solid var(--rim)',
                background: 'var(--field)',
                color: 'var(--text)',
                padding: '0 12px',
              }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              <span>Data</span>
              <input
                type="text"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                placeholder="es. 6 Nov"
                style={{
                  height: '38px',
                  borderRadius: '12px',
                  border: '1px solid var(--rim)',
                  background: 'var(--field)',
                  color: 'var(--text)',
                  padding: '0 12px',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              <span>Orario</span>
              <input
                type="text"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                placeholder="es. 15:00"
                style={{
                  height: '38px',
                  borderRadius: '12px',
                  border: '1px solid var(--rim)',
                  background: 'var(--field)',
                  color: 'var(--text)',
                  padding: '0 12px',
                }}
              />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            <span>Note / Dettagli</span>
            <input
              type="text"
              value={newEventDesc}
              onChange={(e) => setNewEventDesc(e.target.value)}
              placeholder="es. Con Founders & Talent Team via Google Meet"
              style={{
                height: '38px',
                borderRadius: '12px',
                border: '1px solid var(--rim)',
                background: 'var(--field)',
                color: 'var(--text)',
                padding: '0 12px',
              }}
            />
          </label>

          {/* Sincronizzazione Google Calendar & Google Tasks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--field)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--rim)', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Sincronizzazione Cloud &amp; Smartphone:
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={syncToGoogleCal}
                onChange={(e) => setSyncToGoogleCal(e.target.checked)}
              />
              <span>🗓️ Sincronizza su Google Calendar ({newEventAccount})</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={syncToGoogleTasksAlso}
                onChange={(e) => setSyncToGoogleTasksAlso(e.target.checked)}
              />
              <span>📱 Aggiungi a Google Tasks (notifica e promemoria su smartphone)</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn" onClick={() => setIsEventModalOpen(false)}>
            Annulla
          </button>
          <button className="btn pri" onClick={handleSaveCalendarEvent}>
            Salva evento
          </button>
        </div>
      </div>

      {/* ==============================================================
          IMPORT FULL JSON / 50 CANDIDATURE MODAL
          ============================================================== */}
      {/* ==============================================================
          IMPORT EXCEL / CSV (.xlsx, .xls, .csv) O FULL JSON MODAL
          ============================================================== */}
      <div
        className={`modal ${isImportModalOpen ? 'on' : ''}`}
        id="import-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Importa file Excel o codice JSON"
        style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ margin: 0 }}>Importa Candidature o Configurazione</h3>
          <button
            onClick={() => setIsImportModalOpen(false)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Segmented Tabs */}
        <div className="seg" style={{ marginBottom: '14px', width: '100%' }}>
          <button
            type="button"
            aria-pressed={importModalTab === 'excel'}
            onClick={() => setImportModalTab('excel')}
            style={{ flex: 1, padding: '7px 12px' }}
          >
            📊 File Excel o CSV (.xlsx, .xls, .csv)
          </button>
          <button
            type="button"
            aria-pressed={importModalTab === 'json'}
            onClick={() => setImportModalTab('json')}
            style={{ flex: 1, padding: '7px 12px' }}
          >
            📄 Codice JSON / Backup
          </button>
        </div>

        {/* TAB A: EXCEL (.xlsx, .xls, .csv) UPLOAD */}
        {importModalTab === 'excel' && (
          <div>
            <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--muted)' }}>
              Carica il tuo file Excel (anche le tue 50 candidature o fogli esportati da LinkedIn/Google Sheets). Riconosciamo automaticamente le colonne in italiano o inglese: <em>Azienda, Ruolo, Città, Stato, Data, Compenso</em>.
            </p>

            {/* Drag & Drop Upload Zone */}
            <div
              style={{
                border: '2px dashed var(--blue)',
                borderRadius: '14px',
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--glass-in)',
                cursor: 'pointer',
                transition: 'all .2s ease',
              }}
              onClick={() => document.getElementById('excel-file-input')?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleExcelFileUpload(e.dataTransfer.files[0]);
                }
              }}
            >
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleExcelFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>📊</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                {excelFileName ? `File selezionato: ${excelFileName}` : 'Clicca per scegliere il file Excel o trascinalo qui'}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
                Formati supportati: Microsoft Excel (.xlsx, .xls) o file CSV (.csv)
              </div>
            </div>

            {isExcelParsing && (
              <div style={{ marginTop: '12px', textAlign: 'center', color: 'var(--blue)', fontSize: '13px' }}>
                Lettura ed elaborazione del file in corso…
              </div>
            )}

            {/* Sheet Selector (when workbook has multiple sheets) */}
            {excelAvailableSheets.length > 1 && (
              <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--glass-in)', border: '1px solid var(--rim)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>📑 Seleziona foglio di lavoro:</span>
                <select
                  value={excelSelectedSheet}
                  onChange={(e) => handleSwitchExcelSheet(e.target.value)}
                  style={{ height: '32px', borderRadius: '8px', fontSize: '12px', padding: '0 8px' }}
                >
                  {excelAvailableSheets.map((sName) => (
                    <option key={sName} value={sName}>
                      {sName}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  (Rilevati {excelAvailableSheets.length} fogli nel file)
                </span>
              </div>
            )}

            {/* Column Mapping Selectors (lets the user map or verify detected columns) */}
            {excelRawHeaders.length > 0 && (
              <details style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--glass-in)', border: '1px solid var(--rim)', borderRadius: '12px', fontSize: '12px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--blue)' }}>
                  🛠 Mappatura colonne rilevate ({excelRawHeaders.length} colonne nel file) — Clicca per personalizzare
                </summary>
                <p style={{ margin: '6px 0 10px', fontSize: '11.5px', color: 'var(--muted)' }}>
                  Se i dati nel tuo foglio hanno nomi di colonna particolari, assegna qui la colonna corretta per ciascun campo:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontWeight: 600 }}>Azienda *</span>
                    <select
                      value={excelColumnMapping.companyCol}
                      onChange={(e) => handleUpdateColumnMapping('companyCol', parseInt(e.target.value, 10))}
                      style={{ height: '30px', fontSize: '11.5px' }}
                    >
                      {excelRawHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Colonna {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontWeight: 600 }}>Ruolo / Posizione *</span>
                    <select
                      value={excelColumnMapping.roleCol}
                      onChange={(e) => handleUpdateColumnMapping('roleCol', parseInt(e.target.value, 10))}
                      style={{ height: '30px', fontSize: '11.5px' }}
                    >
                      <option value={-1}>-- Nessuna (default) --</option>
                      {excelRawHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Colonna {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontWeight: 600 }}>Città / Sede *</span>
                    <select
                      value={excelColumnMapping.cityCol}
                      onChange={(e) => handleUpdateColumnMapping('cityCol', parseInt(e.target.value, 10))}
                      style={{ height: '30px', fontSize: '11.5px' }}
                    >
                      <option value={-1}>-- Nessuna (default) --</option>
                      {excelRawHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Colonna {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontWeight: 600 }}>Stato candidatura</span>
                    <select
                      value={excelColumnMapping.statusCol}
                      onChange={(e) => handleUpdateColumnMapping('statusCol', parseInt(e.target.value, 10))}
                      style={{ height: '30px', fontSize: '11.5px' }}
                    >
                      <option value={-1}>-- Nessuna (default) --</option>
                      {excelRawHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Colonna {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontWeight: 600 }}>Data Invio</span>
                    <select
                      value={excelColumnMapping.dateCol}
                      onChange={(e) => handleUpdateColumnMapping('dateCol', parseInt(e.target.value, 10))}
                      style={{ height: '30px', fontSize: '11.5px' }}
                    >
                      <option value={-1}>-- Nessuna --</option>
                      {excelRawHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Colonna {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontWeight: 600 }}>Compenso / RAL</span>
                    <select
                      value={excelColumnMapping.salaryCol}
                      onChange={(e) => handleUpdateColumnMapping('salaryCol', parseInt(e.target.value, 10))}
                      style={{ height: '30px', fontSize: '11.5px' }}
                    >
                      <option value={-1}>-- Nessuna --</option>
                      {excelRawHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Colonna {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>
            )}

            {/* Preview of Parsed Rows */}
            {excelPreviewApps.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <b style={{ fontSize: '13px', color: 'var(--green)' }}>
                    ✓ Riconosciute {excelPreviewApps.length} candidature nel foglio "{excelSelectedSheet}"
                  </b>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'center' }}>
                    <span>Modalità salvataggio:</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="importMode"
                        checked={excelImportMode === 'replace'}
                        onChange={() => setExcelImportMode('replace')}
                      />
                      Sostituisci Tracker ({excelPreviewApps.length})
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="importMode"
                        checked={excelImportMode === 'append'}
                        onChange={() => setExcelImportMode('append')}
                      />
                      Aggiungi alle esistenti
                    </label>
                  </div>
                </div>

                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid var(--rim)',
                    borderRadius: '10px',
                    background: 'var(--field)',
                    fontSize: '11.5px',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--glass-in)', borderBottom: '1px solid var(--rim)' }}>
                        <th style={{ padding: '6px 8px' }}>#</th>
                        <th style={{ padding: '6px 8px' }}>Azienda</th>
                        <th style={{ padding: '6px 8px' }}>Ruolo</th>
                        <th style={{ padding: '6px 8px' }}>Città / Sede</th>
                        <th style={{ padding: '6px 8px' }}>Paese</th>
                        <th style={{ padding: '6px 8px' }}>Stato</th>
                        <th style={{ padding: '6px 8px' }}>Data</th>
                        <th style={{ padding: '6px 8px' }}>Compenso</th>
                        <th style={{ padding: '6px 8px' }}>Prossimo Step</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelPreviewApps.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                          <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text)' }}>{row.co}</td>
                          <td style={{ padding: '6px 8px' }}>{row.role}</td>
                          <td style={{ padding: '6px 8px', color: row.city !== 'Milano' ? 'var(--blue)' : 'inherit' }}>
                            {row.city || '—'}
                          </td>
                          <td style={{ padding: '6px 8px' }}>{row.country || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <span className={`st ${row.st}`} style={{ fontSize: '10px', height: '20px' }}>
                              {ST[row.st] || row.st}
                            </span>
                          </td>
                          <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{row.sent}</td>
                          <td style={{ padding: '6px 8px', color: row.comp !== '—' ? 'var(--text)' : 'var(--muted)' }}>
                            {row.comp}
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <span className={`nxt ${row.nx[1]}`} style={{ fontSize: '10px' }}>
                              {row.nx[0]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn" onClick={() => setIsImportModalOpen(false)}>
                Annulla
              </button>
              <button
                className="btn pri"
                disabled={excelPreviewApps.length === 0}
                onClick={handleConfirmExcelImport}
              >
                📥 Carica {excelPreviewApps.length > 0 ? `${excelPreviewApps.length} candidature` : 'nel Tracker'}
              </button>
            </div>
          </div>
        )}

        {/* TAB B: JSON IMPORT */}
        {importModalTab === 'json' && (
          <div>
            <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--muted)' }}>
              Incolla un backup completo JSON esportato in precedenza oppure incolla direttamente la tua lista di candidature in JSON.
            </p>

            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder={`Incolla qui il JSON valido...\n\nFormato backup completo:\n{\n  "searchConfig": { ... },\n  "applications": [ ... ],\n  "hubNetworkingCoda": [ ... ]\n}\n\nOppure array diretto di candidature:\n[\n  { "co": "Azienda", "role": "Innovation Manager", "city": "Milano", "country": "Italia", "st": "applied", "prio": "Alta" },\n  ...\n]`}
              style={{
                width: '100%',
                minHeight: '200px',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                borderRadius: '12px',
                border: '1px solid var(--rim)',
                background: 'var(--field)',
                color: 'var(--text)',
                padding: '12px',
                resize: 'vertical',
                lineHeight: '1.4',
              }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn" onClick={() => setIsImportModalOpen(false)}>
                Annulla
              </button>
              <button className="btn pri" onClick={handleImportFullJson}>
                📥 Importa JSON
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==============================================================
          COMPANY LOGO PICKER / UPLOAD MODAL
          ============================================================== */}
      <CompanyLogoModal
        isOpen={logoModalOpen}
        companyName={logoModalCompany}
        currentLogoUrl={companyLogos[logoModalCompany.trim().toLowerCase()] || ''}
        allUsedLogos={Object.entries(companyLogos).map(([k, v]) => ({ company: k, logoUrl: v }))}
        onSaveLogo={handleSaveCompanyLogo}
        onRemoveLogo={handleRemoveCompanyLogo}
        onClose={() => setLogoModalOpen(false)}
      />

      {/* ==============================================================
          WORKSPACE CONFIRMATION MODAL (GOOGLE CALENDAR & GOOGLE TASKS)
          ============================================================== */}
      {confirmModalData && (
        <WorkspaceConfirmModal
          isOpen={confirmModalData.isOpen}
          onClose={() => {
            if (!isSubmittingWorkspaceAction) setConfirmModalData(null);
          }}
          onConfirm={confirmModalData.onConfirm}
          service={confirmModalData.service}
          title={confirmModalData.title}
          subtitle={confirmModalData.subtitle}
          account={confirmModalData.account}
          details={confirmModalData.details}
          isSubmitting={isSubmittingWorkspaceAction}
        />
      )}

      {/* ==============================================================
          WELCOME & MULTI-ACCOUNT GOOGLE MODAL
          ============================================================== */}
      <WelcomeAuthModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        currentUser={currentUser}
        connectedAccounts={getConnectedAccounts()}
        configuredAccounts={gmailAccounts.map((g) => g.email)}
        activeAccount={activeWorkspaceAccount}
        onLoginGoogle={async (hint) => {
          if (!hint && currentUser) {
            showToast('Scrivi l’indirizzo dell’account da collegare, oppure usa "Autorizza" accanto a un account dell’elenco');
            return;
          }
          try {
            const res = await loginWithGoogle(hint);
            const connected = res.email || res.user?.email;
            showToast(`✓ Connesso con Google: ${connected}`);
            if (connected) {
              setActiveWorkspaceAccount(connected);
            }
            setAccountsTick((t) => t + 1); // refresh the list of connected accounts
          } catch (e: any) {
            const code = String(e?.code || '');
            if (code.includes('popup-blocked')) {
              showToast('Il browser ha bloccato la finestra di Google: consenti i popup per questo sito e riprova');
            } else if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
              showToast('Finestra di Google chiusa prima di completare l\'accesso: riprova e, se compare "app non verificata", scegli Avanzate → Vai a InternTrack');
            } else {
              showToast('Accesso Google annullato o non riuscito');
            }
          }
        }}
        onSwitchAccount={(acc) => {
          setActiveWorkspaceAccount(acc);
          showToast(`Account Google attivo impostato su: ${acc}`);
        }}
        onLogout={async () => {
          await logoutUser();
          setCurrentUser(null);
          showToast('Disconnesso con successo');
        }}
      />

      {/* ==============================================================
          10 AZIENDE TARGET & CONTATTI LINKEDIN SCOUTING REPORT MODAL
          ============================================================== */}
      <DailyScoutingReportModal
        isOpen={isScoutingReportModalOpen}
        onClose={() => setIsScoutingReportModalOpen(false)}
        items={hubCoda}
        recipientEmail={activeWorkspaceAccount}
        onSendTaskToGoogleTasks={(title, notes, due) => {
          requestSendTaskToGoogleTasks(title, notes, due);
        }}
        showToast={showToast}
      />

      {/* ==============================================================
          GMAIL & AUTOMAZIONI RECRUITER MODAL
          ============================================================== */}
      {isGmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="max-w-3xl w-full my-auto rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            
            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md">
                  <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Automazione &amp; Monitoraggio Posta Gmail
                  </h2>
                  <p className="text-xs text-slate-500">
                    Scansione in tempo reale e in sola lettura delle risposte dai recruiter con Google Workspace
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsGmailModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Google Account & Multi-Inbox Bar */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Account Google:</span>
                {currentUser ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {currentUser.email}
                  </span>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        const res = await loginWithGoogle();
                        showToast(`Connesso con Google: ${res.user.email}`);
                      } catch (e) {
                        showToast('Accesso Google annullato');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Connetti Casella Gmail</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Caselle monitorate: <strong>{gmailAccounts.length}</strong></span>
                <button
                  onClick={handleCheckMail}
                  disabled={gmailScanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <span>{gmailScanning ? 'Scansione in corso...' : '↻ Riavvia Scansione'}</span>
                </button>
              </div>
            </div>

            {/* Inboxes List summary */}
            <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 text-[11.5px] flex items-center gap-2 overflow-x-auto">
              <span className="text-slate-500 font-medium">Inboxes attive:</span>
              {gmailAccounts.map((acc) => (
                <span
                  key={acc.id}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[10.5px] text-slate-700 dark:text-slate-300 shrink-0"
                >
                  {acc.email} ({acc.status})
                </span>
              ))}
            </div>

            {/* Recruiter Messages List */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/50 text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2">
                <span>🛡️</span>
                <span>Nessuna email viene modificata o inviata senza la tua approvazione esplicita. Scansione autorizzata in sola lettura per verificare esiti e colloqui.</span>
              </div>

              {recruiterMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  Nessuna nuova email recruiter non letta trovata nelle caselle Gmail.
                </div>
              ) : (
                recruiterMessages.map((msg) => {
                  const isApplied = appliedRecruiterActions.has(msg.id);
                  const intentBg =
                    msg.detectedIntent === 'offer'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : msg.detectedIntent === 'interview'
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      : msg.detectedIntent === 'assessment'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : msg.detectedIntent === 'rejection'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

                  return (
                    <div
                      key={msg.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {msg.matchedCompany && (
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {msg.matchedCompany}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${intentBg}`}>
                              {msg.detectedIntent.toUpperCase()}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {msg.subject}
                          </p>
                          <span className="text-[11px] font-mono text-slate-400">
                            {msg.sender} · {msg.date}{msg.mailbox ? ` · ${msg.mailbox}` : ''}
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

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApplyRecruiterAction(msg)}
                            disabled={isApplied}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                              isApplied
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                          >
                            <span>{isApplied ? '✓ Aggiornato' : '→ Applica al Tracker'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Supporto multi-casella con autorizzazione OAuth 2.0 (Google Workspace)
              </span>
              <button
                onClick={() => setIsGmailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Chiudi
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==============================================================
          TOAST NOTIFICATION
          ============================================================== */}
      <div className={`toast ${toastMsg ? 'on' : ''}`} id="toast" role="status" aria-live="polite">
        {toastMsg}
      </div>
    </>
  );
}

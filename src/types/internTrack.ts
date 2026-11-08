export type ApplicationStatus = 
  | 'Da candidarmi' 
  | 'Candidato' 
  | 'Colloquio' 
  | 'Offerta' 
  | 'Rifiutato';

export type PriorityLevel = 'Alta' | 'Media' | 'Bassa';
export type WorkMode = 'In sede' | 'Ibrido' | 'Remoto';
export type JobKind = 'Stage' | 'Tirocinio' | 'Apprendistato' | 'Graduate program' | 'Lavoro' | 'Part-time' | 'Altro';
export type ContractType = 'Stage' | 'Apprendistato' | 'Determinato' | 'Indeterminato' | 'P.IVA' | 'Altro';
export type PlatformName = 'LinkedIn' | 'Indeed' | 'Joinrs' | 'CareerOS' | 'Flexa' | 'Sito aziendale' | 'Altro';

export type InterviewKind = 'HR' | 'Tecnico' | 'Case study' | 'Di gruppo' | 'Finale' | 'Test';

export interface Interview {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  kind: InterviewKind;
  link?: string;
  who?: string;
  topic?: string;
  done: boolean;
  notes?: string;
}

export interface Application {
  id: string;
  company: string;
  companyDomain?: string;
  role: string;
  location: string;
  country: string; // IT, DE, ES, FR, UK, etc.
  city: string;
  kind: JobKind;
  contract: ContractType;
  workMode: WorkMode;
  salary?: string;
  deadline?: string; // YYYY-MM-DD
  description?: string;
  requirements?: string;
  status: ApplicationStatus;
  appliedAt?: string; // YYYY-MM-DD
  priority: PriorityLevel;
  url?: string;
  platform: PlatformName;
  referent?: string;
  contactId?: string;
  notes: string;
  letter?: string;
  cvNotes?: string;
  grp: 'Business Development e Growth' | 'Founder Associate' | 'Growth' | 'Strategia e analisi' | 'Altro';
  interviews: Interview[];
  followDone?: boolean;
  followUpDays?: number;
  readState?: 'in_coda' | 'letta' | 'non_riuscita';
  createdAt: string;
  updatedAt: string;
}

export interface CareerSite {
  id: string;
  company: string;
  url: string;
  last?: string; // YYYY-MM-DD
  next: string; // YYYY-MM-DD
  every: 1 | 2 | 3 | 6; // months
  notes?: string;
  about?: string;
  sector: string;
}

export interface Course {
  id: string;
  title: string;
  platform: string;
  category: 'Dati' | 'Excel' | 'AI' | 'Programmazione' | 'Business' | 'Soft skills' | 'Lingue' | 'Altro';
  level: 'Base' | 'Intermedio' | 'Avanzato';
  duration: string;
  status: 'Da iniziare' | 'In corso' | 'Completato';
  remind?: string; // YYYY-MM-DD
  notes?: string;
  url?: string;
  favorite: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  due: string; // YYYY-MM-DD
  done: boolean;
  appId?: string;
  type?: 'follow_up' | 'interview' | 'deadline' | 'networking' | 'site_check' | 'course' | 'general';
  priorityScore?: number;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  link?: string;
  notes: string;
  country?: string;
  status?: 'to_reach_out' | 'contacted' | 'chat_scheduled' | 'referral_secured' | 'connected';
  connectionNote?: string;
  due?: string;
  done?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  metric: 'inviate' | 'aggiunte' | 'colloqui';
  period: 'settimana' | 'mese' | 'totale';
  target: number;
  current: number;
}

export interface ActionLog {
  t: string; // ISO
  appId?: string;
  c: string; // Company
  x: string; // Action description
}

export interface ResearchPlatformCheck {
  platform: 'LinkedIn' | 'Indeed' | 'Joinrs' | 'CareerOS' | 'Flexa';
  timeMin: number;
  checked: boolean;
  foundCount: number;
  searchUrl?: string;
}

export interface ResearchSession {
  id: string;
  role: string;
  city: string;
  country: string;
  durationMin: number;
  booleanQuery: string;
  localKeywords: string[];
  platforms: ResearchPlatformCheck[];
  status: 'pianificata' | 'fatta' | 'rimandata';
  date: string;
}

export interface AppSettings {
  theme: 'chiaro' | 'scuro' | 'sistema';
  followUpDays: number;
  sitesPerDay: number;
  defaultView: 'board' | 'lista' | 'cartelle';
  googleScriptUrl?: string;
  googleToken?: string;
  googleSheetId?: string;
  autoCheckMailOnOpen: boolean;
  autoCheckSheetTimes: boolean;
  showGoogleCalendar: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  userEmail?: string;
}

export interface MailProposal {
  id: string;
  sender: string;
  subject: string;
  date: string;
  company: string;
  role?: string;
  category: 'ricevuta' | 'rifiutata' | 'colloquio_proposto' | 'colloquio_fissato' | 'prosegue' | 'offerta';
  interviewDate?: string;
  interviewTime?: string;
  confidence: 'alta' | 'media' | 'bassa';
  snippet: string;
  recommendedAction: 'Segna come rifiutata' | 'Applica' | 'Applica e metti nel calendario' | 'Aggiungi al tracker' | 'Prepara risposta' | 'Ignora';
}

export interface SheetUpdateItem {
  id: string;
  timestamp: string;
  type: 'posta' | 'persone' | 'aziende';
  title: string;
  detail: string;
  company: string;
  url?: string;
  isNew?: boolean;
}

export interface MockApp {
  id: string;
  co: string;
  role: string;
  st: 'todo' | 'applied' | 'interview' | 'offer' | 'rejected';
  fit: number;
  city: string;
  country: string;
  mode: string;
  pl: string;
  nx: [string, string]; // [label, color class 'ok'|'warn'|'info']
  comp: string;
  sent: string;
  prio: string;
  act: 'send' | 'follow' | 'sent' | 'eval' | 'closed';
  // Optional details entered by the user (real app). Missing on older records.
  url?: string;   // link to the job posting
  desc?: string;  // text of the job description
  notes?: string; // free notes
}

export interface MockDeadline {
  w: 'Scadute' | 'Oggi' | 'Prossimi giorni';
  t: 'follow' | 'sito' | 'piano';
  n: string;
  d: string;
  when: string;
  c: 'over' | 'warn' | 'info';
}

export const ST: Record<string, string> = {
  todo: 'Da candidarmi',
  applied: 'Candidato',
  interview: 'Colloquio',
  offer: 'Offerta',
  rejected: 'Rifiutato',
};

export const EM: Record<string, string> = {
  todo: '⏳',
  applied: '🚀',
  interview: '🗓',
  offer: '🏆',
  rejected: '✕',
};

export const PL: Record<string, string> = {
  LinkedIn: '#2a6fb0',
  Indeed: '#2e57b8',
  Joinrs: '#1f8a62',
  CareerOS: '#6b49b8',
  Flexa: '#e64980',
  'Sito aziendale': '#5d6978',
};

export const TN: Record<string, string> = {
  follow: 'Follow-up',
  sito: 'Sito carriere',
  piano: 'Piano di ricerca',
};

export const VMN: Record<string, string> = {
  tab: 'Table',
  act: 'Action Center',
  sch: 'Cards',
};

export const STN: Record<string, string> = {
  '': 'Tutte',
  todo: 'Da candidarmi',
  applied: 'Candidato',
  interview: 'Colloquio',
  offer: 'Offerta',
  rejected: 'Rifiutato',
};

export const INITIAL_CNT: Record<string, number> = {
  '': 54,
  todo: 18,
  applied: 34,
  interview: 0,
  offer: 0,
  rejected: 2,
};

export const SEC: Record<string, string> = {
  dash: 'dash',
  trk: 'trk',
  cal: 'cal',
  sca: 'cal',
  ric: 'ric',
  siti: 'ric',
  sug: 'sug',
  cor: 'cor',
  cv: 'cv',
  ass: 'ass',
  nov: 'nov',
  set: 'set',
};

export const DEF: Record<string, string> = {
  dash: 'dash',
  trk: 'trk',
  cal: 'cal',
  ric: 'ric',
  cor: 'cor',
  sug: 'sug',
  set: 'set',
};

export const HEAD: Record<string, [string, string]> = {
  dash: ['Dashboard', 'grid'],
  trk: ['Tracker', 'board'],
  cal: ['Calendario & Scadenze', 'cal'],
  ric: ['Ricerca', 'search'],
  cor: ['Corsi & Competenze', 'book'],
  sug: ['Suggerimenti & Networking', 'target'],
  cv: ['CV & Cover Letter', 'doc'],
  ass: ['AI Copilot', 'chat'],
  nov: ['Notifiche', 'bell'],
  set: ['Impostazioni', 'gear'],
};

export const FL = (f: number) => {
  if (f >= 95) return 'Perfetto';
  if (f >= 90) return 'Ottimo fit';
  if (f >= 85) return 'Elevato';
  if (f >= 80) return 'Buon fit';
  return 'Medio';
};

export const hue = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 360;
  }
  return h;
};

export const ini = (s: string) => {
  return s
    .replace(/[^A-Za-zÀ-ÿ ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
};

export const grad = (n: string) => {
  return `linear-gradient(145deg, hsl(${hue(n)} 58% 33%), hsl(${(hue(n) + 30) % 360} 58% 23%))`;
};

const makeApp = (
  id: string,
  co: string,
  role: string,
  st: 'todo' | 'applied' | 'interview' | 'offer' | 'rejected',
  fit: number,
  city: string,
  country: string,
  mode: string,
  pl: string,
  nx: [string, string],
  comp: string,
  sent: string,
  prio: string
): MockApp => {
  let act: 'send' | 'follow' | 'sent' | 'eval' | 'closed' = 'closed';
  if (/Invia candidatura/.test(nx[0])) act = 'send';
  else if (/Follow/.test(nx[0])) act = 'follow';
  else if (/Inviata/.test(nx[0])) act = 'sent';
  else if (/tedesco/.test(nx[0])) act = 'eval';

  return { id, co, role, st, fit, city, country, mode, pl, nx, comp, sent, prio, act };
};

export const INITIAL_MOCK_APPS: MockApp[] = [
  makeApp('im', 'Enel Innovation Hubs', 'Junior Innovation Manager', 'applied', 96, 'Milano', 'Italia', 'Ibrido', 'LinkedIn', ['🕒 Follow-up tra 4 gg', 'info'], '€1.400/m', '27 ott', 'Alta'),
  makeApp('gm', 'N26', 'Growth Manager Associate', 'applied', 94, 'Milano', 'Italia', 'Ibrido', 'Flexa', ['🕒 Follow-up tra 6 gg', 'info'], '€1.600/m', '27 ott', 'Alta'),
  makeApp('lo', 'Logistica OS', 'Founders Associate Intern', 'applied', 93, 'Monaco', 'Germania', 'In sede', 'LinkedIn', ['✓ Inviata oggi', 'ok'], '€1.300/m', '28 ott', 'Alta'),
  makeApp('fe', 'Fever', 'Growth Graduate Program', 'applied', 91, 'Madrid', 'Spagna', 'In sede', 'LinkedIn', ['🕒 Follow-up tra 5 gg', 'info'], '€1.500/m', '26 ott', 'Alta'),
  makeApp('li', 'Lio', 'Founders Associate Internship · CTO Office', 'todo', 90, 'Monaco', 'Germania', 'In sede', 'Joinrs', ['📝 Invia candidatura', 'warn'], '€1.200/m', '—', 'Media'),
  makeApp('ac', 'Acai Travel', 'Product & Growth Associate', 'applied', 88, 'Barcellona', 'Spagna', 'Ibrido', 'Indeed', ['🕒 Follow-up tra 5 gg', 'info'], '€1.400/m', '26 ott', 'Alta'),
  makeApp('bu', 'BugSense Diagnostics', 'Venture Building & Commercial Lead', 'applied', 86, 'Monaco', 'Germania', 'Ibrido', 'Flexa', ['✓ Inviata oggi', 'ok'], '—', '28 ott', 'Media'),
  makeApp('er', 'ERC System', "Intern · Founder's Associate", 'todo', 84, 'Ottobrunn', 'Germania', 'In sede', 'LinkedIn', ['📝 Invia candidatura', 'warn'], '€1.100/m', '—', 'Media'),
  makeApp('fa', 'Factorial', 'Strategy Analyst Internship - Italian Market', 'applied', 84, 'Barcellona', 'Spagna', 'In sede', 'Joinrs', ['🕒 Follow-up tra 5 gg', 'info'], '€1.000/m', '26 ott', 'Media'),
  makeApp('fi', 'FINN', 'Strategy & Business Development Associate', 'todo', 78, 'Monaco', 'Germania', 'Ibrido', 'LinkedIn', ['⚠ Serve il tedesco', 'warn'], '€50–67,5k/anno', '—', 'Media'),
  makeApp('sk', 'Simon-Kucher', 'Associate Consultant Barcelona', 'applied', 80, 'Barcellona', 'Spagna', 'In sede', 'LinkedIn', ['🕒 Follow-up tra 5 gg', 'info'], '—', '26 ott', 'Media'),
  makeApp('cl', 'Clypp', 'Founders Associate Praktikum', 'todo', 82, 'Monaco', 'Germania', 'In sede', 'LinkedIn', ['📝 Invia candidatura', 'warn'], '€1.000/m', '—', 'Media'),
  makeApp('ve', 'Verisure', 'Business Strategy Consultant', 'applied', 77, 'Pozuelo de Alarcón', 'Spagna', 'In sede', 'LinkedIn', ['🕒 Follow-up tra 5 gg', 'info'], '—', '26 ott', 'Media'),
  makeApp('ss', 'Stranger Soccer', 'Operator & License Owner', 'applied', 79, 'Barcellona', 'Spagna', 'In sede', 'LinkedIn', ['🕒 Follow-up tra 5 gg', 'info'], '—', '26 ott', 'Media'),
  makeApp('sy', 'Syneos Health', 'Partnership Office Analyst Intern', 'rejected', 62, 'Barcellona', 'Spagna', 'In sede', 'LinkedIn', ['Chiusa', 'info'], '—', '—', 'Bassa'),
  makeApp('sp', 'Sphaira', "Founder's Associate", 'rejected', 70, 'Berlino', 'Germania', 'In sede', 'CareerOS', ['Chiusa', 'info'], '—', '—', 'Bassa'),
];

export const INITIAL_DEADLINES: MockDeadline[] = [
  { w: 'Scadute', t: 'sito', n: 'Barilla', d: 'Sito carriere da ricontrollare', when: 'Scaduta 23 ott', c: 'over' },
  { w: 'Scadute', t: 'sito', n: 'Bottle-Up', d: 'Sito carriere da ricontrollare', when: 'Scaduta 23 ott', c: 'over' },
  { w: 'Scadute', t: 'sito', n: 'Foreverland', d: 'Sito carriere da ricontrollare', when: 'Scaduta 23 ott', c: 'over' },
  { w: 'Oggi', t: 'piano', n: 'Piano di ricerca', d: '4 sessioni · Business Development · Barcellona, Madrid, Valencia · circa 96 min', when: 'Oggi', c: 'warn' },
  { w: 'Oggi', t: 'sito', n: 'Siti da controllare', d: '4 siti: Barilla, Bottle-Up, Cloov, Entrepreneur First', when: 'Oggi', c: 'warn' },
  { w: 'Prossimi giorni', t: 'follow', n: 'Stranger Soccer', d: 'Follow-up · Operator & License Owner, Barcellona', when: 'Tra 5 giorni', c: 'info' },
  { w: 'Prossimi giorni', t: 'follow', n: 'Factorial', d: 'Follow-up · Partner Strategy Analyst Italian Market', when: 'Tra 5 giorni', c: 'info' },
  { w: 'Prossimi giorni', t: 'follow', n: 'Simon-Kucher', d: 'Follow-up · Associate Consultant Barcelona', when: 'Tra 5 giorni', c: 'info' },
  { w: 'Prossimi giorni', t: 'follow', n: 'BIP Spain', d: 'Follow-up · Entry-Level Strategy & Operations Consultant', when: 'Tra 5 giorni', c: 'info' },
];

// Official Company Domains Mapping for Crisp Logos
export const COMPANY_DOMAINS: Record<string, string> = {
  // Existing apps
  'Logistica OS': 'logisticaos.com',
  'Fever': 'feverup.com',
  'Lio': 'lio.com',
  'Acai Travel': 'acaitravel.com',
  'BugSense Diagnostics': 'bugsense.com',
  'ERC System': 'erc-system.com',
  'Factorial': 'factorialhr.com',
  'FINN': 'finn.com',
  'Simon-Kucher': 'simon-kucher.com',
  'Clypp': 'clypp.de',
  'Verisure': 'verisure.com',
  'Stranger Soccer': 'strangersoccer.com',
  'Syneos Health': 'syneoshealth.com',
  'Sphaira': 'sphaira.de',
  'BIP Spain': 'bip-group.com',
  // Career sites
  'Barilla': 'barilla.com',
  'Bottle-Up': 'bottle-up.com',
  'Cloov': 'cloov.tech',
  'Entrepreneur First': 'joinef.com',
  'Foreverland': 'foreverlandfood.com',
  'PwC': 'pwc.com',
  'IBM': 'ibm.com',
  'Amazon': 'amazon.com',
  'Google': 'google.com',
  'Meta': 'meta.com',
  'Microsoft': 'microsoft.com',
  'Salesforce': 'salesforce.com',
  'Spotify': 'spotify.com',
  'Stripe': 'stripe.com',
  'Uber': 'uber.com',
  'Adidas': 'adidas.com',
  'Coca-Cola': 'coca-cola.com',
  'Huawei': 'huawei.com',
  'Xiaomi': 'mi.com',
  'Sony': 'sony.com',
  'Apple': 'apple.com',
  'Netflix': 'netflix.com',
  'Airbnb': 'airbnb.com',
  'Revolut': 'revolut.com',
  'N26': 'n26.com',
  'Trade Republic': 'traderepublic.com',
  'Klarna': 'klarna.com',
  'Personio': 'personio.com',
  'Scalable Capital': 'scalable.capital',
  'Celonis': 'celonis.com',
  'Bending Spoons': 'bendingspoons.com',
  'Satispay': 'satispay.com',
  'Qonto': 'qonto.com',
};

export const getCompanyDomain = (coName: string): string => {
  if (!coName) return '';
  const trimmed = coName.trim();
  if (COMPANY_DOMAINS[trimmed]) return COMPANY_DOMAINS[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [name, domain] of Object.entries(COMPANY_DOMAINS)) {
    if (name.toLowerCase() === lower || lower.includes(name.toLowerCase())) {
      return domain;
    }
  }
  const clean = lower.replace(/[^a-z0-9]/g, '');
  return clean ? `${clean}.com` : '';
};

export const getCompanyLogoUrl = (coName: string): string => {
  const domain = getCompanyDomain(coName);
  if (!domain) return '';
  return `https://logo.clearbit.com/${domain}`;
};

// Icon of the company's website, served by Google's public favicon service (no key needed).
// It answers "not found" when the site has no icon, so the initials stay visible.
// The website is taken from the known list above or, failing that, guessed as "<name>.com":
// the guess can be wrong, which is why a logo uploaded by the user always wins.
export const getCompanySiteIconUrl = (coName: string): string => {
  const domain = getCompanyDomain(coName);
  if (!domain) return '';
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=${encodeURIComponent(`https://${domain}`)}`;
};

// Automation Gemini Models: Weekly Scans & Daily Suggestions
export interface MockScaleupItem {
  id: string;
  name: string;
  domain: string;
  sector: 'Fintech' | 'B2B SaaS' | 'HealthTech' | 'ClimateTech' | 'Logistics' | 'Consumer & AI';
  city: string;
  country: string;
  stage: 'Seed' | 'Series A' | 'Series B' | 'Growth / Scaleup';
  size: string;
  roles: string[];
  scannedDate: string;
  fitScore: number;
  keyNote: string;
}

export interface MockDailyPerson {
  id: string;
  name: string;
  role: string;
  company: string;
  city: string;
  linkedinUrl: string;
  connectionNote: string;
  isContacted: boolean;
  avatarSeed: string;
}

export interface MockDailyCompany {
  id: string;
  name: string;
  sector: string;
  city: string;
  country: string;
  stage: string;
  targetRole: string;
  whyFit: string;
  careersUrl: string;
}

export const INITIAL_SCALEUP_DATA: MockScaleupItem[] = [
  {
    id: 'sc-1',
    name: 'Personio',
    domain: 'personio.com',
    sector: 'B2B SaaS',
    city: 'Monaco',
    country: 'Germania',
    stage: 'Growth / Scaleup',
    size: '1.200+',
    roles: ["Founder's Associate", "Strategy & Operations Lead", "Junior Product Manager"],
    scannedDate: 'Domenica 25 ott',
    fitScore: 94,
    keyNote: 'Forte espansione in Europa meridionale, apertura team strategici a Monaco e Madrid.',
  },
  {
    id: 'sc-2',
    name: 'Trade Republic',
    domain: 'traderepublic.com',
    sector: 'Fintech',
    city: 'Berlino',
    country: 'Germania',
    stage: 'Growth / Scaleup',
    size: '800+',
    roles: ["Operations & Expansion Associate", "Business Development Lead"],
    scannedDate: 'Domenica 25 ott',
    fitScore: 92,
    keyNote: 'Crescita rapida nei servizi di risparmio ed espansione europea; focus su profili quantitativi.',
  },
  {
    id: 'sc-3',
    name: 'Factorial',
    domain: 'factorialhr.com',
    sector: 'B2B SaaS',
    city: 'Barcellona',
    country: 'Spagna',
    stage: 'Series B',
    size: '450+',
    roles: ["Strategy Analyst Intern", "Junior Business Developer - Italian Market"],
    scannedDate: 'Domenica 25 ott',
    fitScore: 90,
    keyNote: 'Unicorn a Barcellona, ricerca attiva per accelerare il mercato italiano con talenti bilingui.',
  },
  {
    id: 'sc-4',
    name: 'Cloov',
    domain: 'cloov.tech',
    sector: 'ClimateTech',
    city: 'Milano',
    country: 'Italia',
    stage: 'Seed',
    size: '15-30',
    roles: ["Chief of Staff Intern", "Operations & Partner Associate"],
    scannedDate: 'Domenica 25 ott',
    fitScore: 88,
    keyNote: 'Circular economy SaaS per brand fashion, alto impatto e lavoro fianco a fianco con i fondatori.',
  },
  {
    id: 'sc-5',
    name: 'Celonis',
    domain: 'celonis.com',
    sector: 'B2B SaaS',
    city: 'Monaco',
    country: 'Germania',
    stage: 'Growth / Scaleup',
    size: '2.500+',
    roles: ["Process Mining Strategy Associate", "Business Value Consultant"],
    scannedDate: 'Domenica 25 ott',
    fitScore: 89,
    keyNote: 'Leader mondiale del Process Mining con sede a Monaco. Match perfetto con background Ingegneria Gestionale.',
  },
  {
    id: 'sc-6',
    name: 'Bending Spoons',
    domain: 'bendingspoons.com',
    sector: 'Consumer & AI',
    city: 'Milano',
    country: 'Italia',
    stage: 'Growth / Scaleup',
    size: '400+',
    roles: ["Corporate Development & Strategy Analyst", "Product Operations"],
    scannedDate: 'Domenica 25 ott',
    fitScore: 93,
    keyNote: 'Selezioni aperte per profili di eccellenza ingegneristica e analitica; M&A attivo in Europa.',
  },
  {
    id: 'sc-7',
    name: 'Qonto',
    domain: 'qonto.com',
    sector: 'Fintech',
    city: 'Milano',
    country: 'Italia',
    stage: 'Series B',
    size: '700+',
    roles: ["Growth Strategy & Operations Intern", "Sales Operations Analyst"],
    scannedDate: 'Domenica 25 ott',
    fitScore: 87,
    keyNote: 'Scaleup leader bancaria per PMI, espansione massiccia dell’hub a Milano.',
  },
  {
    id: 'sc-8',
    name: 'Bottle-Up',
    domain: 'bottle-up.com',
    sector: 'Logistics',
    city: 'Bologna / Remoto',
    country: 'Italia',
    stage: 'Seed',
    size: '20-40',
    roles: ["Founders Associate", "Supply Chain & Ops Analyst"],
    scannedDate: 'Domenica 25 ott',
    fitScore: 85,
    keyNote: 'Scaleup personal packaging sostenibile; hiring rapido per figure di coordinamento operativo.',
  },
  {
    id: 'sc-9',
    name: 'Foreverland',
    domain: 'foreverlandfood.com',
    sector: 'ClimateTech',
    city: 'Milano',
    country: 'Italia',
    stage: 'Seed',
    size: '10-25',
    roles: ["Venture Operations Intern", "Business Development"],
    scannedDate: 'Domenica 25 ott',
    fitScore: 84,
    keyNote: 'Innovazione FoodTech cioccolato sostenibile da carruba, premiata a livello europeo.',
  },
];

export const INITIAL_DAILY_COMPANIES: MockDailyCompany[] = [
  {
    id: 'dc-1',
    name: 'Personio',
    sector: 'B2B SaaS',
    city: 'Monaco',
    country: 'Germania',
    stage: 'Unicorn ($8.5B)',
    targetRole: "Founder's Associate / Strategy Intern",
    whyFit: 'Perfetto per il tuo MSc in Innovation & background analitico. Espansione team leadership.',
    careersUrl: 'https://www.personio.com/about-personio/careers/',
  },
  {
    id: 'dc-2',
    name: 'Factorial',
    sector: 'B2B SaaS / HR',
    city: 'Barcellona',
    country: 'Spagna',
    stage: 'Series B ($120M)',
    targetRole: 'Strategy Analyst Internship - Italian Market',
    whyFit: 'Richiedono madrelingua italiano per la crescita rapida a Barcellona. Alta autonomia decisionale.',
    careersUrl: 'https://factorialhr.com/careers',
  },
  {
    id: 'dc-3',
    name: 'Trade Republic',
    sector: 'Fintech & WealthTech',
    city: 'Madrid / Berlino',
    country: 'Spagna',
    stage: 'Scaleup ($5B+)',
    targetRole: 'Operations & Business Expansion Associate',
    whyFit: 'Focus su processi quantitativi ed espansione internazionale dei servizi di brokerage.',
    careersUrl: 'https://traderepublic.com/careers',
  },
];

export const INITIAL_DAILY_PEOPLE: MockDailyPerson[] = [
  {
    id: 'dp-1',
    name: 'Elena Rossi',
    role: 'Head of Talent & Expansion',
    company: 'Factorial',
    city: 'Barcellona',
    linkedinUrl: 'https://www.linkedin.com/search/results/people/?keywords=Elena+Rossi+Factorial+HR',
    connectionNote: 'Ciao Elena, seguo con molto entusiasmo la traiettoria di Factorial a Barcellona. Concludo a breve il MSc in Innovation & Entrepreneurship presso una business school europea con focus su data analytics e go-to-market. Mi farebbe molto piacere connettermi con te!',
    isContacted: false,
    avatarSeed: 'ER',
  },
  {
    id: 'dp-2',
    name: 'Max Schneider',
    role: 'VP Operations & Chief of Staff',
    company: 'Personio',
    city: 'Monaco',
    linkedinUrl: 'https://www.linkedin.com/search/results/people/?keywords=Max+Schneider+Personio+Operations',
    connectionNote: "Hi Max, truly impressed by Personio's scaleup journey across Europe. Graduating from a European business school in Management Engineering & Innovation. Passionate about high-growth SaaS operations, I'd love to connect and follow your work!",
    isContacted: false,
    avatarSeed: 'MS',
  },
  {
    id: 'dp-3',
    name: 'Carlos Mendez',
    role: 'Lead Founder’s Associate',
    company: 'Trade Republic',
    city: 'Madrid',
    linkedinUrl: 'https://www.linkedin.com/search/results/people/?keywords=Carlos+Mendez+Trade+Republic+Associate',
    connectionNote: "Hola Carlos, congratulations on Trade Republic's European expansion. As a Management Engineering graduate from a European business school passionate about fintech operations and scaling, I would love to connect and exchange insights!",
    isContacted: false,
    avatarSeed: 'CM',
  },
];

// Hub Networking LinkedIn Models
export interface HubCodaItem {
  id: string; // e.g. "OW-001", "OW-008", "FE-002", "PA-005"
  name: string;
  role: string;
  company: string;
  country: string;
  linkedinSearchUrl: string;
  motivo: string;
  notaConnessione: string; // max 300 char
  statoInvio: 'In coda' | 'Suggerita' | 'Richiesta inviata' | 'Scartata';
  inviataIl?: string;
  suggeritaIl?: string;
  affidabilita: 'certo' | 'da_verificare'; // ✅ Certo | ⚠️ DA VERIFICARE
  descrizioneAzienda: string;
  linkedinAzienda: string;
  categoria: 'Azienda' | 'Startup' | 'Venture';
  settore: string;
  ciclo?: string;
  note?: string;
}

import { SAMPLE_HUB_CODA, PROCESSED_COMPANIES_REGISTRY, ProcessedCompanyItem } from "./sampleHubData";
export { PROCESSED_COMPANIES_REGISTRY, type ProcessedCompanyItem };

export const INITIAL_HUB_CODA: HubCodaItem[] = SAMPLE_HUB_CODA;

// Helper per calcolo giorno dell'anno e Categoria del Giorno: (giorno dell'anno) mod 3
export const getDayOfYear = (d = new Date()): number => {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime() + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

export const getCategoryOfTheDay = (d = new Date()): 'Azienda' | 'Startup' | 'Venture' => {
  const dayOfYear = getDayOfYear(d);
  const rem = dayOfYear % 3;
  if (rem === 0) return 'Azienda';
  if (rem === 1) return 'Startup';
  return 'Venture';
};

// Configurazione Multi-Account Gmail (1 Ricevente, 2 Monitorate in lettura)
export interface GmailAccountConfig {
  id: string;
  email: string;
  label: string;
  isReceiver: boolean; // riceve l'email del giorno
  isReader: boolean; // letta per esiti candidature e comandi LN FATTO/LN SALTA
  status: 'Attivo' | 'In pausa';
  lastChecked: string;
}

export const INITIAL_GMAIL_ACCOUNTS: GmailAccountConfig[] = [
  {
    id: 'gm-1',
    email: 'demo@example.com',
    label: 'Personale (Ricezione Report & Lettura Risposte)',
    isReceiver: true,
    isReader: true,
    status: 'Attivo',
    lastChecked: 'Oggi 08:00',
  },
  {
    id: 'gm-2',
    email: 'demo.secondary@example.com',
    label: 'Istituzionale (Solo Lettura Risposte Recruiter)',
    isReceiver: false,
    isReader: true,
    status: 'Attivo',
    lastChecked: 'Oggi 08:00',
  },
];

// Settori ordinati per la scansione domenicale
export const WEEKLY_SECTORS = [
  '1 Financial Services / Fintech',
  '2 Retail / E-commerce',
  '3 Consumer Goods / FMCG',
  '4 Healthcare / Life Sciences',
  '5 Energy / Sustainability',
  '6 Tech / SaaS B2B',
  '7 Real Estate / PropTech',
] as const;

export interface UserScoutConfig {
  userName: string;
  userProfile: string;
  googleSheetId: string;
  allLocations: string[];
  selectedLocations: string[];
  allSectors: string[];
  selectedSectors: string[];
  allRoles: string[];
  selectedRoles: string[];
  allInterests: string[];
  selectedInterests: string[];
  customSectorFocus: string;
  targetLocations?: string[];
  targetSectors?: string[];
  targetRoles?: string[];
  customLocations?: string;
  customRoles?: string;
}

export const DEFAULT_USER_SCOUT_CONFIG: UserScoutConfig = {
  userName: 'Alex',
  userProfile: 'studente MSc con background in Ingegneria Gestionale',
  googleSheetId: '',
  allLocations: [
    'Milano',
    'Roma',
    'Torino',
    'Bologna',
    'Monaco',
    'Berlino',
    'Francoforte',
    'Madrid',
    'Barcellona',
    'Valencia',
    'Londra',
    'Parigi',
    'Amsterdam',
    'Zurigo',
    'Dublino',
  ],
  selectedLocations: [
    'Milano',
    'Roma',
    'Monaco',
    'Berlino',
    'Madrid',
    'Barcellona',
    'Londra',
    'Parigi',
  ],
  allSectors: [
    'Edilizia / PropTech & ConTech',
    'AI / Machine Learning & Computer Vision',
    'Tech / SaaS B2B',
    'Financial Services / Fintech',
    'Energy & CleanTech',
    'Healthcare & Life Sciences',
    'Retail & E-commerce',
    'Consumer Goods / FMCG',
    'Venture Capital & Venture Studio',
  ],
  selectedSectors: [
    'Edilizia / PropTech & ConTech',
    'AI / Machine Learning & Computer Vision',
    'Tech / SaaS B2B',
    'Financial Services / Fintech',
    'Energy & CleanTech',
    'Venture Capital & Venture Studio',
  ],
  allRoles: [
    'Founder Associate',
    'Growth Manager',
    'Business Development',
    'Venture Builder',
    'Strategy Analyst',
    'Open Innovation Manager',
    'ConTech Specialist',
    'Investment Associate',
  ],
  selectedRoles: [
    'Founder Associate',
    'Growth Manager',
    'Business Development',
    'Venture Builder',
  ],
  allInterests: [
    'Computer Vision per Cantieri',
    'Robotica Edile & Stampa 3D',
    'Digital Twin & BIM',
    'Materiali Sostenibili & Decarbonizzazione',
    'Scaleup Seed / Series A',
    'Fondatori seriali & Top Executive',
  ],
  selectedInterests: [
    'Computer Vision per Cantieri',
    'Digital Twin & BIM',
    'Materiali Sostenibili & Decarbonizzazione',
  ],
  customSectorFocus: 'Startup migliori ML/MV per edilizia, cantieri intelligenti, ConTech e PropTech europeo',
  targetLocations: ['Milano', 'Roma', 'Monaco', 'Berlino', 'Madrid', 'Barcellona', 'Londra', 'Parigi'],
  targetSectors: ['Edilizia / PropTech & ConTech', 'AI / Machine Learning & Computer Vision', 'Tech / SaaS B2B'],
  targetRoles: ['Founder Associate', 'Growth Manager', 'Business Development', 'Venture Builder'],
  customLocations: '',
  customRoles: '',
};




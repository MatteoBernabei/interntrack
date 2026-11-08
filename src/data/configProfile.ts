export interface PositionFamily {
  id: string;
  name: string; // e.g. "Founder Associate", "Growth", "Innovation"
  equivalentTitles: string[]; // e.g. ["Founder Associate", "Founders Associate", "Founders Office"]
  searchQuery: string; // e.g. '"Founder Associate" OR "Founders Associate"'
  group: string; // e.g. "Founder Associate", "Growth", "Innovation"
  priority: 'Alta' | 'Media' | 'Bassa';
  enabled: boolean;
}

export interface CityTarget {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  localJuniorTerms: string; // e.g. "Praktikum, Werkstudent" for DE, "Prácticas, Becario" for ES
  enabled: boolean;
}

export interface PlatformConfig {
  id: string;
  name: string;
  enabled: boolean;
  minutesPerSession: number;
  countries: string[];
}

export interface SearchPlanConfig {
  startDate: string; // "2026-10-24"
  endDate: string; // "2026-12-18"
  activeDays: string[]; // ["lun", "mar", "mer", "gio", "ven"]
  minutesPerDay: number; // 120
  sitesPerDay: number; // 4
  followUpDays: number; // 7
}

export interface UserCVProfile {
  fullName: string;
  emailPrimary: string;
  emailSecondary: string;
  objective: string; // "Primo lavoro da gennaio 2027"
  targetAvailableFrom: string; // "Gennaio 2027"
  targetRolesSummary: string; // "Strategia e innovazione, go-to-market e crescita, analisi dati (Python, Excel), ottimizzazione dei processi"
  education: string; // "MSc in Innovation & Entrepreneurship, laurea in Ing. Gestionale"
  languages: Array<{ language: string; level: string }>;
  flagLanguagesInAds: string[]; // ["Tedesco"]
}

export interface AllowedFieldValues {
  statuses: string[];
  priorities: string[];
  jobTypes: string[];
  contractTypes: string[];
  workModes: string[];
  interviewStages: string[];
  roleGroups: string[];
  courseCategories: string[];
}

export interface FullSearchConfigProfile {
  positions: PositionFamily[];
  seniorityLevelsToSearch: string[];
  seniorityLevelsToDiscard: string[];
  excludedRoleTypes: string[];
  cities: CityTarget[];
  platforms: PlatformConfig[];
  searchPlan: SearchPlanConfig;
  allowedValues: AllowedFieldValues;
  userProfile: UserCVProfile;
}

export const INITIAL_SEARCH_CONFIG: FullSearchConfigProfile = {
  // 1 & 2: Posizioni cercate e titoli per ogni posizione
  positions: [
    {
      id: 'p-fa',
      name: 'Founder Associate',
      equivalentTitles: ['Founder Associate', 'Founders Associate', 'Founders Office', "Chief of Staff Intern"],
      searchQuery: '"Founder Associate" OR "Founders Associate" OR "Founders Office"',
      group: 'Founder Associate',
      priority: 'Alta',
      enabled: true,
    },
    {
      id: 'p-bd',
      name: 'Business Development',
      equivalentTitles: ['Business Development Associate', 'Business Development Analyst', 'Junior Business Developer'],
      searchQuery: '"Business Development Associate" OR "Business Development Analyst" OR "Junior Business Developer"',
      group: 'Business Developer',
      priority: 'Alta',
      enabled: true,
    },
    {
      id: 'p-gr',
      name: 'Growth',
      equivalentTitles: ['Growth Associate', 'Growth Analyst', 'Growth Marketing Associate', 'Junior Growth Manager'],
      searchQuery: '"Growth Associate" OR "Growth Analyst" OR "Growth Marketing Associate"',
      group: 'Growth',
      priority: 'Alta',
      enabled: true,
    },
    {
      id: 'p-gtm',
      name: 'GTM (Go-to-Market)',
      equivalentTitles: ['GTM Associate', 'Go-to-Market Associate', 'Product Marketing Associate'],
      searchQuery: '"GTM Associate" OR "Go-to-Market Associate" OR "Product Marketing Associate"',
      group: 'Strategia e analisi',
      priority: 'Media',
      enabled: true,
    },
    {
      id: 'p-vb',
      name: 'Venture Builder',
      equivalentTitles: ['Venture Building Associate', 'Venture Builder', 'Venture Analyst', 'Venture Operations Intern'],
      searchQuery: '"Venture Building Associate" OR "Venture Builder" OR "Venture Analyst"',
      group: 'Operations',
      priority: 'Alta',
      enabled: true,
    },
    {
      id: 'p-in',
      name: 'Innovation',
      equivalentTitles: ['Open Innovation Analyst', 'Innovation Analyst', 'Innovation Associate', 'Junior Innovation Manager'],
      searchQuery: '"Open Innovation Analyst" OR "Innovation Analyst" OR "Innovation Associate"',
      group: 'Innovation',
      priority: 'Alta',
      enabled: true,
    },
    {
      id: 'p-st',
      name: 'Strategia e Analisi',
      equivalentTitles: ['Strategy Analyst', 'Corporate Development Analyst', 'Junior Strategy Consultant'],
      searchQuery: '"Strategy Analyst" OR "Corporate Development Analyst"',
      group: 'Strategia e analisi',
      priority: 'Media',
      enabled: true,
    },
    {
      id: 'p-co',
      name: 'Consulenza',
      equivalentTitles: ['Associate Consultant', 'Junior Consultant', 'Business Analyst Consultant'],
      searchQuery: '"Associate Consultant" OR "Business Analyst Consultant"',
      group: 'Consulenza',
      priority: 'Media',
      enabled: true,
    },
  ],

  // 3: Livelli di seniority
  seniorityLevelsToSearch: [
    'Intern',
    'Stage',
    'Graduate',
    'Junior',
    'Associate',
    'Analyst',
    'Entry level',
  ],
  seniorityLevelsToDiscard: [
    'Senior',
    'Head of',
    'Director',
  ],

  // 4: Cose da escludere
  excludedRoleTypes: [
    'Vendita a freddo (SDR, BDR, Account Executive)',
    'Assistente esecutivo',
    'PMO (Project Management Office)',
  ],

  // 5: Paesi e città
  cities: [
    // Spagna
    { id: 'c-bcn', city: 'Barcellona', country: 'Spagna', countryCode: 'ES', localJuniorTerms: 'Prácticas, Becario, Junior', enabled: true },
    { id: 'c-mad', city: 'Madrid', country: 'Spagna', countryCode: 'ES', localJuniorTerms: 'Prácticas, Becario, Junior', enabled: true },
    { id: 'c-val', city: 'Valencia', country: 'Spagna', countryCode: 'ES', localJuniorTerms: 'Prácticas, Junior', enabled: true },
    { id: 'c-sev', city: 'Siviglia', country: 'Spagna', countryCode: 'ES', localJuniorTerms: 'Prácticas', enabled: true },
    // Germania
    { id: 'c-ber', city: 'Berlino', country: 'Germania', countryCode: 'DE', localJuniorTerms: 'Praktikum, Werkstudent, Trainee', enabled: true },
    { id: 'c-mun', city: 'Monaco', country: 'Germania', countryCode: 'DE', localJuniorTerms: 'Praktikum, Werkstudent', enabled: true },
    { id: 'c-ham', city: 'Amburgo', country: 'Germania', countryCode: 'DE', localJuniorTerms: 'Praktikum', enabled: true },
    { id: 'c-fra', city: 'Francoforte', country: 'Germania', countryCode: 'DE', localJuniorTerms: 'Praktikum, Analyst', enabled: true },
    { id: 'c-col', city: 'Colonia', country: 'Germania', countryCode: 'DE', localJuniorTerms: 'Praktikum', enabled: true },
    // Irlanda
    { id: 'c-dub', city: 'Dublino', country: 'Irlanda', countryCode: 'IE', localJuniorTerms: 'Graduate, Entry Level, Associate', enabled: true },
    { id: 'c-gal', city: 'Galway', country: 'Irlanda', countryCode: 'IE', localJuniorTerms: 'Graduate', enabled: true },
    // Paesi Bassi
    { id: 'c-ams', city: 'Amsterdam', country: 'Paesi Bassi', countryCode: 'NL', localJuniorTerms: 'Stage, Traineeship, Junior', enabled: true },
    { id: 'c-rot', city: 'Rotterdam', country: 'Paesi Bassi', countryCode: 'NL', localJuniorTerms: 'Stage, Junior', enabled: true },
    { id: 'c-utr', city: 'Utrecht', country: 'Paesi Bassi', countryCode: 'NL', localJuniorTerms: 'Stage', enabled: true },
    // Lussemburgo
    { id: 'c-lux', city: 'Lussemburgo', country: 'Lussemburgo', countryCode: 'LU', localJuniorTerms: 'Stage, Trainee', enabled: true },
    // Austria
    { id: 'c-vie', city: 'Vienna', country: 'Austria', countryCode: 'AT', localJuniorTerms: 'Praktikum, Trainee', enabled: true },
    // Belgio
    { id: 'c-bru', city: 'Bruxelles', country: 'Belgio', countryCode: 'BE', localJuniorTerms: 'Stage, Trainee', enabled: true },
    { id: 'c-anv', city: 'Anversa', country: 'Belgio', countryCode: 'BE', localJuniorTerms: 'Stage', enabled: true },
    // Portogallo
    { id: 'c-lis', city: 'Lisbona', country: 'Portogallo', countryCode: 'PT', localJuniorTerms: 'Estágio, Trainee', enabled: true },
    { id: 'c-por', city: 'Porto', country: 'Portogallo', countryCode: 'PT', localJuniorTerms: 'Estágio', enabled: true },
    { id: 'c-bra', city: 'Braga', country: 'Portogallo', countryCode: 'PT', localJuniorTerms: 'Estágio', enabled: true },
    // Svezia & Danimarca
    { id: 'c-sto', city: 'Stoccolma', country: 'Svezia', countryCode: 'SE', localJuniorTerms: 'Internship, Trainee', enabled: true },
    { id: 'c-cph', city: 'Copenaghen', country: 'Danimarca', countryCode: 'DK', localJuniorTerms: 'Internship, Graduate', enabled: true },
    // Svizzera
    { id: 'c-zur', city: 'Zurigo', country: 'Svizzera', countryCode: 'CH', localJuniorTerms: 'Praktikum, Intern', enabled: true },
    { id: 'c-gen', city: 'Ginevra', country: 'Svizzera', countryCode: 'CH', localJuniorTerms: 'Stage, Intern', enabled: true },
    { id: 'c-bas', city: 'Basilea', country: 'Svizzera', countryCode: 'CH', localJuniorTerms: 'Praktikum', enabled: true },
    { id: 'c-ber2', city: 'Berna', country: 'Svizzera', countryCode: 'CH', localJuniorTerms: 'Praktikum', enabled: true },
    // Francia
    { id: 'c-par', city: 'Parigi', country: 'Francia', countryCode: 'FR', localJuniorTerms: 'Stage, Alternance, Junior', enabled: true },
    // Polonia
    { id: 'c-war', city: 'Varsavia', country: 'Polonia', countryCode: 'PL', localJuniorTerms: 'Praktyki, Staż, Junior', enabled: true },
    { id: 'c-kra', city: 'Cracovia', country: 'Polonia', countryCode: 'PL', localJuniorTerms: 'Staż, Junior', enabled: true },
    // Regno Unito
    { id: 'c-lon', city: 'Londra', country: 'Regno Unito', countryCode: 'UK', localJuniorTerms: 'Graduate, Intern, Analyst', enabled: true },
    { id: 'c-man', city: 'Manchester', country: 'Regno Unito', countryCode: 'UK', localJuniorTerms: 'Graduate, Entry Level', enabled: true },
    // Italia (Sede primaria)
    { id: 'c-mil', city: 'Milano', country: 'Italia', countryCode: 'IT', localJuniorTerms: 'Stage, Tirocinio, Junior', enabled: true },
  ],

  // 6: Lingue
  userProfile: {
    fullName: 'Alex Rossi',
    emailPrimary: 'demo@example.com',
    emailSecondary: 'demo.secondary@example.com',
    objective: 'Primo lavoro da gennaio 2027',
    targetAvailableFrom: 'Gennaio 2027',
    targetRolesSummary: 'Strategia e innovazione, go-to-market e crescita, analisi dati (Python, Excel), ottimizzazione dei processi',
    education: 'MSc in Innovation & Entrepreneurship, laurea in Ing. Gestionale',
    languages: [
      { language: 'Italiano', level: 'Madrelingua' },
      { language: 'Inglese', level: 'Fluente (C1/C2)' },
      { language: 'Francese', level: 'Base (A2/B1)' },
    ],
    flagLanguagesInAds: ['Tedesco'],
  },

  // 7: Piattaforme
  platforms: [
    { id: 'pl-li', name: 'LinkedIn', enabled: true, minutesPerSession: 7, countries: ['Tutti'] },
    { id: 'pl-in', name: 'Indeed', enabled: true, minutesPerSession: 6, countries: ['IT', 'ES', 'DE', 'UK'] },
    { id: 'pl-jo', name: 'Joinrs', enabled: true, minutesPerSession: 5, countries: ['IT', 'ES'] },
    { id: 'pl-ca', name: 'CareerOS', enabled: true, minutesPerSession: 3, countries: ['Tutti'] },
    { id: 'pl-fl', name: 'Flexa', enabled: true, minutesPerSession: 3, countries: ['UK', 'Remoto', 'Europa'] },
    // Disattivate
    { id: 'pl-wf', name: 'Wellfound', enabled: false, minutesPerSession: 4, countries: ['US', 'UK'] },
    { id: 'pl-ij', name: 'InfoJobs', enabled: false, minutesPerSession: 4, countries: ['ES', 'IT'] },
    { id: 'pl-st', name: 'StepStone', enabled: false, minutesPerSession: 4, countries: ['DE'] },
    { id: 'pl-ir', name: 'IrishJobs', enabled: false, minutesPerSession: 4, countries: ['IE'] },
    { id: 'pl-wj', name: 'Welcome to the Jungle', enabled: false, minutesPerSession: 4, countries: ['FR', 'ES'] },
    { id: 'pl-re', name: 'Reed', enabled: false, minutesPerSession: 4, countries: ['UK'] },
  ],

  // 8: Piano di ricerca
  searchPlan: {
    startDate: '2026-10-24',
    endDate: '2026-12-18',
    activeDays: ['lun', 'mar', 'mer', 'gio', 'ven'],
    minutesPerDay: 120,
    sitesPerDay: 4,
    followUpDays: 7,
  },

  // 9: Valori ammessi dei campi
  allowedValues: {
    statuses: ['Da candidarmi', 'Candidato', 'Colloquio', 'Offerta', 'Rifiutato'],
    priorities: ['Alta', 'Media', 'Bassa'],
    jobTypes: ['stage', 'tirocinio', 'apprendistato', 'graduate', 'lavoro', 'part-time', 'altro'],
    contractTypes: ['stage', 'apprendistato', 'determinato', 'indeterminato', 'P.IVA'],
    workModes: ['in sede', 'ibrido', 'remoto'],
    interviewStages: ['HR', 'Tecnico', 'Case', 'Gruppo', 'Finale', 'Test'],
    roleGroups: [
      'Founder Associate',
      'Growth',
      'Strategia e analisi',
      'Business Developer',
      'Consulenza',
      'Operations',
      'Innovation',
      'Graduate Program',
      'Altro',
    ],
    courseCategories: [
      'Dati',
      'Excel',
      'AI',
      'Programmazione',
      'Business',
      'Soft skills',
      'Lingue',
      'Altro',
    ],
  },
};

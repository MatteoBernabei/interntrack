import { beforeAll, describe, expect, test } from 'vitest';
import { installFirebaseMocks } from './firebaseMocks';
import { renderAndVisitAllPages } from './helpers';
import { INITIAL_DAILY_COMPANIES, INITIAL_DAILY_PEOPLE, INITIAL_DEADLINES, INITIAL_MOCK_APPS, INITIAL_SCALEUP_DATA, DEFAULT_USER_SCOUT_CONFIG } from '../src/data/mockupData';
import { PROCESSED_COMPANIES_REGISTRY, SAMPLE_HUB_CODA } from '../src/data/sampleHubData';
import { INITIAL_SEARCH_CONFIG } from '../src/data/configProfile';

// ANTI-DEMO TEST. Real mode (Firebase configured), signed-in user, EMPTY database.
// Rule from the user: nothing on screen unless it was entered by the user, comes from Google,
// or is computed from those two. This test walks every page and reports what breaks the rule.

const strings = (list: any[], keys: string[]) =>
  list.flatMap((item) => keys.map((k) => item?.[k])).filter((v): v is string => typeof v === 'string' && v.trim().length >= 4);

// Names that exist only in the sample data: companies, people, the sample persona.
const SAMPLE_NAMES = [...new Set([
  ...strings(INITIAL_MOCK_APPS as any[], ['co']),
  ...strings(INITIAL_DEADLINES as any[], ['co']),
  ...strings(INITIAL_SCALEUP_DATA as any[], ['name', 'co', 'company']),
  ...strings(INITIAL_DAILY_COMPANIES as any[], ['name', 'co', 'company']),
  ...strings(INITIAL_DAILY_PEOPLE as any[], ['name', 'company']),
  ...strings(SAMPLE_HUB_CODA as any[], ['nome', 'azienda']),
  ...strings(PROCESSED_COMPANIES_REGISTRY as any[], ['name', 'azienda', 'company']),
  INITIAL_SEARCH_CONFIG.userProfile.fullName,
  DEFAULT_USER_SCOUT_CONFIG.userName,
  'Alex Rossi',
].filter((v): v is string => typeof v === 'string' && v.trim().length >= 4))];

// Status and marketing wording that claims something nobody has checked.
const UNVERIFIED_CLAIMS: Array<[string, RegExp]> = [
  ['parola "esempio"', /\besempi?o?\b/i],
  ['stato "Attiva/Attivo" non verificato', /^attiv[ao]$|\bAttiv[ao]\b(?! per)|automazione[^.]*attiva/],
  ['stato "Sincronizzato" non verificato', /sincronizzat[oa]/i],
  ['promessa "in automatico"', /in automatico|zero pulsanti|automazione quotidiana/i],
];

let pages: Record<string, string[]> = {};

beforeAll(async () => {
  localStorage.clear();
  installFirebaseMocks();
  pages = await renderAndVisitAllPages();
});

const findings = (match: (text: string) => string | null) => {
  const found = new Map<string, Set<string>>();
  for (const [page, texts] of Object.entries(pages)) {
    for (const t of texts) {
      const why = match(t);
      if (!why) continue;
      const key = `${why} → "${t.length > 110 ? t.slice(0, 110) + '…' : t}"`;
      if (!found.has(key)) found.set(key, new Set());
      found.get(key)!.add(page);
    }
  }
  return [...found.keys()].sort();
};

describe('modalità reale, database vuoto', () => {
  test('l\'app si apre e tutte le pagine sono raggiungibili', () => {
    expect(Object.keys(pages).length).toBe(9);
  });

  test('nessun nome dei dati di esempio (aziende, persone, profilo finto)', () => {
    const lower = SAMPLE_NAMES.map((n) => [n, n.toLowerCase()] as const);
    const hits = findings((t) => {
      const tl = t.toLowerCase();
      const hit = lower.find(([, l]) => tl.includes(l));
      return hit ? `nome di esempio «${hit[0]}»` : null;
    });
    expect(hits).toEqual([]);
  });

  test('nessuna scritta di stato o promessa non verificata', () => {
    const hits = findings((t) => UNVERIFIED_CLAIMS.find(([, re]) => re.test(t))?.[0] ?? null);
    expect(hits).toEqual([]);
  });

  test('nessun conteggio diverso da zero quando non ci sono dati', () => {
    // badges in the navigation must not exist at all when the database is empty
    const hits = findings((t) => (/^\d+$/.test(t) && Number(t) > 0 && Number(t) < 1000 ? 'numero senza dati' : null));
    // allowed because they come from today's date, not from data: calendar days (1..31) and the day of the year
    // (the networking page shows it to explain which category is suggested today)
    const now = new Date();
    const dayOfYear = String(Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000));
    const allowed = (h: string) => /"(?:[1-9]|[12]\d|3[01])"$/.test(h) || h.endsWith(`"${dayOfYear}"`);
    expect(hits.filter((h) => !allowed(h))).toEqual([]);
  });
});

import { beforeAll, describe, expect, test } from 'vitest';
import { installFirebaseMocks } from './firebaseMocks';
import { renderAndVisitAllPages, visibleTexts } from './helpers';
import { INITIAL_DAILY_COMPANIES, INITIAL_DAILY_PEOPLE, INITIAL_DEADLINES, INITIAL_MOCK_APPS, INITIAL_SCALEUP_DATA, DEFAULT_USER_SCOUT_CONFIG } from '../src/data/mockupData';
import { PROCESSED_COMPANIES_REGISTRY, SAMPLE_HUB_CODA } from '../src/data/sampleHubData';
import { INITIAL_SEARCH_CONFIG } from '../src/data/configProfile';

// ANTI-DEMO TEST. Real app (Firebase configured), signed-in user, EMPTY database, in one language.
// Rule from the user: nothing on screen unless it was entered by the user, comes from Google,
// or is computed from those two. The test walks every page reachable from the left bar.
//
// What it does NOT see: content behind inner tabs that are not open at start, pop-up windows,
// and anything that needs real Google data. Those still need a check by hand.

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
const UNVERIFIED_CLAIMS: Record<'it' | 'en', Array<[string, RegExp]>> = {
  it: [
    ['parola "esempio"', /\besempi?o?\b/i],
    ['stato "Attiva/Attivo" non verificato', /^attiv[ao]$|\bAttiv[ao]\b(?! per)|automazione[^.]*attiva/],
    ['stato "Sincronizzato" non verificato', /sincronizzat[oaie]/i],
    ['promessa di automatismo', /in automatico|zero pulsanti|automazione quotidiana|sync automatico|il sistema estrae/i],
  ],
  en: [
    ['word "example/sample"', /\b(example|sample)\b/i],
    ['unverified "Active" status', /^active$|automation[^.]*active/i],
    ['unverified "Synced" status', /\bsync(ed|hronized|hronised)\b/i],
    ['promise of automation', /zero buttons|daily automation|automatic sync|the system extracts|daily delivery/i],
  ],
};

// Italian words that should not survive on an English screen.
const ITALIAN_WORD = /\b(il|lo|la|le|gli|di|del|della|dei|delle|con|che|non|sono|è|una|uno|nel|nella|tuo|tua|tuoi|oggi|nessun[ao]?|candidatur[ae]|aggiungi|salva|colloqui[o]?|scadenz[ae]|posta|ricerca|impostazioni|azienda|aziende|ruolo|città|giorni|giorno|quando|oppure|anche|ogni|questo|questa|tutti|tutte|modifica|elimina|annulla|invia|apri|chiudi|settimana|mese|nuov[oaie]|picco|offert[ae]|da fare|completat[ie]|attiv[ei]|inviat[ei]|lett[ei]|totali|sede|compenso|stato|quota|risposte|prossim[oie]|ultim[eoi]|elenco|carica|scarica|cerca|lingua|priorità|corsi|competenze|domande|punti)\b/i;

const EMOJI = /\p{Extended_Pictographic}/u;
const ALLOWED_SYMBOLS = /[✓✔●○★☆©®™↗↔▶◀▲▼⌘✕]/gu; // plain symbols, not emoji

// KNOWN DEBT, can only go down. Lower these numbers whenever the count drops; never raise them.
const MAX_EMOJI_ICONS = 0; // icons still drawn with an emoji instead of a line icon
const MAX_ITALIAN_LEFT_IN_ENGLISH = 1; // fragments of sentences not translated yet

export function realModeChecks(lang: 'it' | 'en') {
  let pages: Record<string, string[]> = {};
  let numbersOutsideCalendar: string[] = [];

  beforeAll(async () => {
    localStorage.clear();
    installFirebaseMocks();
    pages = await renderAndVisitAllPages(lang, (doc) => {
      // day numbers belong to the calendar grid; everywhere else a bare number must come from data
      const calendar = doc.querySelector('#v-cal');
      const inCalendar = new Set(calendar ? visibleTexts(calendar) : []);
      numbersOutsideCalendar = visibleTexts(doc.body).filter((t) => /^\d+$/.test(t) && Number(t) > 0 && !inCalendar.has(t));
    });
  });

  const all = () => [...new Set(Object.values(pages).flat())].sort();
  const short = (t: string) => (t.length > 110 ? t.slice(0, 110) + '…' : t);

  describe(`app reale, database vuoto, lingua ${lang}`, () => {
    test("l'app si apre e tutte le pagine sono raggiungibili", () => {
      expect(Object.keys(pages).length).toBe(9);
    });

    test('nessun nome dei dati di esempio (aziende, persone, profilo finto)', () => {
      const lower = SAMPLE_NAMES.map((n) => [n, n.toLowerCase()] as const);
      const hits = all().flatMap((t) => {
        const hit = lower.find(([, l]) => t.toLowerCase().includes(l));
        return hit ? [`«${hit[0]}» → "${short(t)}"`] : [];
      });
      expect(hits).toEqual([]);
    });

    test('nessuna scritta di stato o promessa non verificata', () => {
      const hits = all().flatMap((t) => {
        const why = UNVERIFIED_CLAIMS[lang].find(([, re]) => re.test(t))?.[0];
        return why ? [`${why} → "${short(t)}"`] : [];
      });
      expect(hits).toEqual([]);
    });

    test('nessun numero diverso da zero quando non ci sono dati', () => {
      // allowed: the day of the year is computed from today's date
      const now = new Date();
      const dayOfYear = String(Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000));
      expect(numbersOutsideCalendar.filter((n) => n !== dayOfYear)).toEqual([]);
    });

    test('nessuna emoji dentro le scritte', () => {
      const hits = all().filter((t) => /[\p{L}\p{N}]/u.test(t) && EMOJI.test(t.replace(ALLOWED_SYMBOLS, '')));
      expect(hits.map(short)).toEqual([]);
    });

    test('le icone fatte con emoji non aumentano', () => {
      const icons = all().filter((t) => !/[\p{L}\p{N}]/u.test(t) && EMOJI.test(t.replace(ALLOWED_SYMBOLS, '')));
      expect(icons.length).toBeLessThanOrEqual(MAX_EMOJI_ICONS);
    });

    if (lang === 'en') {
      test("l'italiano rimasto nella versione inglese non aumenta", () => {
        const left = all().filter((t) => ITALIAN_WORD.test(t));
        expect(left.length, left.map(short).join(' | ')).toBeLessThanOrEqual(MAX_ITALIAN_LEFT_IN_ENGLISH);
      });
    }
  });
}

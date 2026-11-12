import { act } from '@testing-library/react';
import { beforeAll, describe, expect, test } from 'vitest';
import { fakeDb, installFirebaseMocks } from './firebaseMocks';
import { renderAndVisitAllPages, visibleTexts } from './helpers';
import { ITALIAN_WORD } from './realModeChecks';

// Real app WITH one application in the database, in one language.
// Many texts only appear when there is data (counters, next steps, the detail panel):
// the empty-database test cannot see them, this one can.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Entirely fictional record: names chosen so they cannot be confused with Italian or English words.
const APPLICATION = {
  id: 'app-test-1',
  userId: 'test-uid',
  co: 'Zorvex',
  role: 'Qwertz Zxcvb',
  city: 'Xyzzyburg',
  country: '',
  mode: '',
  st: 'todo',
  fit: 0,
  pl: 'LinkedIn',
  nx: ['📝 Invia candidatura', 'warn'],
  comp: '2000$/m',
  sent: '—',
  prio: 'Media',
  act: 'send',
  url: 'https://jobs.zorvex.test/qwertz',
  desc: 'Zxcvb qwertz asdfg.',
  notes: '',
};

export function realModeWithDataChecks(lang: 'it' | 'en') {
  let texts: string[] = [];
  let detail: string[] = [];
  let hrefs: string[] = [];

  beforeAll(async () => {
    localStorage.clear();
    fakeDb.applications = [APPLICATION];
    installFirebaseMocks();
    const pages = await renderAndVisitAllPages(lang, undefined, async (doc) => {
      // open the detail panel of the application from the applications table
      const row = [...doc.querySelectorAll<HTMLElement>('#v-trk tbody tr')].find((tr) => tr.textContent?.includes('Zorvex'));
      await act(async () => { row?.click(); await wait(40); });
      const drawer = doc.querySelector('#drawer');
      detail = drawer ? visibleTexts(drawer) : [];
      hrefs = drawer ? [...drawer.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') || '') : [];
    });
    texts = [...new Set(Object.values(pages).flat())].sort();
  });

  describe(`app reale, una candidatura, lingua ${lang}`, () => {
    test('la candidatura compare', () => {
      expect(texts.some((t) => t.includes('Zorvex'))).toBe(true);
    });

    test('nessun punteggio di affinità inventato', () => {
      expect(texts.filter((t) => /^(8\d|9\d)%$/.test(t))).toEqual([]);
      expect(texts.filter((t) => /^Fit: /.test(t))).toEqual([]);
    });

    test('il compenso mantiene la valuta scritta dall\'utente', () => {
      // the € sign may only appear as an option of the currency list or in a hint, never next to an amount
      expect(texts.filter((t) => /€\s?\d/.test(t) && !t.startsWith('[placeholder]'))).toEqual([]);
      expect(texts.some((t) => t.includes('$2.000'))).toBe(true);
    });

    test('nessuna sede o compenso precompilati', () => {
      // "Italia" is legitimately one of the countries in the pick list; it must not be in the record itself
      expect(texts.filter((t) => /\b(Milano|Milan)\b/.test(t) && !/es\.|e\.g\./.test(t) && !t.startsWith('[placeholder]'))).toEqual([]);
      expect(detail.filter((t) => /\b(Italia|Italy)\b/.test(t))).toEqual([]);
    });

    test('la scheda mostra link e descrizione, modificabili', () => {
      expect(hrefs).toContain('https://jobs.zorvex.test/qwertz');
      expect(detail.some((t) => t.includes('Zxcvb qwertz asdfg.'))).toBe(true);
    });

    test('nessuna emoji dentro le scritte', () => {
      const hits = texts.filter((t) => /[\p{L}\p{N}]/u.test(t) && /\p{Extended_Pictographic}/u.test(t.replace(/[✓✔●○★☆©®™↗↔▶◀▲▼⌘✕]/gu, '')));
      expect(hits).toEqual([]);
    });

    if (lang === 'en') {
      test('nessuna frase in italiano nella versione inglese', () => {
        const left = [...texts, ...detail].filter((t) => ITALIAN_WORD.test(t));
        expect([...new Set(left)]).toEqual([]);
      });
    }
  });
}

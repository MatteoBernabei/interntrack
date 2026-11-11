import { act, cleanup, render } from '@testing-library/react';
import enDict from '../src/i18n/en.json';
import realEn from '../src/i18n/real.en.json';
import realIt from '../src/i18n/real.it.json';

export const RAIL_PAGES = [
  'Dashboard',
  'Tracker candidature',
  'Calendario e Scadenze',
  'Piano di ricerca',
  'Corsi e Competenze',
  'Suggerimenti e Networking',
  'AI Copilot',
  'Notifiche',
  'Impostazioni',
];

/** Labels the same buttons can show on screen (English, and the cleaned-up names of the real app). */
export const RAIL_LABELS_SHOWN: Record<string, string[]> = Object.fromEntries(
  RAIL_PAGES.map((l) => [l, [(enDict as Record<string, string>)[l], (realIt as Record<string, string>)[l], (realEn as Record<string, string>)[l]].filter(Boolean)]),
);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Every piece of text a user can read (text nodes, placeholders, titles, aria-labels), de-duplicated and sorted. */
export function visibleTexts(root: ParentNode = document.body): string[] {
  const out = new Set<string>();
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const tag = node.parentElement?.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') continue;
    const t = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) out.add(t);
  }
  (root as Element).querySelectorAll?.('[placeholder],[title],[aria-label]').forEach((el) => {
    for (const attr of ['placeholder', 'title', 'aria-label']) {
      const v = el.getAttribute(attr)?.replace(/\s+/g, ' ').trim();
      if (v) out.add(`[${attr}] ${v}`);
    }
  });
  return [...out].sort();
}

/** Renders the app, visits every page from the left rail and returns the texts seen on each. */
export async function renderAndVisitAllPages(lang?: 'it' | 'en', inspect?: (doc: Document) => void): Promise<Record<string, string[]>> {
  // With a language, the on-screen translation layer runs exactly as in the browser (see src/main.tsx).
  // Without it, the test reads the Italian source texts as written in the code.
  if (lang) {
    localStorage.setItem('interntrack_lang', lang);
    const { installDomTranslation } = await import('../src/i18n/domTranslate');
    installDomTranslation();
  }
  const { default: App } = await import('../src/App');
  await act(async () => {
    render(<App />);
    await wait(50);
  });
  const pages: Record<string, string[]> = {};
  for (const label of RAIL_PAGES) {
    // the label on screen may be the Italian source or its translation
    const btn = [...document.querySelectorAll<HTMLElement>('nav.rail [aria-label]')].find((el) => {
      const shown = el.getAttribute('aria-label') || '';
      return shown === label || (RAIL_LABELS_SHOWN[label] || []).includes(shown);
    });
    if (!btn) throw new Error(`Pulsante di navigazione non trovato: ${label}`);
    await act(async () => {
      btn.click();
      await wait(30);
    });
    await act(async () => { await wait(20); }); // lets the translation layer finish
    pages[label] = visibleTexts();
  }
  inspect?.(document); // extra checks on the live page, before it is removed
  cleanup();
  return pages;
}

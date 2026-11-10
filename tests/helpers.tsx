import { act, cleanup, render } from '@testing-library/react';

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
export async function renderAndVisitAllPages(): Promise<Record<string, string[]>> {
  const { default: App } = await import('../src/App');
  await act(async () => {
    render(<App />);
    await wait(50);
  });
  const pages: Record<string, string[]> = {};
  for (const label of RAIL_PAGES) {
    const btn = document.querySelector<HTMLElement>(`nav.rail [aria-label="${label}"]`);
    if (!btn) throw new Error(`Pulsante di navigazione non trovato: ${label}`);
    await act(async () => {
      btn.click();
      await wait(30);
    });
    pages[label] = visibleTexts();
  }
  cleanup();
  return pages;
}

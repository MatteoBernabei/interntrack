import { act, cleanup, render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { installFirebaseMocks } from './firebaseMocks';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const railLabels = () => [...document.querySelectorAll('nav.rail [aria-label]')].map((el) => el.getAttribute('aria-label'));

// Real app: the EN | IT switch must change every label and come back cleanly, without reloading the page.
test('il cambio lingua IT → EN → IT funziona senza ricaricare', async () => {
  localStorage.clear();
  localStorage.setItem('interntrack_lang', 'it');
  installFirebaseMocks();
  const { installDomTranslation } = await import('../src/i18n/domTranslate');
  const { setAppLang } = await import('../src/i18n');
  installDomTranslation();
  const { default: App } = await import('../src/App');
  await act(async () => { render(<App />); await wait(60); });

  expect(railLabels()).toContain('Candidature');
  expect(railLabels()).toContain('Configurazione');

  await act(async () => { setAppLang('en'); await wait(60); });
  expect(railLabels()).toContain('Applications');
  expect(railLabels()).toContain('Settings');
  expect(railLabels()).not.toContain('Candidature');

  await act(async () => { setAppLang('it'); await wait(60); });
  expect(railLabels()).toContain('Candidature');
  expect(railLabels()).not.toContain('Applications');
  cleanup();
});

import { expect, test } from 'vitest';
import { renderAndVisitAllPages } from './helpers';

// DEMO mode shown in English, which is what a visitor of the public portfolio sees by default.
// Guards the on-screen translation layer: changes made for the real app must not alter the demo.
// If a change to the demo IS intended, update the snapshot with:  npm test -- -u
test('la demo pubblica in inglese mostra gli stessi testi di prima', async () => {
  const pages = await renderAndVisitAllPages('en');
  expect(new Set(Object.values(pages).flat()).size).toBeGreaterThan(300);
  expect(pages).toMatchSnapshot();
});

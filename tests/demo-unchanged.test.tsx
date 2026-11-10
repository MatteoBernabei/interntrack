import { expect, test } from 'vitest';
import { renderAndVisitAllPages } from './helpers';

// DEMO mode (no VITE_FIREBASE_* variables). The public portfolio demo must not change
// unless a change is requested: every text on every page is compared with the saved snapshot.
// If a change to the demo IS intended, update the snapshot with:  npm test -- -u
test('la demo pubblica mostra gli stessi testi di prima', async () => {
  const pages = await renderAndVisitAllPages();
  const total = new Set(Object.values(pages).flat()).size;
  expect(total).toBeGreaterThan(300);
  expect(pages).toMatchSnapshot();
});

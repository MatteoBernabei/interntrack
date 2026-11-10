import { vi } from 'vitest';

// Fixed clock so that date-dependent texts do not change between runs.
vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T09:00:00+01:00') });

// Browser APIs that jsdom does not provide.
const g = globalThis as any;
g.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
window.matchMedia ??= g.matchMedia;
class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
g.ResizeObserver ??= Observer;
g.IntersectionObserver ??= Observer;
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
HTMLCanvasElement.prototype.getContext = (() => null) as any;

// No real network in tests: every request fails loudly but safely.
g.fetch = vi.fn(async (url: any) => {
  return new Response(JSON.stringify({ error: 'network disabled in tests', url: String(url) }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
});

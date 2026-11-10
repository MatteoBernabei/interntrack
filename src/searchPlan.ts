import type { FullSearchConfigProfile } from './data/configProfile';

// Builds the day-by-day research plan from the user's search profile:
// positions x countries x platforms, filled day after day within the time budget (minutes per day).

export interface PlanPlatform {
  id: string;
  name: string;
  minutes: number;
  url: string;
}
export interface PlanSession {
  id: string; // date|position|country
  date: string; // YYYY-MM-DD
  positionId: string;
  positionName: string;
  countryKey: string;
  countryLabel: string;
  cities: string[];
  query: string;
  localTerms: string;
  platforms: PlanPlatform[];
  minutes: number;
}
export interface PlanDay {
  date: string;
  sessions: PlanSession[];
  minutes: number;
}
export interface SearchPlan {
  days: PlanDay[];
  total: number;
}

const WEEKDAY_KEYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const PRIORITY_RANK: Record<string, number> = { Alta: 0, Media: 1, Bassa: 2 };
const INDEED_HOST: Record<string, string> = {
  IT: 'it.indeed.com', ES: 'es.indeed.com', DE: 'de.indeed.com', UK: 'uk.indeed.com', GB: 'uk.indeed.com',
  FR: 'fr.indeed.com', NL: 'nl.indeed.com', IE: 'ie.indeed.com', PT: 'pt.indeed.com', BE: 'be.indeed.com',
  AT: 'at.indeed.com', CH: 'ch.indeed.com',
};
const MAX_SESSIONS_PER_DAY = 12;
const MAX_DAYS = 400;

const pad = (n: number) => String(n).padStart(2, '0');
export const toISODate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISODate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const formatDay = (iso: string, long = true): string =>
  parseISODate(iso).toLocaleDateString('it-IT', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' });

function platformUrl(platformName: string, query: string, positionName: string, countryLabel: string, countryCode: string): string {
  const q = encodeURIComponent(query);
  const n = platformName.toLowerCase();
  if (n.includes('linkedin')) return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${encodeURIComponent(countryLabel)}`;
  if (n.includes('indeed')) return `https://${INDEED_HOST[(countryCode || '').toUpperCase()] || 'www.indeed.com'}/jobs?q=${q}&l=${encodeURIComponent(countryLabel)}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${platformName} ${positionName} ${countryLabel} jobs`)}`;
}

export function listCountries(cfg: FullSearchConfigProfile): Array<{ key: string; label: string }> {
  const seen = new Map<string, string>();
  cfg.cities.filter((c) => c.enabled).forEach((c) => {
    const key = c.countryCode || c.country;
    if (!seen.has(key)) seen.set(key, c.country);
  });
  return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
}

export function buildSearchPlan(cfg: FullSearchConfigProfile): SearchPlan {
  const plan = cfg.searchPlan;
  if (!plan || !plan.startDate || !plan.endDate) return { days: [], total: 0 };

  const positions = cfg.positions
    .filter((p) => p.enabled)
    .slice()
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1));

  const groups = new Map<string, { key: string; label: string; cities: string[]; terms: Set<string> }>();
  cfg.cities.filter((c) => c.enabled).forEach((c) => {
    const key = c.countryCode || c.country;
    const g = groups.get(key) || { key, label: c.country, cities: [], terms: new Set<string>() };
    g.cities.push(c.city);
    (c.localJuniorTerms || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => g.terms.add(t));
    groups.set(key, g);
  });
  const countries = Array.from(groups.values());
  if (positions.length === 0 || countries.length === 0) return { days: [], total: 0 };

  // Each round pairs every position with a different country: all combinations are covered, neighbours differ.
  const units: Array<{ pi: number; ci: number }> = [];
  for (let r = 0; r < countries.length; r++) {
    for (let i = 0; i < positions.length; i++) units.push({ pi: i, ci: (i + r) % countries.length });
  }

  const platformsFor = (key: string, label: string) =>
    cfg.platforms.filter(
      (pl) => pl.enabled && (pl.countries.includes('Tutti') || pl.countries.includes('Europa') || pl.countries.includes(key) || pl.countries.includes(label))
    );

  const active = new Set((plan.activeDays || []).map((d) => d.toLowerCase().slice(0, 3)));
  const budget = Math.max(10, Number(plan.minutesPerDay) || 120);
  const start = parseISODate(plan.startDate);
  const end = parseISODate(plan.endDate);

  const days: PlanDay[] = [];
  let total = 0;
  let cursor = 0;
  let guard = 0;
  for (const d = new Date(start); d <= end && guard < MAX_DAYS; d.setDate(d.getDate() + 1), guard++) {
    if (!active.has(WEEKDAY_KEYS[d.getDay()])) continue;
    const date = toISODate(d);
    const sessions: PlanSession[] = [];
    let used = 0;
    while (sessions.length < MAX_SESSIONS_PER_DAY) {
      const u = units[cursor % units.length];
      const pos = positions[u.pi];
      const g = countries[u.ci];
      const pls = platformsFor(g.key, g.label);
      const minutes = pls.reduce((s, p) => s + (Number(p.minutesPerSession) || 0), 0) || 5;
      if (sessions.length > 0 && used + minutes > budget) break;
      sessions.push({
        id: `${date}|${pos.id}|${g.key}`,
        date,
        positionId: pos.id,
        positionName: pos.name,
        countryKey: g.key,
        countryLabel: g.label,
        cities: g.cities,
        query: pos.searchQuery,
        localTerms: Array.from(g.terms).join(', '),
        platforms: pls.map((p) => ({
          id: p.id,
          name: p.name,
          minutes: Number(p.minutesPerSession) || 0,
          url: platformUrl(p.name, pos.searchQuery, pos.name, g.label, g.key),
        })),
        minutes,
      });
      used += minutes;
      cursor++;
    }
    days.push({ date, sessions, minutes: used });
    total += sessions.length;
  }
  return { days, total };
}

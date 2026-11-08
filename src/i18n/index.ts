import dictionary from './en.json';

// App language.
// The UI source strings are written in Italian. When the language is "en" the text shown on screen is
// translated at runtime with the dictionary in en.json (see domTranslate.ts); "it" shows the original text.
//
// The language is chosen, in this order, from:
//   1. the ?lang=en / ?lang=it query parameter (handy for sharing a direct link),
//   2. the last choice made with the EN | IT switch (saved in localStorage),
//   3. the VITE_APP_LANG build variable (default language), then "en".

export type Lang = 'en' | 'it';

const STORAGE_KEY = 'interntrack_lang';

const envDefault: Lang =
  ((((import.meta as any).env?.VITE_APP_LANG as string) || 'en').toLowerCase() === 'it') ? 'it' : 'en';

function detectLang(): Lang {
  if (typeof window === 'undefined') return envDefault;
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'en' || q === 'it') {
      window.localStorage.setItem(STORAGE_KEY, q);
      return q;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'it') return saved;
  } catch {
    // storage may be unavailable (private mode): fall back to the default
  }
  return envDefault;
}

export let appLang: Lang = detectLang();

const listeners = new Set<(lang: Lang) => void>();

export function setAppLang(lang: Lang): void {
  if (lang === appLang) return;
  appLang = lang;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn: (lang: Lang) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Translates a string with the same dictionary (for text the DOM translator skips, e.g. textarea defaults).
export const translateTo = (s: string, lang: Lang): string =>
  lang === 'en' ? (dictionary as Record<string, string>)[s.trim()] ?? s : s;

export const tr = (s: string): string => translateTo(s, appLang);

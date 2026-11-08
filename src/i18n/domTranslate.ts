import dictionary from './en.json';
import patternDict from './en.patterns.json';
import { appLang, onLangChange } from './index';

// Runtime, display-only, reversible translation (Italian source → English).
// It rewrites text nodes and a few attributes (placeholder, title, aria-label, alt) after React renders them,
// and puts the original text back when the language is switched to Italian.
// App state and logic keep using the original values, so nothing else in the app changes.

type Dict = Record<string, string>;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE']);
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

export function installDomTranslation(): void {
  if (typeof document === 'undefined') return;

  const dict = dictionary as Dict;
  const exact = new Map<string, string>(Object.entries(dict));
  // Phrases (with a space, 6+ chars) can also be replaced inside longer text built from several pieces.
  const phrases = Object.entries(dict)
    .filter(([k]) => k.length >= 6 && /\s/.test(k))
    .sort((a, b) => b[0].length - a[0].length);
  const phraseMap = new Map(phrases);
  const phraseRe = phrases.length ? new RegExp(phrases.map(([k]) => escapeRe(k)).join('|'), 'g') : null;
  const cache = new Map<string, string>();

  // Templates with {0}, {1}... placeholders match whole texts built from interpolated values.
  const patterns = Object.entries(patternDict as Dict).map(([k, v]) => {
    const parts = k.split(/\{\d+\}/);
    const order = [...k.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
    const re = new RegExp('^' + parts.map(escapeRe).join('([\\s\\S]{0,160}?)') + '$');
    return { re, order, out: v };
  });
  const applyPattern = (text: string): string | undefined => {
    for (const p of patterns) {
      const m = p.re.exec(text);
      if (!m) continue;
      const vals: string[] = [];
      p.order.forEach((n, i) => { vals[n] = m[i + 1]; });
      return p.out.replace(/\{(\d+)\}/g, (_, n) => translate(vals[Number(n)] ?? ''));
    }
    return undefined;
  };

  const translate = (text: string): string => {
    const hit = cache.get(text);
    if (hit !== undefined) return hit;
    const trimmed = text.trim();
    let out = text;
    if (trimmed && /[A-Za-zÀ-ÿ]/.test(trimmed)) {
      let t = exact.get(trimmed) ?? exact.get(trimmed.replace(/\s+/g, ' '));
      if (t === undefined) t = applyPattern(trimmed);
      if (t === undefined && phraseRe) {
        const replaced = trimmed.replace(phraseRe, (m) => phraseMap.get(m) ?? m);
        if (replaced !== trimmed) t = replaced;
      }
      if (t === undefined && trimmed.includes('"')) {
        const q = trimmed.replace(/"([^"]{2,40})"/g, (m, inner) => (exact.has(inner) ? '"' + exact.get(inner) + '"' : m));
        if (q !== trimmed) t = q;
      }
      if (t !== undefined) {
        const lead = text.slice(0, text.indexOf(trimmed));
        out = lead + t + text.slice(lead.length + trimmed.length);
      }
    }
    if (cache.size > 5000) cache.clear();
    cache.set(text, out);
    return out;
  };

  // Bookkeeping, so we can tell our own writes from React's and restore the originals.
  const original = new WeakMap<Text, string>();
  const written = new WeakMap<Text, string>();
  const attrOriginal = new WeakMap<Element, Map<string, string>>();
  const attrWritten = new WeakMap<Element, Map<string, string>>();
  const mapFor = (store: WeakMap<Element, Map<string, string>>, el: Element) => {
    let m = store.get(el);
    if (!m) { m = new Map(); store.set(el, m); }
    return m;
  };

  const translateTextNode = (node: Text) => {
    const v = node.nodeValue;
    if (!v || written.get(node) === v) return; // empty, or our own write
    const parent = node.parentElement;
    if (parent && SKIP_TAGS.has(parent.tagName)) return;
    const t = translate(v);
    if (t !== v) {
      original.set(node, v);
      written.set(node, t);
      node.nodeValue = t;
    }
  };

  const translateAttrs = (el: Element) => {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v || attrWritten.get(el)?.get(a) === v) continue;
      const t = translate(v);
      if (t !== v) {
        mapFor(attrOriginal, el).set(a, v);
        mapFor(attrWritten, el).set(a, t);
        el.setAttribute(a, t);
      }
    }
  };

  const walk = (root: Node) => {
    if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root as Text);
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const el = root as Element;
    if (SKIP_TAGS.has(el.tagName)) return;
    translateAttrs(el);
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n: Node | null = tw.nextNode();
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) translateTextNode(n as Text);
      else translateAttrs(n as Element);
      n = tw.nextNode();
    }
  };

  const restoreAll = () => {
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n: Node | null = tw.nextNode();
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = n as Text;
        const w = written.get(t);
        if (w !== undefined && t.nodeValue === w) t.nodeValue = original.get(t) ?? w;
        written.delete(t);
        original.delete(t);
      } else {
        const el = n as Element;
        const aw = attrWritten.get(el);
        if (aw) {
          aw.forEach((val, a) => {
            if (el.getAttribute(a) === val) el.setAttribute(a, attrOriginal.get(el)?.get(a) ?? val);
          });
          attrWritten.delete(el);
          attrOriginal.delete(el);
        }
      }
      n = tw.nextNode();
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') translateTextNode(m.target as Text);
      else if (m.type === 'attributes') translateAttrs(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  });

  let active = false;
  const start = () => {
    if (active) return;
    active = true;
    walk(document.body);
    observer.observe(document.body, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
  };
  const stop = () => {
    if (!active) return;
    active = false;
    observer.disconnect();
    observer.takeRecords();
    restoreAll();
  };
  const sync = () => {
    document.documentElement.lang = appLang;
    if (appLang === 'en') start();
    else stop();
  };

  onLangChange(sync);
  if (document.body) sync();
  else document.addEventListener('DOMContentLoaded', sync, { once: true });

  // alert / confirm / prompt dialogs
  for (const fn of ['alert', 'confirm', 'prompt'] as const) {
    const originalFn = (window as any)[fn]?.bind(window);
    if (originalFn) {
      (window as any)[fn] = (msg?: any, ...rest: any[]) =>
        originalFn(typeof msg === 'string' && appLang === 'en' ? translate(msg) : msg, ...rest);
    }
  }
}

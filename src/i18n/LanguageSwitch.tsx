import { useEffect, useState } from 'react';
import { appLang, onLangChange, setAppLang, type Lang } from './index';

export function useAppLang(): Lang {
  const [lang, setLang] = useState<Lang>(appLang);
  useEffect(() => onLangChange(setLang), []);
  return lang;
}

// Small EN | IT switch. Its labels are written per language, so the DOM translator never touches them.
export function LanguageSwitch() {
  const lang = useAppLang();
  const option = (code: Lang) => (
    <button
      type="button"
      onClick={() => setAppLang(code)}
      aria-pressed={lang === code}
      style={{
        border: 'none',
        cursor: 'pointer',
        padding: '4px 9px',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '.03em',
        borderRadius: 999,
        background: lang === code ? 'var(--brand)' : 'transparent',
        color: lang === code ? '#fff' : 'inherit',
      }}
    >
      {code.toUpperCase()}
    </button>
  );
  return (
    <div
      role="group"
      aria-label={lang === 'it' ? 'Lingua' : 'Language'}
      title={lang === 'it' ? 'Cambia lingua' : 'Switch language'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 2,
        borderRadius: 999,
        border: '1px solid var(--rim)',
        background: 'var(--glass-in)',
      }}
    >
      {option('en')}
      {option('it')}
    </div>
  );
}

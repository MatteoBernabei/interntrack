import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { isFirebaseConfigured } from './firebase';
import { installAuthFetch } from './authFetch';
import { installDomTranslation } from './i18n/domTranslate';
import { useAppLang } from './i18n/LanguageSwitch';

installAuthFetch();
installDomTranslation();

function DemoBadge() {
  const lang = useAppLang();
  if (isFirebaseConfigured) return null;
  return (
    <div
      style={{
        position: 'fixed', bottom: 12, left: 12, zIndex: 9999,
        background: 'rgba(17,24,39,0.88)', color: '#fff', fontSize: 12,
        padding: '6px 12px', borderRadius: 999, pointerEvents: 'none',
      }}
    >
      {lang === 'it' ? 'Modalità demo · dati di esempio' : 'Demo mode · sample data'}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <DemoBadge />
  </>
);

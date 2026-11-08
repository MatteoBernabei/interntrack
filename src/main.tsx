import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { isFirebaseConfigured } from './firebase';
import { installAuthFetch } from './authFetch';

installAuthFetch();

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    {!isFirebaseConfigured && (
      <div
        style={{
          position: 'fixed', bottom: 12, left: 12, zIndex: 9999,
          background: 'rgba(17,24,39,0.88)', color: '#fff', fontSize: 12,
          padding: '6px 12px', borderRadius: 999, pointerEvents: 'none',
        }}
      >
        Modalità demo · dati fittizi
      </div>
    )}
  </>
);

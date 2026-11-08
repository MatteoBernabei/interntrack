import { auth, isFirebaseConfigured } from './firebase';

// Aggiunge il token di accesso Firebase alle chiamate verso /api/*, così il server
// può verificare chi sta usando le funzioni AI (vedi server.ts → ALLOWED_EMAILS).
export function installAuthFetch() {
  if (!isFirebaseConfigured || typeof window === 'undefined') return;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
      if (url.startsWith('/api/') && auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        headers.set('Authorization', `Bearer ${token}`);
        return originalFetch(input, { ...init, headers });
      }
    } catch {
      // se il token non è disponibile, la chiamata prosegue senza intestazione
    }
    return originalFetch(input, init);
  };
}

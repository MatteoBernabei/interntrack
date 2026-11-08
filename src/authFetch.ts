import { auth, isFirebaseConfigured } from './firebase';

// Adds the Firebase ID token to calls to /api/* so the server can verify who is using the
// AI features (see server.ts → ALLOWED_EMAILS).
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
      // if the token is not available, the call goes on without the header
    }
    return originalFetch(input, init);
  };
}

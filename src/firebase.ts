import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged as firebaseOnAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Configurazione letta dalle variabili d'ambiente (vedi .env.example).
// Se mancano, l'app parte in MODALITÀ DEMO: dati fittizi, nessun login, nessun database.
const env = ((import.meta as any).env || {}) as Record<string, string | undefined>;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
// Gmail richiede una verifica Google molto onerosa: si attiva solo nella propria istanza privata.
export const isGmailEnabled = env.VITE_ENABLE_GMAIL === 'true';

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const dbId = env.VITE_FIREBASE_DATABASE_ID || '(default)';
export const db: any = app ? getFirestore(app, dbId) : null;
export const auth: any = app ? getAuth(app) : { currentUser: null };

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
  ...(isGmailEnabled ? ['https://www.googleapis.com/auth/gmail.readonly'] : []),
];

export const googleProvider = new GoogleAuthProvider();
GOOGLE_SCOPES.forEach((scope) => googleProvider.addScope(scope));
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function onAuthStateChanged(authArg: any, callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return firebaseOnAuthStateChanged(authArg, callback);
}

// In-memory access token cache per account (do NOT store in localStorage per security guidelines)
let cachedAccessToken: string | null = null;
const accountTokensMap: Map<string, string> = new Map();
let isSigningIn = false;

// Safe test connection
export async function testConnection() {
  if (!isFirebaseConfigured) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, check connection.');
    }
  }
}

// Auth helpers
export async function loginWithGoogle(hintEmail?: string): Promise<{ user: User; accessToken: string }> {
  try {
    if (!isFirebaseConfigured) {
      throw new Error('Modalità demo: l\'accesso con Google non è configurato su questo sito.');
    }
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    GOOGLE_SCOPES.forEach((scope) => provider.addScope(scope));

    const customParams: Record<string, string> = { prompt: 'select_account' };
    if (hintEmail) {
      customParams.login_hint = hintEmail;
    }
    provider.setCustomParameters(customParams);

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || '';
    if (token) {
      cachedAccessToken = token;
      if (result.user.email) {
        accountTokensMap.set(result.user.email.toLowerCase(), token);
      }
    }
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export function getAccessToken(email?: string): string | null {
  if (email && accountTokensMap.has(email.toLowerCase())) {
    return accountTokensMap.get(email.toLowerCase())!;
  }
  return cachedAccessToken;
}

export function setAccessToken(token: string | null, email?: string): void {
  cachedAccessToken = token;
  if (email && token) {
    accountTokensMap.set(email.toLowerCase(), token);
  }
}

export function getConnectedAccounts(): string[] {
  return Array.from(accountTokensMap.keys());
}

export async function logoutUser() {
  try {
    if (isFirebaseConfigured) await signOut(auth);
    cachedAccessToken = null;
    accountTokensMap.clear();
  } catch (error: any) {
    console.error('Logout error:', error);
  }
}

export type { User };


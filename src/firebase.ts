import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged as firebaseOnAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Configuration is read from environment variables (see .env.example).
// If they are missing, the app starts in DEMO MODE: sample data, no login, no database.
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
// Gmail needs Google's restricted-scope verification (annual security assessment):
// enable it only on your own private instance.
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
  ...(isGmailEnabled ? ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'] : []),
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
export async function loginWithGoogle(hintEmail?: string): Promise<{ user: User; accessToken: string; email?: string }> {
  try {
    if (!isFirebaseConfigured) {
      throw new Error('Demo mode: Google sign-in is not configured on this site.');
    }
    // A user is already signed in and ANOTHER account is requested: only fetch that account's access token,
    // without replacing the signed-in user (which would switch the Firestore data area).
    const primary = auth.currentUser?.email?.toLowerCase();
    if (primary && hintEmail && hintEmail.trim().toLowerCase() !== primary) {
      const extra = await connectExtraAccount(hintEmail.trim());
      return { user: auth.currentUser as User, accessToken: extra.accessToken, email: extra.email };
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

// Signs an extra Google account in on a SEPARATE Firebase auth instance, only to obtain its access token
// (Gmail, Calendar, Tasks, Sheets). The main user, and therefore the Firestore data, are never touched.
export async function connectExtraAccount(hintEmail?: string): Promise<{ email: string; accessToken: string }> {
  if (!isFirebaseConfigured) {
    throw new Error('Demo mode: Google sign-in is not configured on this site.');
  }
  const extraApp = getApps().find((a) => a.name === 'extra-accounts') ?? initializeApp(firebaseConfig, 'extra-accounts');
  const extraAuth = getAuth(extraApp);
  const provider = new GoogleAuthProvider();
  GOOGLE_SCOPES.forEach((scope) => provider.addScope(scope));
  const params: Record<string, string> = { prompt: 'select_account' };
  if (hintEmail) params.login_hint = hintEmail;
  provider.setCustomParameters(params);

  const result = await signInWithPopup(extraAuth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken || '';
  const email = (result.user.email || hintEmail || '').toLowerCase();
  if (accessToken && email) {
    accountTokensMap.set(email, accessToken);
  }
  try {
    await signOut(extraAuth); // the extra session is not needed after the token has been collected
  } catch (e) {
    // ignore
  }
  return { email, accessToken };
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


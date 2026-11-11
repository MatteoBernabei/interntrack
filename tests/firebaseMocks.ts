import { vi } from 'vitest';

// A signed-in tester with an EMPTY database. No real Firebase, no real Google.
export const TEST_USER = {
  uid: 'test-uid',
  email: 'tester@prova.test',
  displayName: 'Utente Prova',
  photoURL: null,
  emailVerified: true,
  getIdToken: async () => 'fake-id-token',
};

export function installFirebaseMocks() {
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key');
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
  vi.stubEnv('VITE_FIREBASE_APP_ID', 'test-app');
  vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'prova.test');
  vi.stubEnv('VITE_APP_LANG', 'it');
  vi.stubEnv('VITE_ENABLE_GMAIL', 'true');

  vi.doMock('firebase/app', () => ({
    initializeApp: () => ({ name: '[DEFAULT]' }),
    getApps: () => [],
  }));
  vi.doMock('firebase/auth', () => {
    class GoogleAuthProvider {
      addScope() {}
      setCustomParameters() {}
      static credentialFromResult() { return { accessToken: 'fake-access-token' }; }
    }
    return {
      getAuth: () => ({ currentUser: TEST_USER }),
      GoogleAuthProvider,
      signInWithPopup: async () => ({ user: TEST_USER }),
      signOut: async () => {},
      onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => void) => {
        queueMicrotask(() => cb(TEST_USER));
        return () => {};
      },
    };
  });
  vi.doMock('firebase/firestore', () => {
    const emptyQuery = { docs: [], empty: true, size: 0, forEach() {}, docChanges: () => [], metadata: { hasPendingWrites: false, fromCache: false } };
    const emptyDoc = { exists: () => false, data: () => undefined, metadata: { hasPendingWrites: false, fromCache: false } };
    return {
      getFirestore: () => ({}),
      collection: (...path: unknown[]) => ({ kind: 'collection', path }),
      doc: (...path: unknown[]) => ({ kind: 'doc', path }),
      getDocFromServer: async () => emptyDoc,
      getDocs: async () => emptyQuery,
      setDoc: async () => {},
      onSnapshot: (ref: any, next: (snap: unknown) => void) => {
        queueMicrotask(() => next(ref?.kind === 'doc' ? emptyDoc : emptyQuery));
        return () => {};
      },
      writeBatch: () => ({ set() {}, delete() {}, update() {}, commit: async () => {} }),
    };
  });
}

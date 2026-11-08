# Setup / Configurazione

[🇬🇧 English](#english) · [🇮🇹 Italiano](#italiano)

---

# English

## Run locally (demo mode)

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000
```

With no environment variables the app runs in **demo mode**: sample data, no sign-in, AI features off.

## Deploy the public demo (Vercel)

1. Import the repository on [vercel.com](https://vercel.com) (**Add New → Project**).
2. Do **not** add any environment variable.
3. Deploy. If the install step fails, set *Settings → Build and Deployment → Install Command* to `npm install --legacy-peer-deps` and redeploy.

The demo opens in English by default. Direct links: `/?lang=en` and `/?lang=it`.

## Private instance

A second Vercel project from the same repository, with variables. Your data stays in your own Firebase and variables, never in the code.

1. **Firebase**: create a project, enable *Authentication → Google*, create a Firestore database named **`(default)`** (only that one is covered by the free quota), and copy the web config into the `VITE_FIREBASE_*` variables.
2. **Rules**: publish `firestore.rules` (each user can only read and write their own data).
3. **Authorized domains**: add your Vercel domain under *Authentication → Settings → Authorized domains*.
4. **Gemini**: create a key at [aistudio.google.com](https://aistudio.google.com) and set `GEMINI_API_KEY`, `ALLOWED_EMAILS`, `CANDIDATE_NAME` and `CANDIDATE_PROFILE`.
5. **Deploy** with the variables below. After changing a variable, redeploy.

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_APP_LANG` | Default language: `en` (default) or `it`. Visitors can still switch with **EN \| IT** or `?lang=` |
| `VITE_FIREBASE_*` | Firebase web config (API key, auth domain, project ID, app ID, …) |
| `VITE_FIREBASE_DATABASE_ID` | Leave empty for `(default)` |
| `GEMINI_API_KEY` | Gemini key (server only, secret) |
| `ALLOWED_EMAILS` | Comma-separated emails allowed to use the AI features. Without it the AI routes stay closed |
| `CANDIDATE_NAME`, `CANDIDATE_PROFILE` | Profile used in the AI prompts |
| `VITE_OWNER_EMAIL`, `VITE_DEFAULT_SHEET_ID` | Optional defaults |
| `VITE_ENABLE_GMAIL` | `true` to enable Gmail reading (private instance only) |

The full list with comments is in [`.env.example`](../.env.example).

## Google verification and Gmail

Basic sign-in (name and email) needs no verification. Calendar, Tasks and Sheets are *sensitive* scopes: until the app is verified by Google, consent is capped at 100 users. Gmail (`gmail.readonly`) is a *restricted* scope that requires an external security assessment, so it is **off by default** and meant for a private instance where you are the test user. While an app is in testing mode, test users' authorizations expire after 7 days.

## Free-tier limits

- **Vercel Hobby** is for personal, non-commercial use; functions default to 10 s (this project sets 60 s).
- **Firestore**: the free quota applies to the `(default)` database only; named databases need billing.
- **Gemini**: the free tier has per-project limits, shared by everyone using the same key.

Check each provider's pricing page for current numbers.

[↑ Top](#setup--configurazione)

---

# Italiano

## Avvio in locale (modalità demo)

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000
```

Senza variabili d'ambiente l'app parte in **modalità demo**: dati di esempio, nessun accesso, funzioni AI spente.

## Pubblicare la demo (Vercel)

1. Importa il repository su [vercel.com](https://vercel.com) (**Add New → Project**).
2. **Non** aggiungere nessuna variabile d'ambiente.
3. Fai il deploy. Se fallisce nell'installazione, in *Settings → Build and Deployment → Install Command* imposta `npm install --legacy-peer-deps` e rifai il deploy.

La demo si apre in inglese di default. Link diretti: `/?lang=en` e `/?lang=it`.

## Istanza privata

Un secondo progetto Vercel dallo stesso repository, con le variabili. I tuoi dati restano nel tuo Firebase e nelle variabili, mai nel codice.

1. **Firebase**: crea un progetto, attiva *Authentication → Google*, crea un database Firestore chiamato **`(default)`** (solo quello rientra nella quota gratuita) e copia la configurazione web nelle variabili `VITE_FIREBASE_*`.
2. **Regole**: pubblica `firestore.rules` (ogni utente legge e scrive solo i propri dati).
3. **Domini autorizzati**: aggiungi il dominio Vercel in *Authentication → Settings → Authorized domains*.
4. **Gemini**: crea una chiave su [aistudio.google.com](https://aistudio.google.com) e imposta `GEMINI_API_KEY`, `ALLOWED_EMAILS`, `CANDIDATE_NAME` e `CANDIDATE_PROFILE`.
5. **Deploy** con le variabili qui sotto. Dopo aver cambiato una variabile, rifai il deploy.

## Variabili d'ambiente

| Variabile | A cosa serve |
|---|---|
| `VITE_APP_LANG` | Lingua predefinita: `en` (default) oppure `it`. I visitatori possono comunque cambiarla con **EN \| IT** o con `?lang=` |
| `VITE_FIREBASE_*` | Configurazione web di Firebase (API key, auth domain, project ID, app ID, …) |
| `VITE_FIREBASE_DATABASE_ID` | Lascia vuoto per usare `(default)` |
| `GEMINI_API_KEY` | Chiave Gemini (solo server, segreta) |
| `ALLOWED_EMAILS` | Email autorizzate alle funzioni AI, separate da virgola. Senza questa variabile le rotte AI restano chiuse |
| `CANDIDATE_NAME`, `CANDIDATE_PROFILE` | Profilo usato nei prompt AI |
| `VITE_OWNER_EMAIL`, `VITE_DEFAULT_SHEET_ID` | Valori predefiniti opzionali |
| `VITE_ENABLE_GMAIL` | `true` per attivare la lettura di Gmail (solo istanza privata) |

L'elenco completo, con commenti, è in [`.env.example`](../.env.example).

## Verifica Google e Gmail

L'accesso base (nome ed email) non richiede verifica. Calendar, Tasks e Sheets sono ambiti *sensibili*: finché l'app non è verificata da Google il consenso è limitato a 100 utenti. Gmail (`gmail.readonly`) è un ambito *restrittivo* che richiede un audit di sicurezza esterno, quindi è **spento di default** e pensato per un'istanza privata in cui sei tu l'utente di prova. Finché un'app è in modalità test, le autorizzazioni degli utenti di prova scadono dopo 7 giorni.

## Limiti dei piani gratuiti

- **Vercel Hobby** è per uso personale non commerciale; le funzioni durano di default 10 s (questo progetto imposta 60 s).
- **Firestore**: la quota gratuita vale solo per il database `(default)`; i database con nome richiedono la fatturazione.
- **Gemini**: il piano gratuito ha limiti per progetto, condivisi da chiunque usi la stessa chiave.

Controlla sempre i valori aggiornati nelle pagine dei prezzi.

[↑ Su](#setup--configurazione)

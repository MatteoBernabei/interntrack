# InternTrack — Career Pipeline & Internship Dashboard

Dashboard per organizzare la ricerca di stage e primo lavoro: tracker delle candidature, azioni del giorno, calendario e promemoria, hub di networking LinkedIn, lettere e CV, e un Career Copilot basato su Gemini.

> **Tutti i dati mostrati nella demo sono fittizi.** Nessuna persona, azienda o email è reale.

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Firestore-ffca28.svg)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)

## Due modalità

| | Demo (pubblica) | Istanza privata |
|---|---|---|
| Configurazione | nessuna variabile d'ambiente | variabili Firebase + Gemini |
| Dati | fittizi, nel browser | tuoi, nel tuo Firestore |
| Login Google | disattivato | attivo |
| Funzioni AI | disattivate | solo per le email in `ALLOWED_EMAILS` |

La stessa base di codice si pubblica due volte su Vercel (due progetti, stesso repository) cambiando solo le variabili d'ambiente.

## Funzionalità

- **Tracker candidature** con tabella, azioni immediate e vista a schede; import/export Excel, CSV, JSON.
- **Calendario e promemoria** con Google Calendar e Google Tasks.
- **Hub networking LinkedIn**: coda di contatti suggeriti, note di connessione, sincronizzazione con Fogli Google.
- **Career Copilot (Gemini)**: analisi annunci, lettere, preparazione colloqui, compatibilità CV/ruolo, scouting di aziende.
- **Multi-account** Google per calendario e task.

## Stack

React 19 · TypeScript · Vite · Tailwind · Firebase (Auth, Firestore) · Express (API AI) · Google Gemini · Vercel.

## Avvio in locale

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000 (modalità demo)
```

Per l'istanza privata copia `.env.example` in `.env` e compila le variabili.

## Configurare l'istanza privata

1. **Firebase**: crea un progetto, attiva *Authentication → Google* e crea un database Firestore **"(default)"** (solo questo rientra nella quota gratuita). Copia la configurazione web nelle variabili `VITE_FIREBASE_*`.
2. **Regole Firestore**: pubblica `firestore.rules` (ogni utente accede solo ai propri dati).
3. **Domini autorizzati**: in *Authentication → Settings → Authorized domains* aggiungi il dominio Vercel.
4. **Gemini**: crea una chiave su [aistudio.google.com](https://aistudio.google.com) e imposta `GEMINI_API_KEY`, `ALLOWED_EMAILS`, `CANDIDATE_NAME`, `CANDIDATE_PROFILE`.
5. **Vercel**: importa il repository, inserisci le variabili e fai il deploy. Dopo aver cambiato una variabile serve un nuovo deploy.

## Sicurezza e privacy

- Nessun dato personale nel repository: profilo, email e Sheet ID stanno nelle variabili d'ambiente o nel database.
- Le rotte `/api/ai/*` sono chiuse finché non imposti `ALLOWED_EMAILS`, e verificano il token di accesso Firebase: nessun estraneo può consumare la tua quota Gemini.
- La chiave Gemini resta solo sul server.
- I token di accesso Google restano in memoria e non vengono salvati.

## Google, verifica e Gmail

Il login base (nome ed email) non richiede verifica. Calendar, Tasks e Fogli sono ambiti sensibili: finché l'app non è verificata da Google il consenso è limitato a 100 utenti. Gmail (`gmail.readonly`) è un ambito "restricted" che richiede un audit di sicurezza esterno: è disattivato di default e si abilita con `VITE_ENABLE_GMAIL=true` solo nella propria istanza privata, dove sei l'utente di prova.

## Limiti dei piani gratuiti

Vercel Hobby è per uso personale non commerciale; Firestore free ha quote giornaliere; il piano gratuito di Gemini ha limiti per progetto. Verifica sempre i valori aggiornati nelle rispettive pagine.

## Licenza

Da definire dall'autore.

// Google Sheets API Service for Hub Networking LinkedIn
// Tabs: "Coda", "Aziende", "Persone", "Aziende già processate"

import * as XLSX from 'xlsx';
import { HubCodaItem } from '../data/mockupData';

export const DEFAULT_SHEET_ID = ((import.meta as any).env?.VITE_DEFAULT_SHEET_ID as string) || '';
const OWNER_EMAIL = ((import.meta as any).env?.VITE_OWNER_EMAIL as string) || 'demo@example.com';
export const SHEET_ID = DEFAULT_SHEET_ID;

export function resolveSheetId(customSheetId?: string): string {
  if (customSheetId && customSheetId.trim().length > 5) {
    return customSheetId.trim();
  }
  return DEFAULT_SHEET_ID;
}

export interface SheetCodaRow {
  rowIndex: number; // 1-based row index in Sheet
  id: string; // A: ID (es. OW-008)
  name: string; // B: Nome
  role: string; // C: Ruolo
  company: string; // D: Azienda
  country: string; // E: Paese
  link: string; // F: Link ricerca LinkedIn
  motivo: string; // G: Motivo rilevanza
  nota: string; // H: Nota di connessione
  statoInvio: string; // I: Stato invio ("In coda", "Suggerita", "Richiesta inviata", "Scartata")
  inviataIl: string; // J: Inviata il (data)
  affidabilita: string; // K: Affidabilità ("✅ Certo", "⚠️ DA VERIFICARE")
  descrizioneAzienda: string; // L: Descrizione azienda
  linkedinAzienda: string; // M: LinkedIn azienda
  categoria: 'Azienda' | 'Startup' | 'Venture'; // N: Categoria
}

// 1. Legge la scheda "Coda" dallo Sheet (colonne A:N)
export async function readSheetCoda(accessToken: string, customSheetId?: string): Promise<SheetCodaRow[]> {
  const targetId = resolveSheetId(customSheetId);
  const range = 'Coda!A2:N500';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Errore lettura Google Sheets (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const values: string[][] = data.values || [];

  return values.map((row, idx) => {
    const rawAffid = (row[10] || '').toLowerCase();
    const categoriaRaw = (row[13] || '').trim();
    const categoria: 'Azienda' | 'Startup' | 'Venture' =
      categoriaRaw === 'Startup' ? 'Startup' : categoriaRaw === 'Venture' ? 'Venture' : 'Azienda';

    return {
      rowIndex: idx + 2, // A2 = row 2
      id: row[0] || `ITEM-${idx + 1}`,
      name: row[1] || 'Senza nome',
      role: row[2] || 'Ruolo non specificato',
      company: row[3] || 'Azienda',
      country: row[4] || 'Italia',
      link: row[5] || '',
      motivo: row[6] || '',
      nota: row[7] || '',
      statoInvio: (row[8] || 'In coda').trim(),
      inviataIl: row[9] || '',
      affidabilita: rawAffid.includes('verificare') || rawAffid.includes('⚠️') ? '⚠️ DA VERIFICARE' : '✅ Certo',
      descrizioneAzienda: row[11] || '',
      linkedinAzienda: row[12] || '',
      categoria,
    };
  });
}

// 2. Legge la scheda "Aziende già processate" (colonne A:D)
export async function readProcessedCompanies(
  accessToken: string,
  customSheetId?: string
): Promise<{ name: string; sector: string; cycle: string; date: string }[]> {
  const targetId = resolveSheetId(customSheetId);
  const range = "'Aziende già processate'!A2:D500";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/${encodeURIComponent(range)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rows: string[][] = data.values || [];
    return rows.map((r) => ({
      name: r[0] || '',
      sector: r[1] || '',
      cycle: r[2] || '',
      date: r[3] || '',
    }));
  } catch (e) {
    console.warn('Errore lettura aziende processate:', e);
    return [];
  }
}

// 3. Aggiorna lo stato di invio di una o più righe nella scheda Coda (Colonna I e J)
export async function updateCodaRowsStatus(
  accessToken: string,
  updates: { rowIndex: number; newStatus: string; date?: string }[],
  customSheetId?: string
): Promise<boolean> {
  if (updates.length === 0) return true;

  try {
    const targetId = resolveSheetId(customSheetId);
    const dataPayload = updates.map((u) => ({
      range: `Coda!I${u.rowIndex}:J${u.rowIndex}`,
      values: [[u.newStatus, u.date || new Date().toISOString().slice(0, 10)]],
    }));

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values:batchUpdate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('Errore updateCodaRowsStatus:', err);
    return false;
  }
}

// 4. Aggiorna la colonna "Suggerita il" nella scheda Persone
export async function updatePersoneSuggeritaIl(
  accessToken: string,
  personId: string,
  dateStr: string,
  customSheetId?: string
): Promise<boolean> {
  try {
    const targetId = resolveSheetId(customSheetId);
    // Leggi colonna A di Persone per trovare la riga
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/${encodeURIComponent('Persone!A2:A1000')}`;
    const getRes = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!getRes.ok) return false;
    const getData = await getRes.json();
    const rows: string[][] = getData.values || [];
    const idx = rows.findIndex((r) => (r[0] || '').trim().toUpperCase() === personId.trim().toUpperCase());
    if (idx === -1) return false;

    const rowNumber = idx + 2;
    // Colonna L è "Suggerita il" (12a colonna)
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/${encodeURIComponent(`Persone!L${rowNumber}`)}?valueInputOption=USER_ENTERED`;
    await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[dateStr]],
      }),
    });
    return true;
  } catch (e) {
    console.warn('Errore updatePersoneSuggeritaIl:', e);
    return false;
  }
}

// 5. Append righe alla scheda Coda, Aziende, Persone e Aziende già processate
export async function appendRowsToSheet(
  accessToken: string,
  sheetName: string,
  rows: (string | number)[][],
  customSheetId?: string
): Promise<boolean> {
  if (rows.length === 0) return true;
  try {
    const targetId = resolveSheetId(customSheetId);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/${encodeURIComponent(`${sheetName}!A:A`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error(`Errore append su ${sheetName}:`, err);
    return false;
  }
}


// 6. Cerca in Gmail: subject:"LN FATTO" OR subject:"LN SALTA" newer_than:2d
export async function fetchLnFeedbackFromGmail(
  accessToken: string
): Promise<{ id: string; action: 'FATTO' | 'SALTA'; messageDate: number }[]> {
  const query = 'subject:("LN FATTO" OR "LN SALTA") newer_than:2d';
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const messages: { id: string }[] = data.messages || [];
    if (messages.length === 0) return [];

    const results: { id: string; action: 'FATTO' | 'SALTA'; messageDate: number }[] = [];

    await Promise.all(
      messages.map(async (msg) => {
        try {
          const detUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`;
          const detRes = await fetch(detUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!detRes.ok) return;
          const detData = await detRes.json();
          const headers = detData.payload?.headers || [];
          const subject = (headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '').trim();
          const timestamp = Number(detData.internalDate) || Date.now();

          // Regex match: LN FATTO ID1 ID2... o LN SALTA ID1 ID2...
          const fattoMatch = subject.match(/LN\s+FATTO\s+([A-Z0-9\s-]+)/i);
          const saltaMatch = subject.match(/LN\s+SALTA\s+([A-Z0-9\s-]+)/i);

          if (fattoMatch) {
            const rawIds = fattoMatch[1].trim().split(/\s+/);
            rawIds.forEach((id: string) => {
              const cleanId = id.trim().toUpperCase();
              if (cleanId.length >= 3 && cleanId.includes('-')) {
                results.push({ id: cleanId, action: 'FATTO', messageDate: timestamp });
              }
            });
          } else if (saltaMatch) {
            const rawIds = saltaMatch[1].trim().split(/\s+/);
            rawIds.forEach((id: string) => {
              const cleanId = id.trim().toUpperCase();
              if (cleanId.length >= 3 && cleanId.includes('-')) {
                results.push({ id: cleanId, action: 'SALTA', messageDate: timestamp });
              }
            });
          }
        } catch (e) {
          console.warn('Errore parsing email feedback LN:', e);
        }
      })
    );

    // Ordina per timestamp decrescente (la più recente ha la precedenza)
    return results.sort((a, b) => b.messageDate - a.messageDate);
  } catch (e) {
    console.error('Errore fetchLnFeedbackFromGmail:', e);
    return [];
  }
}

// 7. Costruisce il corpo HTML perfetto dell'email del giorno (identico al prompt)
export function generateDailyHtmlEmail(
  candidates: SheetCodaRow[],
  categoryName: 'Azienda' | 'Startup' | 'Venture',
  remainingCounts: { azienda: number; startup: number; venture: number }
): { subject: string; html: string } {
  const todayStr = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const subject = `3 persone da aggiungere su LinkedIn – ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} – Oggi: ${categoryName}`;

  // Aziende distinte
  const distinctCompaniesMap = new Map<string, { desc: string; link: string }>();
  candidates.forEach((c) => {
    if (!distinctCompaniesMap.has(c.company)) {
      distinctCompaniesMap.set(c.company, {
        desc: c.descrizioneAzienda || 'Azienda target selezionata per il tuo profilo.',
        link: c.linkedinAzienda || `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(c.company)}`,
      });
    }
  });

  const distinctCompanies = Array.from(distinctCompaniesMap.entries()).map(([comp, val]) => ({
    name: comp,
    ...val,
  }));

  const allIds = candidates.map((c) => c.id).join('%20');
  const allButtonText = candidates.length === 3 ? '✅ Fatto tutti e 3' : '✅ Fatto tutti';

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; line-height: 1.5; }
    .container { max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #ffffff; padding: 24px; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .category-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
    
    .company-box { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 14px 18px; margin: 20px; border-radius: 8px; }
    .company-box h2 { margin: 0 0 10px; font-size: 15px; color: #0f172a; }
    .comp-item { margin-bottom: 12px; }
    .comp-item:last-child { margin-bottom: 0; }
    .comp-name { font-weight: 700; color: #1e293b; font-size: 14px; }
    .comp-desc { font-size: 13px; color: #475569; margin: 2px 0 4px; }
    .comp-link { font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 600; }

    .people-section { padding: 0 20px 20px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 16px; }
    .person-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .person-name { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
    .person-role { font-size: 13px; color: #2563eb; font-weight: 600; margin: 2px 0 0; }
    .person-co { font-size: 12px; color: #64748b; }
    .warning-badge { background: #fef3c7; color: #92400e; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 600; display: inline-block; margin-top: 6px; }
    
    .why-box { margin: 12px 0; font-size: 13px; color: #334155; }
    .why-title { font-weight: 700; color: #0f172a; }

    .note-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin: 12px 0; font-size: 13px; color: #1e293b; font-style: normal; line-height: 1.4; }
    .note-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block; }

    .action-links { display: flex; gap: 8px; align-items: center; margin-top: 14px; flex-wrap: wrap; }
    .btn-action { display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; }
    .btn-fatto { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .btn-salta { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .btn-linkedin { background: #0a66c2; color: #ffffff; border: 1px solid #0a66c2; margin-left: auto; }

    .all-done-wrapper { text-align: center; margin: 24px 20px; }
    .btn-all-done { display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 8px rgba(22,163,74,0.25); }

    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 20px; font-size: 12px; color: #64748b; }
    .queue-counts { margin-bottom: 8px; font-weight: 600; color: #334155; }
    .alert-low { color: #dc2626; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="category-badge">Oggi: ${categoryName}</div>
      <h1>3 persone da aggiungere su LinkedIn</h1>
      <p>${todayStr}</p>
    </div>

    <!-- Riquadro Azienda / Aziende -->
    <div class="company-box">
      <h2>${distinctCompanies.length > 1 ? "🏢 Le aziende" : "🏢 L'azienda"}</h2>
      ${distinctCompanies
        .map(
          (c) => `
        <div class="comp-item">
          <div class="comp-name">${c.name}</div>
          <div class="comp-desc">${c.desc}</div>
          <a class="comp-link" href="${c.link}" target="_blank">🔗 Cerca l'azienda su LinkedIn &rarr;</a>
        </div>
      `
        )
        .join('')}
    </div>

    <!-- Sezione Persone -->
    <div class="people-section">
      ${candidates
        .map(
          (p) => `
        <div class="card">
          <div class="person-header">
            <div>
              <h3 class="person-name">${p.name}</h3>
              <div class="person-role">${p.role}</div>
              <div class="person-co">${p.company} (${p.country})</div>
            </div>
            <span style="font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">${p.id}</span>
          </div>

          ${
            p.affidabilita.includes('⚠️')
              ? `<div class="warning-badge">⚠️ Verifica che sia ancora in carica prima di connetterti</div>`
              : ''
          }

          <div class="why-box">
            <span class="why-title">Perché:</span> ${p.motivo}
          </div>

          <div class="note-box">
            <span class="note-label">Nota di connessione (pronta da incollare):</span>
            ${p.nota}
          </div>

          <div class="action-links">
            <a class="btn-action btn-fatto" href="mailto:${OWNER_EMAIL}?subject=LN%20FATTO%20${p.id}&body=Premi%20invia">✅ Fatto</a>
            <a class="btn-action btn-salta" href="mailto:${OWNER_EMAIL}?subject=LN%20SALTA%20${p.id}&body=Premi%20invia">⏭ Salta</a>
            <a class="btn-action btn-linkedin" href="${p.link}" target="_blank">Cerca su LinkedIn ↗</a>
          </div>
        </div>
      `
        )
        .join('')}
    </div>

    <!-- Bottone Fatto tutti e 3 -->
    <div class="all-done-wrapper">
      <a class="btn-all-done" href="mailto:${OWNER_EMAIL}?subject=LN%20FATTO%20${allIds}&body=Premi%20invia">
        ${allButtonText}
      </a>
    </div>

    <!-- Footer con Coda residua -->
    <div class="footer">
      <div class="queue-counts">
        Persone ancora in coda: Azienda: ${remainingCounts.azienda} | Startup: ${remainingCounts.startup} | Venture: ${remainingCounts.venture}
      </div>
      ${
        remainingCounts.azienda < 4 || remainingCounts.startup < 4 || remainingCounts.venture < 4
          ? `<div class="alert-low">⚠️ Attenzione: una o più categorie hanno meno di 4 persone in coda! Avvia la ricerca per ricaricare la lista.</div>`
          : ''
      }
      <div style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
        I link LinkedIn sono ricerche, non profili verificati.
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

// 8. Invia email via Gmail API REST (`users/me/messages/send`)
export async function sendEmailViaGmailApi(
  accessToken: string,
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const boundary = 'foo_bar_baz_boundary';
    const emailLines = [
      `To: ${toEmail}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      btoa(unescape(encodeURIComponent(htmlContent))),
    ];

    const rawMessage = emailLines.join('\r\n');
    const encodedMessage = btoa(rawMessage)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Gmail Send Error (${response.status}): ${errText}` };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Errore invio email Gmail' };
  }
}

// 7. Genera e scarica il template Excel (.xlsx) a 4 schede pronto per Google Drive
export function download4TabGoogleSheetTemplate(
  historicalProcessedCompanies: { name: string; sector: string; cycle?: string; date?: string }[] = []
): void {
  const wb = XLSX.utils.book_new();

  // Scheda 1: Coda
  const codaHeaders = [
    'ID',
    'Nome',
    'Ruolo',
    'Azienda',
    'Paese',
    'Link LinkedIn (ricerca)',
    'Motivo di rilevanza',
    'Nota di connessione',
    'Stato invio',
    'Suggerita il',
    'Stato ricerca',
    'Descrizione azienda',
    'LinkedIn azienda',
    'Categoria',
  ];
  const sampleCoda = [
    codaHeaders,
    [
      'ED-001',
      'Marco Rossi',
      'Head of Innovation & ConTech',
      'EdilTech Solutions',
      'Italia',
      'https://www.linkedin.com/search/results/people/?keywords=Marco%20Rossi%20EdilTech',
      'Guida scouting di startup PropTech, ML e robotica per cantieri edili',
      'Ciao Marco, seguo con ammirazione la digitalizzazione e i modelli ML di EdilTech sui cantieri. Da studente Business School mi piacerebbe connettermi! Un saluto, Alex',
      'In coda',
      '',
      '✅ Certo',
      'Scaleup PropTech e digital construction per cantieri intelligenti',
      'https://www.linkedin.com/search/results/companies/?keywords=EdilTech',
      'Startup',
    ],
  ];
  const wsCoda = XLSX.utils.aoa_to_sheet(sampleCoda);
  XLSX.utils.book_append_sheet(wb, wsCoda, 'Coda');

  // Scheda 2: Aziende
  const aziendeHeaders = [
    'Nome',
    'Descrizione',
    'Settore',
    'Dimensione',
    'HQ',
    'Paesi',
    'Sito web',
    'Careers',
    'LinkedIn',
    'Notizie recenti',
    'Ciclo',
    'Data aggiunta',
  ];
  const sampleAziende = [
    aziendeHeaders,
    [
      'EdilTech Solutions',
      'Computer vision e sensoristica IoT per sicurezza e avanzamento cantieri edili',
      '7 Real Estate / PropTech',
      'Scale-up',
      'Milano',
      'Italia, Spagna',
      'https://example.com',
      'https://example.com/careers',
      'https://www.linkedin.com/search/results/companies/?keywords=EdilTech',
      'Chiuso round serie B da 20M€ per espansione in Europa',
      9,
      new Date().toISOString().slice(0, 10),
    ],
  ];
  const wsAziende = XLSX.utils.aoa_to_sheet(sampleAziende);
  XLSX.utils.book_append_sheet(wb, wsAziende, 'Aziende');

  // Scheda 3: Persone
  const personeHeaders = [
    'ID',
    'Nome',
    'Ruolo',
    'Tipo ruolo',
    'Paese',
    'Azienda',
    'Link LinkedIn',
    'Stato ricerca',
    'Fonte',
    'Motivo di rilevanza',
    'Nota di connessione',
    'Suggerita il',
    'Contattato il',
    'Note',
    'Ciclo',
    'Data aggiunta',
  ];
  const wsPersone = XLSX.utils.aoa_to_sheet([personeHeaders]);
  XLSX.utils.book_append_sheet(wb, wsPersone, 'Persone');

  // Scheda 4: Aziende già processate
  const procHeaders = ['Azienda', 'Settore', 'Ciclo', 'Data'];
  const procRows = [
    procHeaders,
    ...historicalProcessedCompanies.map((p) => [
      p.name,
      p.sector || 'Tech / Digital',
      p.cycle || '#8',
      p.date || 'Recente',
    ]),
  ];
  const wsProc = XLSX.utils.aoa_to_sheet(procRows);
  XLSX.utils.book_append_sheet(wb, wsProc, 'Aziende già processate');

  XLSX.writeFile(wb, 'Template_Hub_Networking_LinkedIn_4Schede.xlsx');
}


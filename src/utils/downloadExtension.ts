import JSZip from 'jszip';

export async function downloadExtensionZip(appOrigin: string) {
  const zip = new JSZip();

  const manifestContent = JSON.stringify({
    manifest_version: 3,
    name: "Intern Track - LinkedIn 1-Click",
    version: "1.0.0",
    description: "Importa offerte da LinkedIn direttamente in Intern Track con un clic.",
    permissions: ["activeTab", "scripting"],
    host_permissions: ["*://*.linkedin.com/*"],
    action: {
      default_popup: "popup.html",
      default_title: "Invia annuncio a Intern Track"
    }
  }, null, 2);

  const popupHtmlContent = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 320px;
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .badge {
      background: #2563eb;
      color: white;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 8px;
      letter-spacing: 0.5px;
    }
    h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #fff;
    }
    p {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.45;
      margin: 0 0 14px 0;
    }
    .btn {
      width: 100%;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      color: white;
      border: none;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(37,99,235,0.35);
      transition: all 0.2s;
    }
    .btn:hover {
      opacity: 0.95;
      transform: translateY(-1px);
    }
    .btn:active {
      transform: translateY(0);
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .status {
      margin-top: 10px;
      font-size: 11px;
      padding: 8px 10px;
      border-radius: 10px;
      display: none;
      line-height: 1.4;
    }
    .status.success {
      display: block;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status.error {
      display: block;
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="badge">IT</span>
    <h2>Intern Track Importer</h2>
  </div>
  <p>Clicca il pulsante mentre guardi un'offerta di lavoro su LinkedIn: estrae testo e link e apre Intern Track precompilato.</p>
  <button id="import-btn" class="btn">
    <span>✦ Invia a Intern Track</span>
  </button>
  <div id="status-box" class="status"></div>
  <script src="popup.js"></script>
</body>
</html>`;

  const popupJsContent = `document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('import-btn');
  const statusBox = document.getElementById('status-box');
  const appBaseUrl = '${appOrigin}';

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerText = 'Lettura in corso...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('Nessuna scheda attiva trovata.');
      }

      // Esegue lo script nella scheda attiva di LinkedIn
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Selettori avanzati per LinkedIn (sia pagina singola che elenco con riquadro destro)
          const title = document.querySelector('h1')?.innerText?.trim() || '';
          const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name') ||
                            document.querySelector('.jobs-unified-top-card__company-name') ||
                            document.querySelector('.topcard__org-name-link') ||
                            document.querySelector('a[href*="/company/"]');
          const company = companyEl ? companyEl.innerText.trim() : '';

          const descEl = document.querySelector('#job-details') ||
                         document.querySelector('.jobs-search__job-details') ||
                         document.querySelector('.jobs-description') ||
                         document.querySelector('.job-details-jobs-unified-top-card') ||
                         document.querySelector('.jobs-box__html-content') ||
                         document.querySelector('main') ||
                         document.body;

          const descText = descEl ? descEl.innerText.replace(/\\s+/g, ' ').trim() : '';
          const combinedText = (company || title)
            ? 'Azienda: ' + company + ' | Ruolo: ' + title + '\\n\\n' + descText
            : descText;

          // Pulizia dell'URL per avere il link diretto
          let url = window.location.href;
          const matchJobId = url.match(/currentJobId=(\\d+)/) || url.match(/jobs\\/view\\/(\\d+)/);
          if (matchJobId && matchJobId[1]) {
            url = 'https://www.linkedin.com/jobs/view/' + matchJobId[1] + '/';
          } else {
            url = url.split('&trackingId=')[0].split('&refId=')[0];
          }

          return { text: combinedText.slice(0, 3800), url: url };
        }
      });

      if (!results || !results[0] || !results[0].result) {
        throw new Error('Assicurati di essere su una pagina di annuncio di LinkedIn.');
      }

      const { text, url } = results[0].result;
      const targetUrl = appBaseUrl + '/?action=new_job&import_url=' + encodeURIComponent(url) + '&import_text=' + encodeURIComponent(text);

      statusBox.className = 'status success';
      statusBox.innerText = '✓ Annuncio letto! Apertura scheda Intern Track...';

      // Apre la nuova scheda
      chrome.tabs.create({ url: targetUrl });
      setTimeout(() => window.close(), 1200);

    } catch (err) {
      statusBox.className = 'status error';
      statusBox.innerText = 'Errore: ' + (err.message || 'Apri una pagina di offerta lavoro su LinkedIn');
      btn.disabled = false;
      btn.innerText = '✦ Riprova';
    }
  });
});`;

  const readmeContent = `=====================================================
INTERN TRACK - ESTENSIONE 1-CLIC LINKEDIN
=====================================================

COME INSTALLARE L'ESTENSIONE SU GOOGLE CHROME IN 30 SECONDI:

1. Estrai questo archivio ZIP in una cartella a tua scelta sul tuo computer
   (ad esempio nella cartella Download o Documenti: "intern-track-extension").

2. Apri Google Chrome e scrivi nella barra degli indirizzi:
   chrome://extensions
   e premi Invio.

3. In alto a destra della pagina, attiva la levetta:
   [x] "Modalità sviluppatore" (o "Developer mode").

4. In alto a sinistra, clicca sul pulsante:
   [ Carica estensione non pacchettizzata ] (o "Load unpacked").

5. Seleziona la cartella estratta ("intern-track-extension").

Fatto! L'estensione è installata.

CONSIGLIO UTILE:
Nella barra degli strumenti di Chrome in alto a destra, clicca sull'icona
del puzzle (Estensioni) e premi la spilla accanto a "Intern Track"
per tenerla sempre visibile vicino alla barra degli indirizzi.

COME USARLA:
1. Naviga su qualsiasi offerta di lavoro su LinkedIn.
2. Clicca l'icona di Intern Track nella barra di Chrome.
3. Premi "✦ Invia a Intern Track".
Si aprirà automaticamente la tua app con tutti i dati compilati e il logo caricato con Gemini AI!
`;

  zip.file('manifest.json', manifestContent);
  zip.file('popup.html', popupHtmlContent);
  zip.file('popup.js', popupJsContent);
  zip.file('ISTRUZIONI-INSTALLAZIONE.txt', readmeContent);

  const blob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'intern-track-extension.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('import-btn');
  const statusBox = document.getElementById('status-box');

  // URL base di Intern Track (sostituibile con il proprio link)
  const appBaseUrl = 'https://YOUR-APP.vercel.app' /* sostituisci con l'indirizzo del tuo deploy */;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerText = 'Estrazione in corso...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('Nessuna scheda attiva trovata');
      }

      // Esegue lo script nella pagina attiva per estrarre il testo della job description
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
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

          const descText = descEl ? descEl.innerText.replace(/\s+/g, ' ').trim() : '';
          const combinedText = (company || title)
            ? 'Azienda: ' + company + ' | Ruolo: ' + title + '\n\n' + descText
            : descText;

          let url = window.location.href;
          const matchJobId = url.match(/currentJobId=(\d+)/) || url.match(/jobs\/view\/(\d+)/);
          if (matchJobId && matchJobId[1]) {
            url = 'https://www.linkedin.com/jobs/view/' + matchJobId[1] + '/';
          } else {
            url = url.split('&trackingId=')[0].split('&refId=')[0];
          }

          return { text: combinedText.slice(0, 3800), url: url };
        }
      });

      if (!results || !results[0] || !results[0].result) {
        throw new Error('Impossibile leggere la pagina. Assicurati di essere su LinkedIn');
      }

      const { text, url } = results[0].result;
      const targetUrl = `${appBaseUrl}/?action=new_job&import_url=${encodeURIComponent(url)}&import_text=${encodeURIComponent(text)}`;

      statusBox.className = 'status success';
      statusBox.innerText = '✓ Annuncio estratto! Apertura Intern Track in corso...';

      // Apre la nuova scheda con Intern Track
      chrome.tabs.create({ url: targetUrl });
      setTimeout(() => window.close(), 1200);

    } catch (err) {
      statusBox.className = 'status error';
      statusBox.innerText = 'Errore: ' + (err.message || 'Assicurati di essere sulla pagina di un lavoro di LinkedIn');
      btn.disabled = false;
      btn.innerText = 'Riprova';
    }
  });
});

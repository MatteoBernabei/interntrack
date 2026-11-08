import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// ─────────────────────────────────────────────────────────────
// Access control for the AI routes
// The AI features use YOUR Gemini key, so they stay closed until you set ALLOWED_EMAILS
// (comma-separated list) and the caller is signed in with one of those accounts.
// On the public demo (no such variables) they answer 503 and the app keeps using sample data.
// ─────────────────────────────────────────────────────────────
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return null;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!r.ok) return null;
  const data: any = await r.json();
  const user = data?.users?.[0];
  if (!user?.email || user.emailVerified === false) return null;
  return String(user.email).toLowerCase();
}

app.use('/api/ai', async (req, res, next) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI features are not configured (demo mode).' });
  }
  if (ALLOWED_EMAILS.length === 0) {
    return res.status(503).json({ error: 'AI features are disabled: set ALLOWED_EMAILS on the server.' });
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Sign-in required.' });
  try {
    const email = await verifyFirebaseIdToken(token);
    if (!email || !ALLOWED_EMAILS.includes(email)) {
      return res.status(403).json({ error: 'Account not authorized.' });
    }
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token.' });
  }
});

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'MISSING_KEY', // without a key the AI routes stay blocked by the middleware below
  httpOptions: {
    headers: {
      'User-Agent': 'interntrack',
    },
  },
});

// Fast, resilient Gemini caller with model fallback (gemini-3.1-flash-lite first for instant response)
async function callGemini(params: any): Promise<any> {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastErr = null;

  for (const model of models) {
    try {
      return await ai.models.generateContent({
        model,
        ...params,
      });
    } catch (error: any) {
      console.warn(`Model ${model} returned error (${error?.status || error?.message}). Trying fallback...`);
      lastErr = error;
    }
  }

  throw lastErr;
}

// Candidate profile used in the AI prompts.
// Configure it with the CANDIDATE_NAME and CANDIDATE_PROFILE environment variables (free text, "\\n" = new line).
// Personal details are NOT in the code: they live in your deployment's variables.
const CANDIDATE_NAME = process.env.CANDIDATE_NAME || 'il candidato';
const CANDIDATE_CONTEXT = (process.env.CANDIDATE_PROFILE ||
`Candidato: ${CANDIDATE_NAME}
Education, experience and skills: not configured (set CANDIDATE_PROFILE).
Ruoli cercati: Founder Associate, Growth Manager, Business Developer, Venture Builder.
Regole di comunicazione: tono diretto e professionale, frasi brevi e concrete, niente enfasi o esclamazioni, nessun cliché, massima credibilità.`
).replace(/\\n/g, '\n');

// Helper to fetch and extract readable text from a job URL
async function fetchJobPageText(targetUrl: string): Promise<{ text: string; isBlocked: boolean; title?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { text: '', isBlocked: true };
    }

    const html = await res.text();
    const lowerHtml = html.toLowerCase();

    // Detect login walls, captchas or empty client-rendered shells
    if (
      lowerHtml.includes('sign in to linkedin') ||
      lowerHtml.includes('join linkedin') ||
      lowerHtml.includes('authwall') ||
      lowerHtml.includes('login') && lowerHtml.includes('password') && html.length < 2500 ||
      lowerHtml.includes('captcha') ||
      lowerHtml.includes('access denied') ||
      lowerHtml.includes('cloudflare') ||
      html.length < 300
    ) {
      return { text: '', isBlocked: true };
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';

    const clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    const combined = `Titolo Pagina: ${title}\nDescrizione Meta: ${metaDesc}\n\nContenuto Annuncio:\n${clean.slice(0, 8000)}`;
    return { text: combined, isBlocked: false, title };
  } catch (err) {
    return { text: '', isBlocked: true };
  }
}

// ─────────────────────────────────────────────────────────────
// Intelligent Extractor for Structured Job Announcements
// Accurately extracts company, domain, role, location, contract, and tailored strategy
// ─────────────────────────────────────────────────────────────
function extractJobDetailsIntelligently(rawText: string, originalUrl: string) {
  const text = (rawText || '').trim();

  // 1. Company Name & Domain
  let company = '';
  let role = '';

  // Check header generated by Chrome extension: "Azienda: X | Ruolo: Y"
  const extHeader = text.match(/^Azienda:\s*([^|\n\r]+?)\s*\|\s*Ruolo:\s*([^\n\r]+)/i);
  if (extHeader) {
    company = extHeader[1].trim();
    role = extHeader[2].trim();
  }

  // Check URL slug if company/role is in the URL: e.g. -at-scalapay- or /company/scalapay
  if (!company && originalUrl) {
    const slugMatch = originalUrl.match(/(?:-at-|\/company\/)([a-zA-Z0-9-]+?)(?:-\d+|\/|$)/i);
    if (slugMatch && slugMatch[1] && !/^\d+$/.test(slugMatch[1])) {
      company = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  // Check "X is hiring" or "X sta assumendo"
  if (!company) {
    const hiringMatch = text.match(/([A-Z][A-Za-z0-9&.\-_]{2,25})\s+(?:is hiring|sta assumendo|cerca|seleziona|assume)/i);
    if (hiringMatch && !/^(Il|La|Chi|Cosa|Come|Noi|Team|Un|Una|Offerta)/i.test(hiringMatch[1])) {
      company = hiringMatch[1].trim();
    }
  }

  // Check labeled fields: "Azienda: X" or "Company: X"
  if (!company) {
    const compField = text.match(/(?:Azienda|Company|Societ[àa]|Datore di lavoro)\s*[:\-–]\s*([A-Za-z0-9&.\-_ ]{2,30})/i);
    if (compField && !/^(milano|roma|italia|stage|tempo|team|un|una|il|la|laurea|ingegneria)/i.test(compField[1].trim())) {
      company = compField[1].trim();
    }
  }

  // Check "presso <Company>" or "join <Company>"
  if (!company) {
    const atMatch = text.match(/(?:presso|join|hiring for)\s+([A-Z][A-Za-z0-9&.\-_]{1,25})/i);
    if (atMatch && !/^(Ingegneria|Italia|Milano|Roma|Stage|Tempo|Team|Un|Una|Il|La|Master|Nostra)/i.test(atMatch[1].trim())) {
      company = atMatch[1].trim();
    }
  }

  if (!company) {
    const firstWord = text.split(/\s+/)[0];
    if (firstWord && /^[A-Z][A-Za-z0-9]{2,20}$/.test(firstWord) && !/^(Azienda|Offerta|Lavoro|Stage|Cercasi|Il|La|Un|Una)$/i.test(firstWord)) {
      company = firstWord;
    }
  }

  if (!company) company = 'Azienda';

  // Domain overrides for high-res logo fetching
  const domainOverrides: Record<string, string> = {
    'revolut': 'revolut.com',
    'scalapay': 'scalapay.com',
    'bending spoons': 'bendingspoons.com',
    'bendingspoons': 'bendingspoons.com',
    'satispay': 'satispay.com',
    'casavo': 'casavo.com',
    'everli': 'everli.com',
    'deliveroo': 'deliveroo.com',
    'celonis': 'celonis.com',
    'n26': 'n26.com',
    'klarna': 'klarna.com',
    'stripe': 'stripe.com',
    'mckinsey': 'mckinsey.com',
    'bcg': 'bcg.com',
    'bain': 'bain.com',
    'accenture': 'accenture.com',
    'deloitte': 'deloitte.com',
    'pwc': 'pwc.com',
    'kpmg': 'kpmg.com',
    'amazon': 'amazon.com',
    'google': 'google.com',
    'meta': 'meta.com',
    'microsoft': 'microsoft.com',
    'uber': 'uber.com',
    'aircall': 'aircall.io',
    'qonto': 'qonto.com',
    'prima assicurazioni': 'prima.it',
    'musixmatch': 'musixmatch.com',
    'plug and play': 'plugandplaytechcenter.com',
  };

  const compNorm = company.toLowerCase().trim();
  let companyDomain = domainOverrides[compNorm] || '';
  if (!companyDomain) {
    for (const [k, v] of Object.entries(domainOverrides)) {
      if (compNorm.includes(k) || k.includes(compNorm)) {
        companyDomain = v;
        break;
      }
    }
  }
  if (!companyDomain && company !== 'Azienda') {
    companyDomain = compNorm.replace(/[^a-z0-9]/g, '') + '.com';
  }

  // 2. Role Extraction
  if (!role && originalUrl) {
    const slugMatch = originalUrl.match(/\/jobs\/view\/([a-zA-Z0-9-]+?)(?:-at-|\/?$)/);
    if (slugMatch && slugMatch[1] && !/^\d+$/.test(slugMatch[1])) {
      role = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  if (!role) {
    const roleField = text.match(/(?:Ruolo|Posizione|Position|Job Title|Titolo)\s*[:\-–]\s*([^\n\r]{3,60})/i);
    if (roleField) {
      role = roleField[1].trim();
    }
  }

  if (!role) {
    const hiringRoleMatch = text.match(/(?:is hiring|sta assumendo|cerca|seleziona)\s+(?:an?|il|la|un|uno|una)?\s*([A-Za-z0-9&.\-_/ ]{3,45}?)(?:\s+(?:in|a|at|per|presso|con|\n|\.|\,))/i);
    if (hiringRoleMatch && hiringRoleMatch[1]) {
      role = hiringRoleMatch[1].trim();
    }
  }

  if (!role) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 8);
    for (const l of lines) {
      if (/(?:associate|intern|manager|analyst|developer|founder|growth|consultant|specialist|lead|operations|program)/i.test(l) && l.length < 60) {
        role = l;
        break;
      }
    }
  }

  if (!role) {
    if (/founder associate/i.test(text)) role = 'Founder Associate';
    else if (/growth/i.test(text)) role = 'Growth Associate';
    else if (/business develop/i.test(text)) role = 'Business Development Intern';
    else if (/operations/i.test(text)) role = 'Operations Associate';
    else role = 'Posizione Offerta';
  }

  role = role.replace(/^(ruolo|posizione|titolo)\s*[:\-–]\s*/i, '').trim();

  // 3. Location: City & Country
  let city = 'Milano';
  let country = 'IT';
  const cities: Array<{ regex: RegExp; city: string; country: string }> = [
    { regex: /\b(milano|milan)\b/i, city: 'Milano', country: 'IT' },
    { regex: /\b(roma|rome)\b/i, city: 'Roma', country: 'IT' },
    { regex: /\b(torino|turin)\b/i, city: 'Torino', country: 'IT' },
    { regex: /\b(bologna)\b/i, city: 'Bologna', country: 'IT' },
    { regex: /\b(firenze|florence)\b/i, city: 'Firenze', country: 'IT' },
    { regex: /\b(napoli|naples)\b/i, city: 'Napoli', country: 'IT' },
    { regex: /\b(monaco|munich|münchen)\b/i, city: 'Monaco', country: 'DE' },
    { regex: /\b(berlino|berlin)\b/i, city: 'Berlino', country: 'DE' },
    { regex: /\b(francoforte|frankfurt)\b/i, city: 'Francoforte', country: 'DE' },
    { regex: /\b(londra|london)\b/i, city: 'Londra', country: 'UK' },
    { regex: /\b(parigi|paris)\b/i, city: 'Parigi', country: 'FR' },
    { regex: /\b(madrid)\b/i, city: 'Madrid', country: 'ES' },
    { regex: /\b(barcellona|barcelona)\b/i, city: 'Barcellona', country: 'ES' },
    { regex: /\b(amsterdam)\b/i, city: 'Amsterdam', country: 'NL' },
    { regex: /\b(dublino|dublin)\b/i, city: 'Dublino', country: 'IE' },
    { regex: /\b(zurigo|zurich)\b/i, city: 'Zurigo', country: 'CH' },
  ];
  for (const c of cities) {
    if (c.regex.test(text)) {
      city = c.city;
      country = c.country;
      break;
    }
  }

  // 4. Work Mode
  let workMode = 'Ibrido';
  if (/\b(remoto|remote|full remote|100% remote|lavoro agile)\b/i.test(text)) {
    workMode = 'Remoto';
  } else if (/\b(in sede|on[\s-]?site|in ufficio|in presence)\b/i.test(text)) {
    workMode = 'In sede';
  } else if (/\b(ibrido|hybrid|smart working|flessibile)\b/i.test(text)) {
    workMode = 'Ibrido';
  }

  // 5. Job Family (grp)
  let grp: 'Business Development e Growth' | 'Founder Associate' | 'Growth' | 'Strategia e analisi' | 'Altro' = 'Founder Associate';
  const roleLower = role.toLowerCase();
  if (/founder associate|chief of staff|ceo office|entrepreneur in residence/i.test(roleLower) || /founder associate/i.test(text)) {
    grp = 'Founder Associate';
  } else if (/growth|marketing|performance/i.test(roleLower)) {
    grp = 'Growth';
  } else if (/business develop|bizdev|sales|partnership|account/i.test(roleLower)) {
    grp = 'Business Development e Growth';
  } else if (/strateg|analyst|operations|consulting|venture|investment|finance/i.test(roleLower)) {
    grp = 'Strategia e analisi';
  }

  // 6. Kind & Contract
  let kind: 'Stage' | 'Tirocinio' | 'Apprendistato' | 'Graduate program' | 'Lavoro' | 'Part-time' = 'Stage';
  let contract: 'Stage' | 'Apprendistato' | 'Determinato' | 'Indeterminato' = 'Stage';

  if (/graduate|neolaureat|trainee/i.test(text) || /graduate|trainee/i.test(roleLower)) {
    kind = 'Graduate program';
    contract = 'Determinato';
  } else if (/apprendistato/i.test(text)) {
    kind = 'Apprendistato';
    contract = 'Apprendistato';
  } else if (/indeterminato|permanent|full[\s-]?time/i.test(text) && !/stage|tirocinio|intern/i.test(roleLower)) {
    kind = 'Lavoro';
    contract = 'Indeterminato';
  } else if (/determinato|fixed[\s-]?term/i.test(text)) {
    kind = 'Lavoro';
    contract = 'Determinato';
  } else if (/part[\s-]?time/i.test(text)) {
    kind = 'Part-time';
    contract = 'Determinato';
  }

  // 7. Salary
  let salary = '';
  const salMatch = text.match(/(?:€\s*[\d.,]+(?:\s*-\s*[\d.,]+)?(?:\s*(?:k|\/mese|\/anno|€))?)|(?:[\d.,]+\s*€(?:\s*[\/-]\s*mese)?)|(?:[\d.,k€\s-]+RAL)|(?:RAL\s*[:\-–]?\s*[\d.,k€\s-]+)/i);
  if (salMatch) {
    salary = salMatch[0].trim();
  } else if (kind === 'Stage' && (city === 'Milano' || country === 'IT')) {
    salary = '800€ - 1.000€ / mese (indicativo)';
  }

  // 8. Requirements
  let requirements = '';
  const reqMatch = text.match(/(?:requisiti|chi cerchiamo|requirements|what we look for|qualifications|candidato ideale|cosa chiediamo)[\s\S]{10,800}?(?=(?:cosa offriamo|benefits|benefit|about us|processo|selezione|$))/i);
  if (reqMatch) {
    requirements = reqMatch[0].trim().slice(0, 750);
  } else {
    const reqLines = text.split('\n').filter(l => /laurea|esperienza|competenze|inglese|excel|python|sql|problem solving|team/i.test(l)).slice(0, 4);
    requirements = reqLines.join('\n').slice(0, 600) || 'Laurea Magistrale in Ingegneria Gestionale o Economia, forte attitudine quantitativa e problem solving.';
  }

  // 9. Description
  let description = '';
  const descMatch = text.match(/(?:chi siamo|about us|the role|about the role|la posizione|cosa farai|responsabilit[àa]|responsibilities|the opportunity)[\s\S]{10,800}?(?=(?:requisiti|chi cerchiamo|requirements|$))/i);
  if (descMatch) {
    description = descMatch[0].trim().slice(0, 900);
  } else {
    description = text.slice(0, 800);
  }

  // 10. Key Strategic Advice tailored for the candidate
  let keyAdvice = '';
  if (grp === 'Founder Associate') {
    keyAdvice = `Per questa posizione da Founder Associate in ${company}: valorizza il percorso di studi e le esperienze di go-to-market. Sottolinea l'execution rapida e la capacità di modellare unit economics.`;
  } else if (grp === 'Growth' || grp === 'Business Development e Growth') {
    keyAdvice = `Per questo ruolo di Growth & BD in ${company}: metti in primo piano le unit economics, le metriche di scaling e gli strumenti quantitativi (Python, SQL, Excel avanzato). Cita la vittoria nella competizione di business management come prova di leadership decisionale.`;
  } else {
    keyAdvice = `Per questa posizione di strategia in ${company}: posizionati come figura ponte che coniuga rigore metodologico e visione internazionale ed imprenditoriale.`;
  }

  return {
    company,
    companyDomain,
    role,
    city,
    country,
    kind,
    contract,
    workMode,
    salary,
    deadline: '',
    grp,
    priority: 'Alta',
    platform: (originalUrl.includes('linkedin.com') || text.includes('LinkedIn')) ? 'LinkedIn' : 'Sito aziendale',
    description,
    requirements,
    keyAdvice,
  };
}

// ─────────────────────────────────────────────────────────────
// 1. POST /api/ai/parse-job
// Analizza testo o link di un annuncio di lavoro ed estrae campi strutturati
// ─────────────────────────────────────────────────────────────
app.post('/api/ai/parse-job', async (req, res) => {
  try {
    let { text, url } = req.body;
    let scrapedFromUrl = false;
    let originalUrl = url || '';

    if (!text && !url) {
      return res.status(400).json({ error: 'Fornire testo o URL dell\'annuncio' });
    }

    // Check if text itself is a URL (with or without protocol)
    const isUrlText = (str: string) => {
      const s = str.trim().toLowerCase();
      return s.startsWith('http://') || s.startsWith('https://') || s.startsWith('www.') || s.includes('linkedin.com/') || s.includes('indeed.com/') || (s.includes('.com/') && !s.includes(' '));
    };

    if (!url && text && isUrlText(text)) {
      url = text.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      originalUrl = url;
      text = ''; // text was only a URL, reset it so we know text wasn't provided yet
    }

    // 1. If text is already present (from extension or manual paste), SKIP network scraping completely!
    const hasSufficientText = text && typeof text === 'string' && text.trim().length >= 15 && !text.trim().startsWith('http');

    if (!hasSufficientText) {
      // 2. If it's a LinkedIn URL, we check if we can extract role & company from the URL slug first
      if (url && url.toLowerCase().includes('linkedin.com')) {
        const slugMatch = url.match(/\/jobs\/view\/([a-zA-Z0-9-]+?)(?:-at-([a-zA-Z0-9-]+))?(?:-\d+)?\/?(?:[?#]|$)/);
        if (slugMatch && (slugMatch[1] || slugMatch[2])) {
          const rawRole = (slugMatch[1] || '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          const rawComp = (slugMatch[2] || '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          if (rawComp || (rawRole && !/^\d+$/.test(rawRole))) {
            const company = rawComp || 'Azienda';
            const role = (!/^\d+$/.test(rawRole)) ? rawRole : 'Opportunità';
            const companyDomain = company ? company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com' : '';
            return res.json({
              ok: true,
              data: {
                company,
                companyDomain,
                role,
                city: 'Milano',
                country: 'IT',
                kind: 'Stage',
                contract: 'Stage',
                workMode: 'Ibrido',
                salary: '',
                deadline: '',
                grp: /growth|business/i.test(role) ? 'Business Development e Growth' : 'Founder Associate',
                priority: 'Alta',
                platform: 'LinkedIn',
                description: `Posizione importata da LinkedIn: ${role} presso ${company}.`,
                requirements: '',
                keyAdvice: `Posizione per ${role} presso ${company}. Valorizza il profilo ingegneristico-gestionale e le competenze analitiche.`,
              },
              detectedUrl: url,
            });
          }
        }

        return res.json({
          ok: false,
          requiresManualText: true,
          detectedUrl: url,
          message: 'Questo annuncio LinkedIn richiede il login: usa l\'estensione Chrome mentre sei sulla pagina per estrarre tutti i campi in 1 clic, oppure copia e incolla il testo.',
        });
      }

      // 3. For other non-LinkedIn URLs, attempt rapid scrape (max 2.5s)
      if (url) {
        const scrape = await fetchJobPageText(url);
        if (scrape.text && !scrape.isBlocked) {
          text = scrape.text;
          scrapedFromUrl = true;
        } else {
          return res.json({
            ok: false,
            requiresManualText: true,
            detectedUrl: url,
            message: 'Questo link è protetto da login o verifica di sicurezza. Incolla il testo dell\'annuncio per estrarre tutti i campi in automatico.',
          });
        }
      }
    }

    const cleanInputText = (text || '').slice(0, 4000);

    const prompt = `Analizza il seguente annuncio di lavoro ed estrai tutte le informazioni strutturate in formato JSON.
Se qualche dato non è specificato nell'annuncio, deduci un valore plausibile coerente o lascia una stringa vuota.

Annuncio di lavoro:
${cleanInputText}
`;

    try {
      const response = await callGemini({
        contents: prompt,
        config: {
          systemInstruction: 'Sei un analista esperto di talent acquisition per startup e scale-up europee. Restituisci SOLO un oggetto JSON valido.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              company: { type: Type.STRING, description: 'Nome azienda' },
              companyDomain: { type: Type.STRING, description: 'Dominio web ufficiale dell\'azienda (es. scalapay.com, bendingspoons.com, revolut.com, celonis.com). Deduci il sito web reale dell\'azienda che assume.' },
              role: { type: Type.STRING, description: 'Titolo della posizione' },
              city: { type: Type.STRING, description: 'Città principale (es. Milano, Berlino, Londra)' },
              country: { type: Type.STRING, description: 'Codice paese a due lettere (IT, DE, ES, FR, UK)' },
              kind: { type: Type.STRING, description: 'Tipo: Stage, Tirocinio, Apprendistato, Graduate program, Lavoro, Part-time' },
              contract: { type: Type.STRING, description: 'Contratto: Stage, Apprendistato, Determinato, Indeterminato' },
              workMode: { type: Type.STRING, description: 'In sede, Ibrido, Remoto' },
              salary: { type: Type.STRING, description: 'Range salariale o retribuzione indicativa se presente' },
              deadline: { type: Type.STRING, description: 'Data scadenza in formato AAAA-MM-GG se presente' },
              grp: { type: Type.STRING, description: 'Famiglia: Business Development e Growth, Founder Associate, Growth, Strategia e analisi, Altro' },
              priority: { type: Type.STRING, description: 'Alta, Media, Bassa' },
              platform: { type: Type.STRING, description: 'Piattaforma: LinkedIn, Indeed, Joinrs, CareerOS, Flexa, o Sito aziendale' },
              description: { type: Type.STRING, description: 'Sintesi del ruolo in italiano (max 1500 caratteri)' },
              requirements: { type: Type.STRING, description: 'Requisiti chiave e competenze (max 800 caratteri)' },
              keyAdvice: { type: Type.STRING, description: 'Consiglio strategico per il candidato, coerente con il suo profilo' },
            },
            required: ['company', 'role', 'city', 'country', 'grp', 'workMode'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ 
        ok: true, 
        data: parsed, 
        scrapedFromUrl, 
        detectedUrl: originalUrl 
      });
    } catch (geminiError: any) {
      console.warn('Gemini extraction unavailable, using high-precision structured extractor:', geminiError?.message);
      
      const structuredData = extractJobDetailsIntelligently(cleanInputText, originalUrl);

      return res.json({
        ok: true,
        data: structuredData,
        scrapedFromUrl,
        detectedUrl: originalUrl
      });
    }
  } catch (error: any) {
    console.error('Errore /api/ai/parse-job:', error);
    res.status(500).json({ error: error.message || 'Errore durante l\'analisi dell\'annuncio' });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. POST /api/ai/cover-letter
// Genera lettera di presentazione personalizzata per il candidato
// ─────────────────────────────────────────────────────────────
app.post('/api/ai/cover-letter', async (req, res) => {
  try {
    const { company, role, description, language = 'IT' } = req.body;
    if (!company || !role) {
      return res.status(400).json({ error: 'Azienda e ruolo obbligatori' });
    }

    const prompt = `Redigi una lettera di presentazione su misura per la posizione di "${role}" presso "${company}".
${description ? `Dettagli sul ruolo: ${description}` : ''}
Lingua richiesta: ${language === 'EN' ? 'Inglese' : 'Italiano'}.

Profilo del candidato da valorizzare:
${CANDIDATE_CONTEXT}

Regole vincolanti:
- Tono professionale, rigoroso e concreto.
- Frasi brevi ed efficaci.
- NESSUNA formula banale, enfatica o retorica ("I am thrilled", "passionate about", "onorato").
- Collega le competenze in Ingegneria Gestionale e il Master in Innovation & Entrepreneurship alle sfide reali dell'azienda.
- Lunghezza: circa 250-300 parole, pronta per l'invio.
`;

    const response = await callGemini({
      contents: prompt,
      config: {
        systemInstruction: 'Sei un senior executive career advisor. Scrivi lettere di candidatura autorevoli, misurate e incisive.',
      },
    });

    res.json({ ok: true, text: response.text });
  } catch (error: any) {
    console.error('Errore /api/ai/cover-letter:', error);
    res.status(500).json({ error: error.message || 'Errore generazione lettera' });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. POST /api/ai/interview-prep
// Predice le 5 domande e i case study più probabili
// ─────────────────────────────────────────────────────────────
app.post('/api/ai/interview-prep', async (req, res) => {
  try {
    const { company, role, stage = 'Tecnico' } = req.body;

    const prompt = `Per la posizione di "${role}" presso l'azienda "${company}" (round: ${stage}), prepara una guida per preparare al meglio il colloquio.
Candidato: ${CANDIDATE_CONTEXT}

Restituisci in JSON:
1. "questions": array di 5 domande probabili (mix di case study pratico, domande logico-quantitative e motivazionali), ciascuna con:
   - "question": la domanda posta dall'intervistatore
   - "kind": tipo (Tecnico, Case Study, Comportamentale STAR, Strategico)
   - "bestApproach": come il candidato dovrebbe strutturare la risposta facendo leva sulle sue competenze
2. "companyCultureNotes": 2 punti chiave su cosa quest'azienda valuta nei candidati
3. "questionsToAskInterviewer": 2 domande intelligenti da porre all'intervistatore a fine colloquio
`;

    const response = await callGemini({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    res.json({ ok: true, data: JSON.parse(response.text || '{}') });
  } catch (error: any) {
    console.error('Errore /api/ai/interview-prep:', error);
    res.status(500).json({ error: error.message || 'Errore preparazione colloquio' });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. POST /api/ai/connection-note
// Genera nota LinkedIn personalizzata di max 300 caratteri
// ─────────────────────────────────────────────────────────────
app.post('/api/ai/connection-note', async (req, res) => {
  try {
    const { personName, personRole, company, language = 'IT' } = req.body;

    const prompt = `Scrivi una nota di connessione LinkedIn indirizzata a ${personName || 'un professionista'}, ${personRole} presso ${company}.
Lingua: ${language === 'EN' ? 'Inglese' : 'Italiano'}.
Candidato: ${CANDIDATE_NAME}.

Regole ASSOLUTE:
- MASSIMO 295 caratteri totali spazi inclusi.
- MAI chiedere lavoro o referral direttamente.
- MAI usare formule fatte o enfatiche.
- UNA SOLA call-to-action naturale (es. rimanere in contatto, seguire l'espansione).
`;

    const response = await callGemini({
      contents: prompt,
    });

    let note = (response.text || '').trim();
    if (note.length > 300) note = note.slice(0, 297) + '...';
    res.json({ ok: true, note });
  } catch (error: any) {
    console.error('Errore /api/ai/connection-note:', error);
    res.status(500).json({ error: error.message || 'Errore generazione nota LinkedIn' });
  }
});

// ─────────────────────────────────────────────────────────────
// 5. POST /api/ai/search-companies (Google Search Grounding)
// Cerca aziende e posizioni reali attive sul web
// ─────────────────────────────────────────────────────────────
app.post('/api/ai/search-companies', async (req, res) => {
  try {
    const { role = 'Founder Associate', country = 'Italia' } = req.body;

    const prompt = `Cerca sul web 4 startup, scale-up o venture capital/venture studio con sedi o attività in ${country} o in Europa che hanno recentemente aperto posizioni per "${role}" o ruoli simili (Growth, Business Development, Strategy).
Per ogni azienda fornisci nome, breve descrizione, settore e link alla pagina carriere.`;

    const response = await callGemini({
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    res.json({ ok: true, text: response.text });
  } catch (error: any) {
    console.error('Errore /api/ai/search-companies:', error);
    res.status(500).json({ error: error.message || 'Errore ricerca aziende' });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. POST /api/ai/copilot-chat (Conversational Career Copilot)
// Risponde in modo proattivo e strategico al candidato
// ─────────────────────────────────────────────────────────────
app.post('/api/ai/copilot-chat', async (req, res) => {
  try {
    const { messages = [], question } = req.body;

    // Ensure history starts with 'user' as required by Gemini API
    const userOnlyOrSubsequent = messages.filter((m: any, idx: number) => !(idx === 0 && m.role === 'assistant'));
    
    const formattedContents = userOnlyOrSubsequent.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (question && (!formattedContents.length || formattedContents[formattedContents.length - 1]?.parts?.[0]?.text !== question)) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: question }],
      });
    }

    // Fallback if empty
    if (!formattedContents.length) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: 'Ciao, presentati come Career Copilot.' }],
      });
    }

    const response = await callGemini({
      contents: formattedContents,
      config: {
        systemInstruction: `Sei il Career Copilot personale e consulente strategico di ${CANDIDATE_NAME}.
${CANDIDATE_CONTEXT}
Compiti:
1. Aiutalo a pianificare la ricerca di lavoro (Founder Associate, Growth, BizDev, Venture Builder da gen 2027).
2. Simula colloqui, case study, domande comportamentali e negoziazioni.
3. Suggerisci strategie di networking e positioning per scale-up in Italia e all'estero (DE, ES, FR, UK).
4. Fornisci risposte concrete, prive di banalità o frasi fatte aziendali, orientate ai risultati numerici e all'esecuzione operativa.
Rispondi sempre in italiano, in modo chiaro e strutturato con elenchi puntati dove opportuno.`,
      },
    });

    res.json({ ok: true, text: response.text || 'Nessuna risposta generata.' });
  } catch (error: any) {
    console.error('Errore /api/ai/copilot-chat:', error);
    res.status(500).json({ error: error.message || 'Errore chat copilot' });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. POST /api/ai/cv-match (Real CV Match & Gap Analysis)
// ─────────────────────────────────────────────────────────────
app.post('/api/ai/cv-match', async (req, res) => {
  try {
    const { company, role, city = 'Milano' } = req.body;
    const prompt = `Analizza la compatibilità reale del candidato ${CANDIDATE_NAME} per la posizione di "${role}" presso l'azienda "${company}" a "${city}".
Candidato:
${CANDIDATE_CONTEXT}

Restituisci SOLO un oggetto JSON con questa struttura:
{
  "fitScore": number (un punteggio numerico realistico tra 75 e 98 basato sulle reali competenze),
  "strengths": string[] (3 punti di forza specifici del candidato per questo ruolo ed azienda, in base al suo profilo),
  "gaps": string[] (1-2 gap specifici o requisiti tipici di questo ruolo/mercato da verificare),
  "improvements": string[] (2 consigli pratici su come valorizzare il CV per questo specifico ruolo)
}`;

    const response = await callGemini({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ ok: true, data: parsed });
  } catch (error: any) {
    console.error('Errore /api/ai/cv-match:', error);
    res.status(500).json({ error: error.message || 'Errore CV Match' });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. POST /api/ai/sunday-scout (Automated Weekly 21 Companies & Contacts Scout)
// ─────────────────────────────────────────────────────────────
app.post('/api/ai/sunday-scout', async (req, res) => {
  try {
    const {
      excludedCompanies = [],
      currentCycle = 1,
      userName = CANDIDATE_NAME,
      userProfile = 'studente MSc',
      targetRoles = ['Founder Associate', 'Growth Manager', 'Business Developer', 'Venture Builder'],
      targetLocations = ['Italia', 'Germania', 'Spagna', 'Francia', 'Regno Unito'],
      targetSectors = [],
      targetInterests = [],
      customFocus = '',
    } = req.body;
    const todayIso = new Date().toISOString().slice(0, 10);
    const cycleNum = Number(currentCycle) || 1;

    const excludedList = (Array.isArray(excludedCompanies) ? excludedCompanies : [])
      .map((c: string) => c.toLowerCase().trim())
      .filter(Boolean);

    const sectorsPrompt = (targetSectors && targetSectors.length > 0)
      ? targetSectors.map((s: string, idx: number) => `${idx + 1}. ${s}`).join('\n')
      : `1. Financial Services / Fintech
2. Retail / E-commerce
3. Consumer Goods / FMCG
4. Healthcare / Life Sciences
5. Energy / Sustainability
6. Tech / SaaS B2B
7. Real Estate / PropTech`;

    const locationsStr = (targetLocations && targetLocations.length > 0)
      ? targetLocations.join(', ')
      : 'Italia ed Europa (IT, DE, ES, FR, UK)';

    const rolesStr = (targetRoles && targetRoles.length > 0)
      ? targetRoles.join(', ')
      : 'Founder Associate, Growth Manager, Business Developer, Venture Builder';

    const interestsStr = (targetInterests && targetInterests.length > 0)
      ? `\nAMBITI E INTERESSI CHIAVE SPECIFICI: ${targetInterests.join(', ')}`
      : '';

    const prompt = `Sei l'assistente di networking LinkedIn di ${userName}, ${userProfile}. Il suo obiettivo: ruoli come ${rolesStr}.${interestsStr}
${customFocus ? `FOCUS SPECIFICO RICHIESTO: ${customFocus}\n` : ''}
Genera la ricerca settimanale per l'Hub Networking LinkedIn secondo le seguenti REGOLE FERREE:

1. QUANTE AZIENDE E PERSONE:
- Devi generare ESATTAMENTE 21 aziende cercate E 21 persone nuove da inserire in coda (7 Azienda, 7 Startup, 7 Venture).
- Distribuisci le aziende sui settori indicati:
${sectorsPrompt}
- Per ogni settore, genera una coppia: 1 Azienda (grande o scale-up >100 dipendenti) e 1 Startup correlata (<100 dipendenti).
- Per la categoria Venture (7 realtà in totale), alterna Venture Builder / Venture Studio e Venture Capital (es. 4 VC e 3 Venture Studio/Builder).
- Focus geografico prioritario: ${locationsStr}.
- ESCLUDI categoricamente queste aziende già processate: ${JSON.stringify(excludedList.slice(0, 60))}.

2. PERSONE E RUOLI CERCATI:
- Startup: co-founder, CEO, CTO, CFO, Head of Growth, HR/Talent (sede principale).
- Scale-up / Grandi: Founder, CEO, CTO, CFO, COO, CGO, Country Manager, Head of Growth, Talent Acquisition.
- Venture: Fondatori, Managing Partner, Partner, Principal, Head of Platform / Talent, Venture Builder / Investment Associate.
- Per ogni persona assegna affidabilità: "✅ Certo" o "⚠️ DA VERIFICARE".
- Non inventare mai persone fittizie: usa nomi, ruoli e aziende reali del panorama indicato.

3. PER OGNI PERSONA:
- ID: Sigla azienda di 2-3 lettere maiuscole + trattino + numero a 3 cifre (es. "CLV-001", "N26-002", "BTP-003").
- Motivo di rilevanza: 1 frase basata sul ruolo o notizie di crescita, orientata a ${rolesStr}.
- Nota di connessione: MASSIMO 300 caratteri. In italiano se la persona è in Italia, in inglese se all'estero. Tono diretto e professionale, menziona che ${userName} è ${userProfile}, firma "${userName}", NESSUNA richiesta di lavoro.
- Link LinkedIn Persona: "https://www.linkedin.com/search/results/people/?keywords=" + Nome + "%20" + Cognome + "%20" + NomeAzienda
- Link LinkedIn Azienda: "https://www.linkedin.com/search/results/companies/?keywords=" + NomeAzienda

4. FORMATO DI RISPOSTA:
Restituisci SOLO un oggetto JSON con questa struttura esatta:
{
  "aziende": [
    {
      "nome": string,
      "descrizione": string,
      "settore": string,
      "dimensione": "Large/Enterprise" | "Scale-up" | "Startup",
      "hq": string,
      "paesi": string,
      "sito": string,
      "careers": string,
      "linkedin": string,
      "notizie": string,
      "ciclo": number,
      "data": string
    }
  ],
  "persone": [
    {
      "id": string,
      "nome": string,
      "ruolo": string,
      "tipoRuolo": string,
      "paese": string,
      "azienda": string,
      "linkLinkedin": string,
      "statoRicerca": "✅ Certo" | "⚠️ DA VERIFICARE",
      "fonte": string,
      "motivo": string,
      "notaConnessione": string,
      "suggeritaIl": "",
      "connessione": "",
      "note": string,
      "ciclo": number,
      "data": string
    }
  ],
  "coda": [
    {
      "id": string,
      "nome": string,
      "ruolo": string,
      "azienda": string,
      "paese": string,
      "link": string,
      "motivo": string,
      "nota": string,
      "statoInvio": "In coda",
      "inviataIl": "",
      "affidabilita": "✅ Certo" | "⚠️ DA VERIFICARE",
      "descrizioneAzienda": string,
      "linkedinAzienda": string,
      "categoria": "Azienda" | "Startup" | "Venture",
      "settore": string
    }
  ],
  "aziendeGiaProcessate": [
    {
      "nome": string,
      "settore": string,
      "ciclo": number,
      "data": string
    }
  ],
  "riepilogo": {
    "aziendeCercate": 21,
    "personeCerto": number,
    "personeDaVerificare": number,
    "inCodaAzienda": 7,
    "inCodaStartup": 7,
    "inCodaVenture": 7,
    "obiettiviRaggiunti": true
  }
}`;

    const response = await callGemini({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ ok: true, data: parsed });
  } catch (error: any) {
    console.error('Errore /api/ai/sunday-scout:', error);
    res.status(500).json({ error: error.message || 'Errore Sunday Scout' });
  }
});

// ─────────────────────────────────────────────────────────────
// Vite middleware in dev or static files in prod
// ─────────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server Intern Track running on http://0.0.0.0:${port}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };


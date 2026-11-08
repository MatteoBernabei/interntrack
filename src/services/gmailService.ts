// Gmail REST API client for scanning recruiter communications and application updates
// Uses OAuth Bearer token obtained via client-side Firebase Auth

export interface RecruiterEmailMessage {
  id: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  date: string;
  timestamp: number;
  matchedCompany?: string;
  matchedAppId?: string;
  detectedIntent: 'interview' | 'offer' | 'assessment' | 'rejection' | 'update' | 'general';
  suggestedAction: string;
  targetStatus?: 'todo' | 'applied' | 'interview' | 'offer' | 'rejected';
}

// Extract clean email from "Name <email@domain.com>" or "email@domain.com"
export function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase().trim();
  return raw.replace(/["']/g, '').toLowerCase().trim();
}

// Classify recruiter email intent
export function classifyRecruiterEmail(
  subject: string,
  snippet: string
): {
  detectedIntent: RecruiterEmailMessage['detectedIntent'];
  suggestedAction: string;
  targetStatus?: RecruiterEmailMessage['targetStatus'];
} {
  const combined = `${subject} ${snippet}`.toLowerCase();

  // 1. Offer
  if (
    combined.includes('offerta') ||
    combined.includes('job offer') ||
    combined.includes('congratulations! offer') ||
    combined.includes('proposta contrattuale') ||
    combined.includes('formal offer')
  ) {
    return {
      detectedIntent: 'offer',
      suggestedAction: 'Sposta a "Offerta" & Prepara analisi contrattuale',
      targetStatus: 'offer',
    };
  }

  // 2. Interview / Screening
  if (
    combined.includes('colloquio') ||
    combined.includes('interview') ||
    combined.includes('screening call') ||
    combined.includes('meet the team') ||
    combined.includes('invitation to interview') ||
    combined.includes('fissare una call') ||
    combined.includes('calendly.com') ||
    combined.includes('google meet') ||
    combined.includes('round 1') ||
    combined.includes('next steps')
  ) {
    return {
      detectedIntent: 'interview',
      suggestedAction: 'Sposta a "Colloquio" & Aggiungi data in calendario',
      targetStatus: 'interview',
    };
  }

  // 3. Technical Test / Case Study
  if (
    combined.includes('case study') ||
    combined.includes('test logico') ||
    combined.includes('assessment') ||
    combined.includes('coding challenge') ||
    combined.includes('business case') ||
    combined.includes('hackerank') ||
    combined.includes('compito pratico')
  ) {
    return {
      detectedIntent: 'assessment',
      suggestedAction: 'Registra Task: Completamento Case Study',
      targetStatus: 'interview',
    };
  }

  // 4. Rejection
  if (
    combined.includes('non proseguire') ||
    combined.includes('altri candidati') ||
    combined.includes('not moving forward') ||
    combined.includes('pursuing other candidates') ||
    combined.includes('unfortunately') ||
    combined.includes('purtroppo') ||
    combined.includes('unsuccessful') ||
    combined.includes('non idoneo')
  ) {
    return {
      detectedIntent: 'rejection',
      suggestedAction: 'Sposta a "Rifiutato" & Registra feedback di crescita',
      targetStatus: 'rejected',
    };
  }

  // 5. Update / Confirmation
  if (
    combined.includes('candidatura ricevuta') ||
    combined.includes('application received') ||
    combined.includes('abbiamo ricevuto il tuo cv') ||
    combined.includes('application confirmation')
  ) {
    return {
      detectedIntent: 'update',
      suggestedAction: 'Conferma Ricezione Candidatura registrata',
      targetStatus: 'applied',
    };
  }

  return {
    detectedIntent: 'general',
    suggestedAction: 'Verifica messaggio recruiter',
  };
}

// Fetch live messages from Gmail API using Bearer token
export async function fetchRecruiterEmailsFromGmail(
  accessToken: string,
  trackedCompanies: { id: string; name: string }[] = []
): Promise<RecruiterEmailMessage[]> {
  const query = 'subject:(colloquio OR interview OR candidatura OR application OR offer OR screening OR "case study" OR recruiter)';
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query
  )}&maxResults=15`;

  const listResponse = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    throw new Error(`Gmail API error (${listResponse.status}): ${errorText}`);
  }

  const listData = await listResponse.json();
  const messagesList: { id: string; threadId: string }[] = listData.messages || [];

  if (messagesList.length === 0) {
    return [];
  }

  // Fetch details for each message
  const details = await Promise.all(
    messagesList.slice(0, 10).map(async (msg) => {
      try {
        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`;
        const res = await fetch(detailUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });
        if (!res.ok) return null;
        const data = await res.json();

        const headers = data.payload?.headers || [];
        const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
        const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');
        const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');

        const subject = subjectHeader?.value || 'Nessun oggetto';
        const sender = fromHeader?.value || 'Sconosciuto';
        const senderEmail = extractEmailAddress(sender);
        const snippet = data.snippet || '';
        const timestamp = Number(data.internalDate) || Date.now();
        const dateStr = dateHeader?.value
          ? new Date(dateHeader.value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
          : new Date(timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

        // Match company
        let matchedCompany: string | undefined = undefined;
        let matchedAppId: string | undefined = undefined;

        for (const comp of trackedCompanies) {
          const compClean = comp.name.toLowerCase().trim();
          if (
            compClean.length > 2 &&
            (subject.toLowerCase().includes(compClean) ||
              snippet.toLowerCase().includes(compClean) ||
              sender.toLowerCase().includes(compClean))
          ) {
            matchedCompany = comp.name;
            matchedAppId = comp.id;
            break;
          }
        }

        const classification = classifyRecruiterEmail(subject, snippet);

        return {
          id: data.id,
          threadId: data.threadId,
          sender,
          senderEmail,
          subject,
          snippet,
          date: dateStr,
          timestamp,
          matchedCompany,
          matchedAppId,
          detectedIntent: classification.detectedIntent,
          suggestedAction: classification.suggestedAction,
          targetStatus: classification.targetStatus,
        } as RecruiterEmailMessage;
      } catch (err) {
        console.warn('Errore parsing messaggio Gmail:', err);
        return null;
      }
    })
  );

  return details.filter((d): d is RecruiterEmailMessage => d !== null);
}

// Demonstrative recruiter emails for portfolio presentation & offline simulation
export const MOCK_RECRUITER_MESSAGES: RecruiterEmailMessage[] = [
  {
    id: 'sim-msg-1',
    threadId: 'th-1',
    sender: 'Talent Acquisition Team <recruiting@enel-innovation.com>',
    senderEmail: 'recruiting@enel-innovation.com',
    subject: 'Invito al 1° Round di Colloquio: Junior Innovation Manager - Enel Innovation Hubs',
    snippet:
      'Gentile candidato, il tuo percorso in Management Engineering e innovazione ci ha colpito molto. Vorremmo invitarti a un primo colloquio conoscitivo di 30 minuti su Google Meet.',
    date: 'Oggi 09:15',
    timestamp: Date.now() - 3600000 * 2,
    matchedCompany: 'Enel Innovation Hubs',
    detectedIntent: 'interview',
    suggestedAction: 'Sposta stato a "Colloquio" & Sincronizza calendario',
    targetStatus: 'interview',
  },
  {
    id: 'sim-msg-2',
    threadId: 'th-2',
    sender: 'Sophie Weber <sophie.weber@n26-careers.com>',
    senderEmail: 'sophie.weber@n26-careers.com',
    subject: 'N26 Application Update: Growth Manager Associate',
    snippet:
      'Hello Alex, we have reviewed your business case. The leadership team was very impressed by your quantitative modeling. We would like to schedule the final presentation round.',
    date: 'Ieri 16:40',
    timestamp: Date.now() - 3600000 * 22,
    matchedCompany: 'N26',
    detectedIntent: 'interview',
    suggestedAction: 'Conferma disponibilità per final presentation round',
    targetStatus: 'interview',
  },
  {
    id: 'sim-msg-3',
    threadId: 'th-3',
    sender: 'People & Culture <careers@feverup.com>',
    senderEmail: 'careers@feverup.com',
    subject: 'Fever Graduate Program: Confirmation of Application & Case Study',
    snippet:
      'Thank you for submitting your application for the Growth Graduate Program in Madrid. Please find attached the logic and strategy case study to complete within 5 days.',
    date: '26 ott',
    timestamp: Date.now() - 3600000 * 72,
    matchedCompany: 'Fever',
    detectedIntent: 'assessment',
    suggestedAction: 'Registra scadenza consegna Case Study (entro 5 gg)',
    targetStatus: 'interview',
  },
];

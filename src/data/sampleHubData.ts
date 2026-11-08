// DATI DI ESEMPIO FITTIZI — nessuna persona o azienda reale.
// Servono solo per la modalità demo. I tuoi contatti veri vanno nel tuo database (Firestore) o nel tuo Google Sheet.

import type { HubCodaItem } from "./mockupData";

export interface ProcessedCompanyItem {
  name: string;
  sector: string;
  category: "Azienda" | "Startup" | "Venture";
  cycle: string;
  date: string;
}

export const PROCESSED_COMPANIES_REGISTRY: ProcessedCompanyItem[] = [
  {
    "name": "Helio Robotics",
    "sector": "Robotics / ConTech",
    "category": "Startup",
    "cycle": "#1 - #3",
    "date": "Ottobre 2026"
  },
  {
    "name": "Cantiere Digitale",
    "sector": "PropTech / SaaS",
    "category": "Startup",
    "cycle": "#1 - #3",
    "date": "Ottobre 2026"
  },
  {
    "name": "Orbita Ventures",
    "sector": "Venture Capital",
    "category": "Venture",
    "cycle": "#1 - #3",
    "date": "Ottobre 2026"
  },
  {
    "name": "Lumen Analytics",
    "sector": "Data / AI",
    "category": "Azienda",
    "cycle": "#1 - #3",
    "date": "Ottobre 2026"
  },
  {
    "name": "Mosaico Studio",
    "sector": "Venture Builder",
    "category": "Venture",
    "cycle": "#1 - #3",
    "date": "Ottobre 2026"
  },
  {
    "name": "TerraGrid",
    "sector": "Energy / ClimateTech",
    "category": "Startup",
    "cycle": "#1 - #3",
    "date": "Ottobre 2026"
  },
  {
    "name": "Pallas Capital",
    "sector": "Venture Capital",
    "category": "Venture",
    "cycle": "#1 - #3",
    "date": "Ottobre 2026"
  },
  {
    "name": "Quanta Labs",
    "sector": "Tech / SaaS B2B",
    "category": "Azienda",
    "cycle": "#1 - #3",
    "date": "Ottobre 2026"
  }
];

export const SAMPLE_HUB_CODA: HubCodaItem[] = [
  {
    "id": "HR-001",
    "name": "Elena Marchetti",
    "role": "CEO & Co-founder",
    "company": "Helio Robotics",
    "country": "Italia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Elena%20Marchetti%20Helio%20Robotics",
    "motivo": "Profilo di esempio: ceo & co-founder in Helio Robotics, coerente con i ruoli target.",
    "notaConnessione": "Hi Elena, I follow Helio Robotics's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "da_verificare",
    "descrizioneAzienda": "Startup fittizia che sviluppa robot per il monitoraggio dei cantieri.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Helio%20Robotics",
    "categoria": "Startup",
    "settore": "Robotics / ConTech",
    "ciclo": "#1",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "CD-001",
    "name": "Daniel Roth",
    "role": "Head of Growth",
    "company": "Cantiere Digitale",
    "country": "Italia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Daniel%20Roth%20Cantiere%20Digitale",
    "motivo": "Profilo di esempio: head of growth in Cantiere Digitale, coerente con i ruoli target.",
    "notaConnessione": "Hi Daniel, I follow Cantiere Digitale's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Piattaforma SaaS fittizia per la gestione digitale dei cantieri.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Cantiere%20Digitale",
    "categoria": "Startup",
    "settore": "PropTech / SaaS",
    "ciclo": "#2",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "OV-001",
    "name": "Sofia Lindqvist",
    "role": "Partner",
    "company": "Orbita Ventures",
    "country": "Europa",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Sofia%20Lindqvist%20Orbita%20Ventures",
    "motivo": "Profilo di esempio: partner in Orbita Ventures, coerente con i ruoli target.",
    "notaConnessione": "Hi Sofia, I follow Orbita Ventures's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Suggerita",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Venture studio fittizio focalizzato su deep tech europeo.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Orbita%20Ventures",
    "categoria": "Venture",
    "settore": "Venture Capital",
    "ciclo": "#3",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "LA-001",
    "name": "Marco Villanova",
    "role": "Chief Operating Officer",
    "company": "Lumen Analytics",
    "country": "Germania",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Marco%20Villanova%20Lumen%20Analytics",
    "motivo": "Profilo di esempio: chief operating officer in Lumen Analytics, coerente con i ruoli target.",
    "notaConnessione": "Hi Marco, I follow Lumen Analytics's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Richiesta inviata",
    "suggeritaIl": "9/30/26",
    "affidabilita": "da_verificare",
    "descrizioneAzienda": "Azienda fittizia di analytics per il real estate.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Lumen%20Analytics",
    "categoria": "Azienda",
    "settore": "Data / AI",
    "ciclo": "#1",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "MS-001",
    "name": "Anna Keller",
    "role": "Head of Talent",
    "company": "Mosaico Studio",
    "country": "Italia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Anna%20Keller%20Mosaico%20Studio",
    "motivo": "Profilo di esempio: head of talent in Mosaico Studio, coerente con i ruoli target.",
    "notaConnessione": "Hi Anna, I follow Mosaico Studio's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Venture builder fittizio che lancia startup B2B.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Mosaico%20Studio",
    "categoria": "Venture",
    "settore": "Venture Builder",
    "ciclo": "#2",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "TG-001",
    "name": "Luca Ferraris",
    "role": "Founder",
    "company": "TerraGrid",
    "country": "Spagna",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Luca%20Ferraris%20TerraGrid",
    "motivo": "Profilo di esempio: founder in TerraGrid, coerente con i ruoli target.",
    "notaConnessione": "Hi Luca, I follow TerraGrid's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Suggerita",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Scale-up fittizia nella gestione intelligente delle reti energetiche.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=TerraGrid",
    "categoria": "Startup",
    "settore": "Energy / ClimateTech",
    "ciclo": "#3",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "PC-001",
    "name": "Clara Moreau",
    "role": "Principal",
    "company": "Pallas Capital",
    "country": "Regno Unito",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Clara%20Moreau%20Pallas%20Capital",
    "motivo": "Profilo di esempio: principal in Pallas Capital, coerente con i ruoli target.",
    "notaConnessione": "Hi Clara, I follow Pallas Capital's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "da_verificare",
    "descrizioneAzienda": "Fondo fittizio early-stage su software B2B.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Pallas%20Capital",
    "categoria": "Venture",
    "settore": "Venture Capital",
    "ciclo": "#1",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "QL-001",
    "name": "Tomás Ibáñez",
    "role": "VP Business Development",
    "company": "Quanta Labs",
    "country": "Francia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Tomás%20Ibáñez%20Quanta%20Labs",
    "motivo": "Profilo di esempio: vp business development in Quanta Labs, coerente con i ruoli target.",
    "notaConnessione": "Hi Tomás, I follow Quanta Labs's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Azienda fittizia di software per operations e supply chain.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Quanta%20Labs",
    "categoria": "Azienda",
    "settore": "Tech / SaaS B2B",
    "ciclo": "#2",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "HR-002",
    "name": "Greta Hoffmann",
    "role": "Investment Associate",
    "company": "Helio Robotics",
    "country": "Italia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Greta%20Hoffmann%20Helio%20Robotics",
    "motivo": "Profilo di esempio: investment associate in Helio Robotics, coerente con i ruoli target.",
    "notaConnessione": "Hi Greta, I follow Helio Robotics's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Suggerita",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Startup fittizia che sviluppa robot per il monitoraggio dei cantieri.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Helio%20Robotics",
    "categoria": "Startup",
    "settore": "Robotics / ConTech",
    "ciclo": "#3",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "CD-002",
    "name": "Paolo Conti",
    "role": "Head of Strategy",
    "company": "Cantiere Digitale",
    "country": "Italia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Paolo%20Conti%20Cantiere%20Digitale",
    "motivo": "Profilo di esempio: head of strategy in Cantiere Digitale, coerente con i ruoli target.",
    "notaConnessione": "Hi Paolo, I follow Cantiere Digitale's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Richiesta inviata",
    "suggeritaIl": "9/30/26",
    "affidabilita": "da_verificare",
    "descrizioneAzienda": "Piattaforma SaaS fittizia per la gestione digitale dei cantieri.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Cantiere%20Digitale",
    "categoria": "Startup",
    "settore": "PropTech / SaaS",
    "ciclo": "#1",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "OV-002",
    "name": "Nora Aalto",
    "role": "Head of Operations",
    "company": "Orbita Ventures",
    "country": "Europa",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Nora%20Aalto%20Orbita%20Ventures",
    "motivo": "Profilo di esempio: head of operations in Orbita Ventures, coerente con i ruoli target.",
    "notaConnessione": "Hi Nora, I follow Orbita Ventures's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Venture studio fittizio focalizzato su deep tech europeo.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Orbita%20Ventures",
    "categoria": "Venture",
    "settore": "Venture Capital",
    "ciclo": "#2",
    "note": "Dato di esempio fittizio"
  },
  {
    "id": "LA-002",
    "name": "Ivan Petrescu",
    "role": "Co-founder & CTO",
    "company": "Lumen Analytics",
    "country": "Germania",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Ivan%20Petrescu%20Lumen%20Analytics",
    "motivo": "Profilo di esempio: co-founder & cto in Lumen Analytics, coerente con i ruoli target.",
    "notaConnessione": "Hi Ivan, I follow Lumen Analytics's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Suggerita",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Azienda fittizia di analytics per il real estate.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Lumen%20Analytics",
    "categoria": "Azienda",
    "settore": "Data / AI",
    "ciclo": "#3",
    "note": "Dato di esempio fittizio"
  }
];

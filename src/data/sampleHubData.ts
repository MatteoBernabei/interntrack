// FICTIONAL SAMPLE DATA — no real people or companies.
// Used only by the demo mode. Real contacts live in your own database (Firestore) or Google Sheet.

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
    "date": "October 2026"
  },
  {
    "name": "Cantiere Digitale",
    "sector": "PropTech / SaaS",
    "category": "Startup",
    "cycle": "#1 - #3",
    "date": "October 2026"
  },
  {
    "name": "Orbita Ventures",
    "sector": "Venture Capital",
    "category": "Venture",
    "cycle": "#1 - #3",
    "date": "October 2026"
  },
  {
    "name": "Lumen Analytics",
    "sector": "Data / AI",
    "category": "Azienda",
    "cycle": "#1 - #3",
    "date": "October 2026"
  },
  {
    "name": "Mosaico Studio",
    "sector": "Venture Builder",
    "category": "Venture",
    "cycle": "#1 - #3",
    "date": "October 2026"
  },
  {
    "name": "TerraGrid",
    "sector": "Energy / ClimateTech",
    "category": "Startup",
    "cycle": "#1 - #3",
    "date": "October 2026"
  },
  {
    "name": "Pallas Capital",
    "sector": "Venture Capital",
    "category": "Venture",
    "cycle": "#1 - #3",
    "date": "October 2026"
  },
  {
    "name": "Quanta Labs",
    "sector": "Tech / SaaS B2B",
    "category": "Azienda",
    "cycle": "#1 - #3",
    "date": "October 2026"
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
    "motivo": "Sample profile: ceo & co-founder in Helio Robotics, consistent with the target roles.",
    "notaConnessione": "Hi Elena, I follow Helio Robotics's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "da_verificare",
    "descrizioneAzienda": "Fictional startup building robots for construction-site monitoring.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Helio%20Robotics",
    "categoria": "Startup",
    "settore": "Robotics / ConTech",
    "ciclo": "#1",
    "note": "Fictional sample data"
  },
  {
    "id": "CD-001",
    "name": "Daniel Roth",
    "role": "Head of Growth",
    "company": "Cantiere Digitale",
    "country": "Italia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Daniel%20Roth%20Cantiere%20Digitale",
    "motivo": "Sample profile: head of growth in Cantiere Digitale, consistent with the target roles.",
    "notaConnessione": "Hi Daniel, I follow Cantiere Digitale's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Fictional SaaS platform for digital construction-site management.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Cantiere%20Digitale",
    "categoria": "Startup",
    "settore": "PropTech / SaaS",
    "ciclo": "#2",
    "note": "Fictional sample data"
  },
  {
    "id": "OV-001",
    "name": "Sofia Lindqvist",
    "role": "Partner",
    "company": "Orbita Ventures",
    "country": "Europa",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Sofia%20Lindqvist%20Orbita%20Ventures",
    "motivo": "Sample profile: partner in Orbita Ventures, consistent with the target roles.",
    "notaConnessione": "Hi Sofia, I follow Orbita Ventures's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Suggerita",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Fictional venture studio focused on European deep tech.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Orbita%20Ventures",
    "categoria": "Venture",
    "settore": "Venture Capital",
    "ciclo": "#3",
    "note": "Fictional sample data"
  },
  {
    "id": "LA-001",
    "name": "Marco Villanova",
    "role": "Chief Operating Officer",
    "company": "Lumen Analytics",
    "country": "Germania",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Marco%20Villanova%20Lumen%20Analytics",
    "motivo": "Sample profile: chief operating officer in Lumen Analytics, consistent with the target roles.",
    "notaConnessione": "Hi Marco, I follow Lumen Analytics's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Richiesta inviata",
    "suggeritaIl": "9/30/26",
    "affidabilita": "da_verificare",
    "descrizioneAzienda": "Fictional analytics company for real estate.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Lumen%20Analytics",
    "categoria": "Azienda",
    "settore": "Data / AI",
    "ciclo": "#1",
    "note": "Fictional sample data"
  },
  {
    "id": "MS-001",
    "name": "Anna Keller",
    "role": "Head of Talent",
    "company": "Mosaico Studio",
    "country": "Italia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Anna%20Keller%20Mosaico%20Studio",
    "motivo": "Sample profile: head of talent in Mosaico Studio, consistent with the target roles.",
    "notaConnessione": "Hi Anna, I follow Mosaico Studio's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Fictional venture builder launching B2B startups.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Mosaico%20Studio",
    "categoria": "Venture",
    "settore": "Venture Builder",
    "ciclo": "#2",
    "note": "Fictional sample data"
  },
  {
    "id": "TG-001",
    "name": "Luca Ferraris",
    "role": "Founder",
    "company": "TerraGrid",
    "country": "Spagna",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Luca%20Ferraris%20TerraGrid",
    "motivo": "Sample profile: founder in TerraGrid, consistent with the target roles.",
    "notaConnessione": "Hi Luca, I follow TerraGrid's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Suggerita",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Fictional scale-up in smart energy-grid management.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=TerraGrid",
    "categoria": "Startup",
    "settore": "Energy / ClimateTech",
    "ciclo": "#3",
    "note": "Fictional sample data"
  },
  {
    "id": "PC-001",
    "name": "Clara Moreau",
    "role": "Principal",
    "company": "Pallas Capital",
    "country": "Regno Unito",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Clara%20Moreau%20Pallas%20Capital",
    "motivo": "Sample profile: principal in Pallas Capital, consistent with the target roles.",
    "notaConnessione": "Hi Clara, I follow Pallas Capital's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "da_verificare",
    "descrizioneAzienda": "Fictional early-stage fund investing in B2B software.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Pallas%20Capital",
    "categoria": "Venture",
    "settore": "Venture Capital",
    "ciclo": "#1",
    "note": "Fictional sample data"
  },
  {
    "id": "QL-001",
    "name": "Tomás Ibáñez",
    "role": "VP Business Development",
    "company": "Quanta Labs",
    "country": "Francia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Tomás%20Ibáñez%20Quanta%20Labs",
    "motivo": "Sample profile: vp business development in Quanta Labs, consistent with the target roles.",
    "notaConnessione": "Hi Tomás, I follow Quanta Labs's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Fictional software company for operations and supply chain.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Quanta%20Labs",
    "categoria": "Azienda",
    "settore": "Tech / SaaS B2B",
    "ciclo": "#2",
    "note": "Fictional sample data"
  },
  {
    "id": "HR-002",
    "name": "Greta Hoffmann",
    "role": "Investment Associate",
    "company": "Helio Robotics",
    "country": "Italia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Greta%20Hoffmann%20Helio%20Robotics",
    "motivo": "Sample profile: investment associate in Helio Robotics, consistent with the target roles.",
    "notaConnessione": "Hi Greta, I follow Helio Robotics's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Suggerita",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Fictional startup building robots for construction-site monitoring.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Helio%20Robotics",
    "categoria": "Startup",
    "settore": "Robotics / ConTech",
    "ciclo": "#3",
    "note": "Fictional sample data"
  },
  {
    "id": "CD-002",
    "name": "Paolo Conti",
    "role": "Head of Strategy",
    "company": "Cantiere Digitale",
    "country": "Italia",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Paolo%20Conti%20Cantiere%20Digitale",
    "motivo": "Sample profile: head of strategy in Cantiere Digitale, consistent with the target roles.",
    "notaConnessione": "Hi Paolo, I follow Cantiere Digitale's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Richiesta inviata",
    "suggeritaIl": "9/30/26",
    "affidabilita": "da_verificare",
    "descrizioneAzienda": "Fictional SaaS platform for digital construction-site management.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Cantiere%20Digitale",
    "categoria": "Startup",
    "settore": "PropTech / SaaS",
    "ciclo": "#1",
    "note": "Fictional sample data"
  },
  {
    "id": "OV-002",
    "name": "Nora Aalto",
    "role": "Head of Operations",
    "company": "Orbita Ventures",
    "country": "Europa",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Nora%20Aalto%20Orbita%20Ventures",
    "motivo": "Sample profile: head of operations in Orbita Ventures, consistent with the target roles.",
    "notaConnessione": "Hi Nora, I follow Orbita Ventures's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "In coda",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Fictional venture studio focused on European deep tech.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Orbita%20Ventures",
    "categoria": "Venture",
    "settore": "Venture Capital",
    "ciclo": "#2",
    "note": "Fictional sample data"
  },
  {
    "id": "LA-002",
    "name": "Ivan Petrescu",
    "role": "Co-founder & CTO",
    "company": "Lumen Analytics",
    "country": "Germania",
    "linkedinSearchUrl": "https://www.linkedin.com/search/results/people/?keywords=Ivan%20Petrescu%20Lumen%20Analytics",
    "motivo": "Sample profile: co-founder & cto in Lumen Analytics, consistent with the target roles.",
    "notaConnessione": "Hi Ivan, I follow Lumen Analytics's growth and would be glad to exchange a few thoughts on how you approach it. Alex",
    "statoInvio": "Suggerita",
    "suggeritaIl": "9/30/26",
    "affidabilita": "certo",
    "descrizioneAzienda": "Fictional analytics company for real estate.",
    "linkedinAzienda": "https://www.linkedin.com/search/results/companies/?keywords=Lumen%20Analytics",
    "categoria": "Azienda",
    "settore": "Data / AI",
    "ciclo": "#3",
    "note": "Fictional sample data"
  }
];

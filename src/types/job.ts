export type JobStage = 
  | 'wishlist' 
  | 'applied' 
  | 'screening' 
  | 'technical' 
  | 'final' 
  | 'offer' 
  | 'rejected';

export type WorkType = 'remote' | 'hybrid' | 'onsite';
export type PriorityLevel = 'high' | 'medium' | 'low';
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF';

export interface InterviewRound {
  id: string;
  name: string;
  completed: boolean;
  date?: string;
  interviewer?: string;
  notes?: string;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  location: string;
  workType: WorkType;
  stage: JobStage;
  appliedDate: string; // YYYY-MM-DD
  salaryMin?: number;
  salaryMax?: number;
  currency: CurrencyCode;
  priority: PriorityLevel;
  jobUrl?: string;
  contactName?: string;
  contactRole?: string;
  contactEmail?: string;
  notes: string;
  interviewRounds: InterviewRound[];
  nextAction?: string;
  nextActionDate?: string;
  tags: string[];
  updatedAt: string;
}

export interface NetworkingContact {
  id: string;
  name: string;
  company: string;
  role: string;
  email?: string;
  linkedin?: string;
  status: 'to_reach_out' | 'contacted' | 'chat_scheduled' | 'referral_secured' | 'connected';
  notes: string;
  lastContactDate: string;
}

export interface CompPackage {
  id: string;
  company: string;
  role: string;
  baseSalary: number;
  annualBonus: number;
  equityPerYear: number;
  currency: CurrencyCode;
  benefitsScore: number; // 1 to 5
  remoteScore: number; // 1 to 5
  notes: string;
}

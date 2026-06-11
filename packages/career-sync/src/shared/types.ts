export type SyncSource = "gmail" | "calendar";

export type SyncConfidence = "low" | "medium" | "high";

export type ProcessStage =
  | "sourced"
  | "applied"
  | "screening"
  | "interview"
  | "technical"
  | "offer"
  | "rejected"
  | "unknown";

export type CareerSyncSignal = {
  id: string;
  source: SyncSource;
  providerId?: string;
  companyHint?: string;
  roleHint?: string;
  processStage?: ProcessStage;
  actionRequired?: boolean;
  receivedAt?: string;
  eventAt?: string;
  confidence: SyncConfidence;
  safeSummary: string;
  rawRetained: false;
};

export type RawGmailMessageLike = {
  id: string;
  from?: string;
  subject?: string;
  snippet?: string;
  receivedAt?: string;
};

export type RawCalendarEventLike = {
  id: string;
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
};

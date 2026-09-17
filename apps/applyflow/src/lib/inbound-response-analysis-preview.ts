import {
  previewInboundResponseAnalysis,
  type InboundEmail,
  type InboundResponseAnalysisPreview,
  type MatchableInboundApplication,
  type ResponseDetection,
} from "@devflow/applyflow-core";

export const ORIGINAL_GMAIL_SCAN_BATCH_AVAILABLE = false as const;
export const ORIGINAL_GMAIL_SCAN_BATCH_LIMITATION =
  "The first real Gmail scan batch is not retained as inbound emails; only pending detections remain. Faithful rematch of those messages is not possible without a new authorized metadata read.";

const RECEIVED_AT = "2026-09-15T18:00:00.000Z";

export const SYNTHETIC_INBOUND_PREVIEW_APPLICATIONS: MatchableInboundApplication[] = [
  {
    id: "app-bluelight",
    companyName: "Bluelight Consulting",
    jobTitle: "Senior Product Engineer",
    jobUrl: "https://jobs.bluelightconsulting.com/senior-product-engineer",
    status: "applied",
  },
  {
    id: "app-tempo",
    companyName: "Tempo",
    jobTitle: "Full-Stack Engineer",
    jobUrl: "https://jobs.ashbyhq.com/tempo/role-a",
    status: "applied",
  },
  {
    id: "app-witi",
    companyName: "WiTi Labs",
    jobTitle: "Full-Stack Developer",
    jobUrl: "https://jobs.ashbyhq.com/witi/role-b",
    status: "applied",
  },
];

export const SYNTHETIC_INBOUND_PREVIEW_EMAILS: InboundEmail[] = [
  {
    id: "syn-company-interview",
    senderDomain: "bluelightconsulting.com",
    receivedAt: RECEIVED_AT,
    subject: "Interview invitation",
  },
  {
    id: "syn-ashby-shared-host",
    senderDomain: "jobs.ashbyhq.com",
    receivedAt: RECEIVED_AT,
    subject: "Your application update",
  },
  {
    id: "syn-ashby-tempo-ack",
    senderDomain: "jobs.ashbyhq.com",
    receivedAt: RECEIVED_AT,
    subject: "Thank you for applying to Tempo",
  },
  {
    id: "syn-job-alert",
    senderDomain: "linkedin.com",
    receivedAt: RECEIVED_AT,
    subject: "Jobs you may like this week",
  },
];

export function runSyntheticInboundResponseAnalysisPreview(input?: {
  existing?: readonly ResponseDetection[];
}): InboundResponseAnalysisPreview {
  return previewInboundResponseAnalysis({
    source: "synthetic",
    emails: SYNTHETIC_INBOUND_PREVIEW_EMAILS,
    applications: SYNTHETIC_INBOUND_PREVIEW_APPLICATIONS,
    existing: input?.existing,
  });
}

export type InboxEvaluateStatus = "added" | "error" | "duplicate_url" | "duplicate_content";

export type InboxDraft = {
  description: string;
  title: string;
  company: string;
  url: string;
};

export const EMPTY_INBOX_DRAFT: InboxDraft = {
  description: "",
  title: "",
  company: "",
  url: "",
};

export function nextInboxDraftAfterEvaluate(status: InboxEvaluateStatus, draft: InboxDraft): InboxDraft {
  if (status === "added") return { ...EMPTY_INBOX_DRAFT };
  return draft;
}

export function jobAnalysisPath(jobId: string): string {
  return `/dashboard/jobs/${encodeURIComponent(jobId)}`;
}

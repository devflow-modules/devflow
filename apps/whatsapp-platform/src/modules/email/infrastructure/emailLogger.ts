import { logEvent } from "@/lib/observability/log-event";
import { sanitizeTransactionalEmailLog } from "../utils/sanitizeEmailLogData";

export function logTransactionalEmailOutcome(input: {
  type: string;
  tenantId?: string | null;
  userId?: string | null;
  toEmail: string;
  status: "SENT" | "FAILED" | "SKIPPED_CONFIG" | "VALIDATION_FAILED";
  durationMs: number;
  provider: "resend";
  providerMessageId?: string;
  errorCode?: string;
  metadataHint?: Record<string, unknown>;
}): void {
  const level =
    input.status === "FAILED" || input.status === "VALIDATION_FAILED" ? "warn" : "info";
  const payload = sanitizeTransactionalEmailLog({
    type: input.type,
    tenantId: input.tenantId,
    userId: input.userId,
    toEmail: input.toEmail,
    status: input.status,
    durationMs: input.durationMs,
    provider: input.provider,
    providerMessageId: input.providerMessageId,
    errorCode: input.errorCode,
    metadataHint: input.metadataHint,
  });
  logEvent(level, "email", "transactional_email", payload);
}

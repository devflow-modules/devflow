export function lifecycleEventType(status: string): string {
  switch (status) {
    case "applied":
      return "applied";
    case "interview":
      return "screening";
    case "technical_test":
      return "technical";
    case "rejected":
      return "rejection";
    case "accepted":
      return "offer";
    case "hired":
      return "hired";
    default:
      return "status_changed";
  }
}

export function buildLifecycleEventRecord(input: {
  accountId: string;
  applicationId: string;
  jobId: string | null;
  fromStatus: string;
  toStatus: string;
  expectedVersion: number;
  occurredAt: Date;
}) {
  const occurredAt = input.occurredAt.toISOString();
  const type = lifecycleEventType(input.toStatus);
  const id = `evt_${input.applicationId}_${input.expectedVersion}_${input.toStatus}`;
  return {
    accountId: input.accountId,
    id,
    applicationId: input.applicationId,
    jobId: input.jobId,
    eventType: type,
    occurredAt: input.occurredAt,
    dedupeKey: `lifecycle:${input.applicationId}:${input.expectedVersion}:${input.toStatus}`,
    payload: {
      id,
      applicationId: input.applicationId,
      type,
      occurredAt,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      source: "user",
    },
  };
}

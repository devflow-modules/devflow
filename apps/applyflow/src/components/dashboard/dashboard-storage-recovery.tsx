import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  JOBS_STORAGE_DISCARD_LABEL,
  JOBS_STORAGE_INVALID_ENVELOPE_DESCRIPTION,
  JOBS_STORAGE_MALFORMED_DESCRIPTION,
  JOBS_STORAGE_PARTIAL_TITLE,
  JOBS_STORAGE_UNKNOWN_VERSION_DESCRIPTION,
  JOBS_STORAGE_UNREADABLE_TITLE,
  jobsStoragePartialDescription,
  RESUME_STORAGE_DISCARD_LABEL,
  RESUME_STORAGE_UNREADABLE_DESCRIPTION,
  RESUME_STORAGE_UNREADABLE_TITLE,
} from "@/components/dashboard/dashboard-storage-recovery-content";
import { RESUME_LIBRARY_IMPORT_LABEL } from "@/components/dashboard/resume-library-content";
import type { DashboardJobsUnreadableReason } from "@/lib/local-job-storage";
import { cn } from "@/lib/cn";

const importLabelClass = cn(
  "inline-flex cursor-pointer items-center justify-center rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm text-[color:var(--af-text)]",
);

function jobsUnreadableDescription(reason: DashboardJobsUnreadableReason): string {
  if (reason === "malformed-json") return JOBS_STORAGE_MALFORMED_DESCRIPTION;
  if (reason === "unknown-version") return JOBS_STORAGE_UNKNOWN_VERSION_DESCRIPTION;
  return JOBS_STORAGE_INVALID_ENVELOPE_DESCRIPTION;
}

export function JobsStorageRecoveryBanner({
  status,
  ignoredCount,
  reason,
  onDiscard,
}: {
  status: "partial" | "unreadable";
  ignoredCount: number;
  reason?: DashboardJobsUnreadableReason;
  onDiscard: () => void;
}) {
  const title = status === "partial" ? JOBS_STORAGE_PARTIAL_TITLE : JOBS_STORAGE_UNREADABLE_TITLE;
  const description =
    status === "partial"
      ? jobsStoragePartialDescription(ignoredCount)
      : jobsUnreadableDescription(reason ?? "invalid-envelope");

  return (
    <ApplyFlowCard variant="warning" padding="md" role="alert">
      <p className="text-sm font-medium text-amber-100">{title}</p>
      <p className="mt-1 text-sm text-amber-100/90">{description}</p>
      <div className="mt-3">
        <ApplyFlowButton type="button" variant="dangerGhost" size="sm" onClick={onDiscard}>
          {JOBS_STORAGE_DISCARD_LABEL}
        </ApplyFlowButton>
      </div>
    </ApplyFlowCard>
  );
}

export function ResumeLibraryRecoveryBanner({
  onDiscard,
  onImportProfileFile,
}: {
  onDiscard: () => void;
  onImportProfileFile: (file: File | null) => void;
}) {
  return (
    <ApplyFlowCard variant="warning" padding="md" role="alert">
      <p className="text-sm font-medium text-amber-100">{RESUME_STORAGE_UNREADABLE_TITLE}</p>
      <p className="mt-1 text-sm text-amber-100/90">{RESUME_STORAGE_UNREADABLE_DESCRIPTION}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className={importLabelClass}>
          {RESUME_LIBRARY_IMPORT_LABEL}
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              onImportProfileFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
        </label>
        <ApplyFlowButton type="button" variant="dangerGhost" size="sm" onClick={onDiscard}>
          {RESUME_STORAGE_DISCARD_LABEL}
        </ApplyFlowButton>
      </div>
    </ApplyFlowCard>
  );
}

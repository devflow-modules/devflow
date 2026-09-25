export type ApplyFlowMigrationServiceErrorCode =
  | "invalid_migration_payload"
  | "migration_fingerprint_mismatch"
  | "migration_conflict"
  | "migration_session_not_found"
  | "migration_session_failed"
  | "payload_too_large";

export class ApplyFlowMigrationServiceError extends Error {
  readonly code: ApplyFlowMigrationServiceErrorCode;
  readonly conflicts?: MigrationConflict[];

  constructor(code: ApplyFlowMigrationServiceErrorCode, conflicts?: MigrationConflict[]) {
    super(code);
    this.name = "ApplyFlowMigrationServiceError";
    this.code = code;
    this.conflicts = conflicts;
  }
}

export type MigrationConflictReason =
  | "same_id_different_content"
  | "source_job_already_linked"
  | "source_job_not_found"
  | "invalid_record"
  | "fingerprint_mismatch"
  | "duplicate_id_in_bundle";

export type MigrationConflict = {
  entityType: "job" | "application" | "bundle";
  entityId: string;
  reason: MigrationConflictReason;
};

export type ApplyFlowApplicationServiceCode =
  | "not_found"
  | "source_job_not_found"
  | "application_already_exists"
  | "application_already_exists_for_job"
  | "version_conflict"
  | "invalid_payload"
  | "invalid_if_match"
  | "invalid_status_transition"
  | "empty_patch";

export class ApplyFlowApplicationServiceError extends Error {
  readonly code: ApplyFlowApplicationServiceCode;

  constructor(code: ApplyFlowApplicationServiceCode) {
    super(code);
    this.name = "ApplyFlowApplicationServiceError";
    this.code = code;
  }
}

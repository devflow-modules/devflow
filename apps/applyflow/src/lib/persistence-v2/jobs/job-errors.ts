export type ApplyFlowJobServiceCode =
  | "not_found"
  | "job_already_exists"
  | "version_conflict"
  | "invalid_payload"
  | "invalid_if_match"
  | "empty_patch";

export class ApplyFlowJobServiceError extends Error {
  readonly code: ApplyFlowJobServiceCode;

  constructor(code: ApplyFlowJobServiceCode) {
    super(code);
    this.name = "ApplyFlowJobServiceError";
    this.code = code;
  }
}

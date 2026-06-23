export const CLI_EXIT = {
  SUCCESS: 0,
  VALIDATION_ERROR: 1,
  UNSAFE_INPUT: 2,
  UNSAFE_OUTPUT_PATH: 3,
  INSUFFICIENT_EVIDENCE: 4,
  INTERNAL_ERROR: 5,
} as const;

export type CliExitCode = (typeof CLI_EXIT)[keyof typeof CLI_EXIT];

export const HUMAN_APPROVAL_BANNER = "REQUIRES HUMAN APPROVAL — NOT PUBLISHED";
export const HUMAN_REVIEW_BANNER = "REQUIRES HUMAN REVIEW";

export const DEFAULT_OUTPUT_BASE = "/tmp/career-pilot";

export const BLOCKED_REPO_SEGMENTS = ["packages", "apps", "docs", ".git"] as const;

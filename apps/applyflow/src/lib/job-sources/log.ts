import type { JobSourceId } from "./types";

export type JobSearchLogEvent = {
  event: "job_search_completed" | "job_search_failed";
  provider: JobSourceId | "unknown";
  criteriaHash: string;
  page: number;
  resultCount?: number;
  cache: "hit" | "miss";
  durationMs: number;
  errorCode?: string;
  /** Whether an upstream provider HTTP call was made. */
  upstream?: "yes" | "no";
  /** Paid-provider quota outcome when applicable. */
  quota?: "allow" | "deny" | "skip_cache";
};

const ALLOWED_KEYS = [
  "event",
  "provider",
  "criteriaHash",
  "page",
  "resultCount",
  "cache",
  "durationMs",
  "errorCode",
  "upstream",
  "quota",
] as const;

export type JobSearchLogger = (event: JobSearchLogEvent) => void;

export function createJobSearchLogger(sink: (line: string) => void = (line) => {
  console.log(line);
}): JobSearchLogger {
  return (event) => {
    const line: Record<string, string | number> = {};
    for (const key of ALLOWED_KEYS) {
      const value = event[key];
      if (typeof value === "string" && value.length > 0) line[key] = value;
      if (typeof value === "number" && Number.isFinite(value)) line[key] = value;
    }
    sink(JSON.stringify(line));
  };
}

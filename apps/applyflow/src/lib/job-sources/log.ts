export type JobSearchLogEvent = {
  event: "job_search_completed" | "job_search_failed";
  provider: "jobgether";
  criteriaHash: string;
  page: number;
  resultCount?: number;
  cache: "hit" | "miss";
  durationMs: number;
  errorCode?: string;
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

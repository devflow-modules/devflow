import { normalizeJobDescriptionEncoding } from "./job-description-quality.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";

/**
 * Upper bound for the stored posting text. Requirements often sit after 4k
 * characters; 8k covers typical ATS postings while keeping local storage bounded.
 * Text at this length is reported as `truncated_at_limit` by the quality contract.
 */
export const JOB_DESCRIPTION_SNAPSHOT_MAX_CHARS = 8000;

/**
 * Evaluation snapshot: repaired encoding, collapsed whitespace, original casing.
 * A hard cut keeps the length equal to the limit so truncation stays detectable.
 * Not a full posting archive.
 */
export function snapshotJobDescription(text: string, maxChars = JOB_DESCRIPTION_SNAPSHOT_MAX_CHARS): string {
  const collapsed = normalizeJobDescriptionEncoding(text)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (collapsed.length <= maxChars) return collapsed;
  return collapsed.slice(0, maxChars);
}

/** FNV-1a 32-bit hex — local dedupe/change detection, not a cryptographic hash. */
export function hashJobDescription(text: string): string {
  const normalized = normalizeJobTextForIntel(text);
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

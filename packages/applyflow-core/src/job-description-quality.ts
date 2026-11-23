/**
 * Description contract used by evaluation: how much of the posting the engine
 * actually saw. A partial description is never treated as evidence of fit.
 */

export type JobDescriptionQualityStatus = "complete" | "partial" | "unavailable";

export type JobDescriptionQualitySignal =
  | "empty"
  | "source_excerpt_marker"
  | "page_chrome"
  | "truncated_at_limit"
  | "insufficient_requirements";

export type JobDescriptionQuality = {
  status: JobDescriptionQualityStatus;
  signals: JobDescriptionQualitySignal[];
  length: number;
};

/** Below this many technical requirements the posting cannot support a positive decision. */
export const MIN_TECHNICAL_REQUIREMENTS_FOR_DECISION = 2;

const CP1252_BYTES: Record<string, number> = {
  "\u20ac": 0x80, "\u201a": 0x82, "\u0192": 0x83, "\u201e": 0x84, "\u2026": 0x85, "\u2020": 0x86,
  "\u2021": 0x87, "\u02c6": 0x88, "\u2030": 0x89, "\u0160": 0x8a, "\u2039": 0x8b, "\u0152": 0x8c,
  "\u017d": 0x8e, "\u2018": 0x91, "\u2019": 0x92, "\u201c": 0x93, "\u201d": 0x94, "\u2022": 0x95,
  "\u2013": 0x96, "\u2014": 0x97, "\u02dc": 0x98, "\u2122": 0x99, "\u0161": 0x9a, "\u203a": 0x9b,
  "\u0153": 0x9c, "\u017e": 0x9e, "\u0178": 0x9f,
};

const CONTINUATION_CLASS = `\\u0080-\\u00bf${Object.keys(CP1252_BYTES).join("")}`;
const MOJIBAKE_RUN = new RegExp(`[\\u00c2-\\u00f4][${CONTINUATION_CLASS}]{1,3}`, "g");

function byteOf(char: string): number | undefined {
  const code = char.charCodeAt(0);
  if (code <= 0xff) return code;
  return CP1252_BYTES[char];
}

function expectedLength(lead: number): number {
  if (lead >= 0xf0) return 4;
  if (lead >= 0xe0) return 3;
  return 2;
}

const strictUtf8 = new TextDecoder("utf-8", { fatal: true });

/**
 * Repairs UTF-8 text that was decoded as Latin-1/Windows-1252 ("weâ€™re" → "we’re").
 * Only byte runs that form valid UTF-8 are replaced; any other character is kept as is.
 */
export function normalizeJobDescriptionEncoding(text: string): string {
  if (!text) return text;
  return text.replace(MOJIBAKE_RUN, (run) => {
    const chars = [...run];
    const lead = byteOf(chars[0] ?? "");
    if (lead === undefined) return run;
    const size = expectedLength(lead);
    if (chars.length < size) return run;
    const bytes: number[] = [];
    for (const char of chars.slice(0, size)) {
      const byte = byteOf(char);
      if (byte === undefined) return run;
      bytes.push(byte);
    }
    try {
      return strictUtf8.decode(new Uint8Array(bytes)) + chars.slice(size).join("");
    } catch {
      return run;
    }
  });
}

const SOURCE_EXCERPT_MARKER = /\[(?:fonte original|source|original source|excerpt|trecho)\s*:|\((?:truncated|excerpt|trecho)\)|\[\s*(?:\.\.\.|…)\s*\]\s*$/i;
const PAGE_CHROME = /\bpage_title\b|\bback to jobs\b|\btags\.new\b/i;

export function assessJobDescriptionQuality(
  text: string | null | undefined,
  options: { technicalRequirementCount?: number; maxChars?: number } = {},
): JobDescriptionQuality {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return { status: "unavailable", signals: ["empty"], length: 0 };
  const signals: JobDescriptionQualitySignal[] = [];
  if (SOURCE_EXCERPT_MARKER.test(trimmed)) signals.push("source_excerpt_marker");
  if (PAGE_CHROME.test(trimmed)) signals.push("page_chrome");
  if (options.maxChars !== undefined && trimmed.length >= options.maxChars) signals.push("truncated_at_limit");
  if (
    options.technicalRequirementCount !== undefined &&
    options.technicalRequirementCount < MIN_TECHNICAL_REQUIREMENTS_FOR_DECISION
  ) {
    signals.push("insufficient_requirements");
  }
  return { status: signals.length > 0 ? "partial" : "complete", signals, length: trimmed.length };
}

/**
 * Any partial/unavailable signal means the engine cannot see a trustworthy full
 * requirements section — including a hard cut at the storage limit, where
 * knockouts may sit after the retained prefix.
 */
export function hidesRequirements(quality: JobDescriptionQuality): boolean {
  return quality.status !== "complete";
}

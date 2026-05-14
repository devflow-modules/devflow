/**
 * Canonical technology labels (display form). Matching uses normalized text (see {@link normalizeForAtsMatch}).
 * Longer phrases are matched first to reduce false positives (e.g. "Java" vs "JavaScript").
 */
export const ATS_CANONICAL_TECH_KEYWORDS: readonly string[] = [
  "Next.js",
  "Node.js",
  "TypeScript",
  "JavaScript",
  "PostgreSQL",
  "GraphQL",
  "REST API",
  "CI/CD",
  "Playwright",
  "Tailwind",
  "Accessibility",
  "Design System",
  "React",
  "Express",
  "Prisma",
  "Docker",
  "Supabase",
  "Python",
  "Automation",
  "RPA",
  "SaaS",
  "Performance",
  "Testing",
  "Jest",
  "AWS",
  "Java",
] as const;

export const ATS_SENIORITY_TERMS: readonly string[] = [
  "Junior",
  "Mid-level",
  "Mid level",
  "Senior",
  "Lead",
  "Ownership",
  "Architecture",
  "Mentoring",
  "Scalability",
  "Production",
  "Stakeholders",
] as const;

const STOPWORDS = new Set(
  [
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "your",
    "you",
    "our",
    "are",
    "will",
    "have",
    "has",
    "been",
    "being",
    "into",
    "about",
    "their",
    "they",
    "what",
    "when",
    "where",
    "which",
    "while",
    "work",
    "team",
    "role",
    "looking",
    "seeking",
    "experience",
    "years",
    "year",
    "strong",
    "good",
    "great",
    "excellent",
    "ability",
    "skills",
    "skill",
    "using",
    "used",
    "based",
    "including",
    "such",
    "other",
    "well",
    "able",
    "must",
    "should",
    "would",
    "could",
    "join",
    "company",
    "position",
    "job",
    "description",
    "requirements",
    "required",
    "preferred",
    "bonus",
    "nice",
  ].map((w) => w.toLowerCase()),
);

/** Lowercase, collapse whitespace, normalize punctuation for substring checks. */
export function normalizeForAtsMatch(input: string): string {
  return input
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\./g, " ")
    .replace(/[/,;:()[\]{}|'"`]+/g, " ")
    .replace(/[^a-z0-9+#\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalized needle for a canonical tech keyword (handles REST API, CI/CD, Node.js). */
export function techKeywordNormalizedPattern(display: string): string {
  return normalizeForAtsMatch(display.replace(/\./g, " "));
}

function haystackContainsNormalized(haystackNorm: string, patternNorm: string): boolean {
  if (!patternNorm) return false;
  if (patternNorm.includes(" ")) {
    return haystackNorm.includes(patternNorm);
  }
  const idx = haystackNorm.indexOf(patternNorm);
  if (idx < 0) return false;
  const before = idx === 0 ? " " : haystackNorm[idx - 1]!;
  const after =
    idx + patternNorm.length >= haystackNorm.length ? " " : haystackNorm[idx + patternNorm.length]!;
  const boundaryOk = /\s|^/.test(before) || before === "-" || before === "/";
  const boundaryEnd = /\s|$/.test(after) || after === "-" || after === "/" || after === ".";
  return boundaryOk && boundaryEnd;
}

/**
 * Returns canonical display strings for tech keywords present in `text`, deterministic order (by display string).
 */
export function extractCanonicalTechKeywordsFound(text: string): string[] {
  const norm = normalizeForAtsMatch(text);
  const sorted = [...ATS_CANONICAL_TECH_KEYWORDS].sort((a, b) => b.length - a.length || a.localeCompare(b));
  const found = new Set<string>();
  for (const display of sorted) {
    const pat = techKeywordNormalizedPattern(display);
    if (haystackContainsNormalized(norm, pat)) {
      found.add(display);
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

export function extractSeniorityTermsFound(text: string): string[] {
  const norm = normalizeForAtsMatch(text);
  const out: string[] = [];
  for (const term of ATS_SENIORITY_TERMS) {
    const t = normalizeForAtsMatch(term);
    if (norm.includes(t)) {
      out.push(term);
    }
  }
  return [...new Set(out)].sort((a, b) => a.localeCompare(b));
}

/**
 * Significant tokens from job text (for coverage), excluding stopwords and very short tokens.
 */
export function extractJobContentKeywords(jobText: string, max = 48): string[] {
  const norm = normalizeForAtsMatch(jobText);
  const parts = norm.split(" ").filter((p) => p.length >= 4 && !STOPWORDS.has(p));
  const freq = new Map<string, number>();
  for (const p of parts) {
    freq.set(p, (freq.get(p) ?? 0) + 1);
  }
  const unique = [...freq.keys()].sort((a, b) => {
    const df = (freq.get(b) ?? 0) - (freq.get(a) ?? 0);
    if (df !== 0) return df;
    return a.localeCompare(b);
  });
  return unique.slice(0, max);
}

export function keywordCoverageHits(jobKeywords: string[], resumeNorm: string): number {
  let hits = 0;
  for (const kw of jobKeywords) {
    if (resumeNorm.includes(kw)) hits += 1;
  }
  return hits;
}

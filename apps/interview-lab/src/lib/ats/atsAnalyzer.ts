import type { AtsAnalysisResult, AtsPracticeContext } from "./atsTypes";
import {
  extractCanonicalTechKeywordsFound,
  extractJobContentKeywords,
  extractSeniorityTermsFound,
  keywordCoverageHits,
  normalizeForAtsMatch,
} from "./atsKeywordExtraction";

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function seniorityTier(term: string): number {
  const t = term.toLowerCase();
  if (t.includes("junior")) return 1;
  if (t.includes("lead")) return 4;
  if (t.includes("senior")) return 3;
  if (t.includes("mid")) return 2;
  if (t.includes("architecture") || t.includes("ownership") || t.includes("mentoring") || t.includes("scalability"))
    return 3;
  if (t.includes("production") || t.includes("stakeholders")) return 2;
  return 2;
}

function extractResumeBulletLines(resume: string): string[] {
  const lines = resume.split(/\r?\n/).map((l) => l.trim());
  const bullets: string[] = [];
  const bulletRe = /^([-*•]|\d+[\).])\s*(.+)$/;
  for (const line of lines) {
    if (!line) continue;
    const m = line.match(bulletRe);
    if (m?.[2]) {
      bullets.push(m[2].trim());
    }
  }
  if (bullets.length === 0) {
    const sentence = resume.replace(/\s+/g, " ").trim();
    if (sentence.length >= 20) {
      const chunk = sentence.slice(0, 220);
      bullets.push(chunk);
    }
  }
  return bullets.slice(0, 8);
}

function buildRewrittenBullets(bullets: string[], missingTech: string[]): AtsRewrittenBullet[] {
  const verbs = ["Delivered", "Shipped", "Owned", "Led", "Improved", "Scaled", "Automated", "Hardened"];
  const out: AtsRewrittenBullet[] = [];
  let vi = 0;
  for (const original of bullets.slice(0, 6)) {
    const trimmed = original.trim();
    if (!trimmed) continue;
    const miss =
      missingTech.length > 0
        ? missingTech[vi % missingTech.length]!
        : "keywords and outcomes highlighted in the job description";
    const verb = verbs[vi % verbs.length]!;
    const improved = `${verb} ${trimmed.replace(/^[.]+/, "").replace(/\.*$/, "")} — tie outcomes to ${miss} with metrics.`;
    out.push({ original: trimmed, improved });
    vi += 1;
  }
  return out;
}

function buildLikelyQuestions(
  missing: string[],
  strengths: string[],
  weak: string[],
  jobNorm: string,
): string[] {
  const qs: string[] = [];
  for (const m of missing.slice(0, 5)) {
    qs.push(`How have you used ${m} in production, and what trade-offs did you accept?`);
  }
  for (const s of strengths.slice(0, 3)) {
    qs.push(`You highlight ${s.toLowerCase()} — walk through a concrete example and how you measured impact.`);
  }
  for (const w of weak.slice(0, 2)) {
    qs.push(`Given ${w.toLowerCase()}, how would you close that gap before the onsite?`);
  }
  if (jobNorm.includes("scalab")) {
    qs.push("How would you design a feature for scalability with clear back-pressure and observability?");
  }
  qs.push("What questions do you have about our stack and delivery cadence?");
  return [...new Set(qs)].sort((a, b) => a.localeCompare(b)).slice(0, 14);
}

function summarize(text: string, maxLen: number): string {
  const one = text.replace(/\s+/g, " ").trim();
  if (one.length <= maxLen) return one;
  return `${one.slice(0, maxLen - 1).trim()}…`;
}

/**
 * Deterministic ATS-style resume ↔ job match analysis (heuristics only, not a certified ATS).
 */
export function analyzeAtsMatch(resumeText: string, jobDescriptionText: string): AtsAnalysisResult {
  const resume = resumeText.trim();
  const job = jobDescriptionText.trim();
  const resumeNorm = normalizeForAtsMatch(resume);
  const jobNorm = normalizeForAtsMatch(job);

  const jdTech = extractCanonicalTechKeywordsFound(job);
  const cvTech = extractCanonicalTechKeywordsFound(resume);
  const matchedKeywords = jdTech.filter((k) => cvTech.includes(k)).sort((a, b) => a.localeCompare(b));
  const missingKeywords = jdTech.filter((k) => !cvTech.includes(k)).sort((a, b) => a.localeCompare(b));

  const technicalScore =
    jdTech.length === 0 ? 68 : clampScore((100 * matchedKeywords.length) / jdTech.length);

  const jdSen = extractSeniorityTermsFound(job);
  const cvSen = extractSeniorityTermsFound(resume);
  let seniorityScore: number;
  if (jdSen.length === 0) {
    seniorityScore = 74;
  } else {
    const jdMax = Math.max(...jdSen.map(seniorityTier));
    const cvMax = cvSen.length === 0 ? 1 : Math.max(...cvSen.map(seniorityTier));
    seniorityScore = clampScore(100 - 26 * Math.min(3, Math.abs(jdMax - cvMax)));
  }

  const jobContentKw = extractJobContentKeywords(job, 40);
  const hits = keywordCoverageHits(jobContentKw, resumeNorm);
  const keywordCoverageScore =
    jobContentKw.length === 0 ? 62 : clampScore((100 * hits) / jobContentKw.length);

  const weakSignals: string[] = [];
  if (resumeNorm.length < 220) {
    weakSignals.push("Resume text is relatively short — ATS-style parsers often reward richer keyword context.");
  }
  if (missingKeywords.length >= 4) {
    weakSignals.push("Several job-specific technical keywords are not echoed in the resume.");
  }
  if (keywordCoverageScore < 48) {
    weakSignals.push("General vocabulary overlap with the job description is low.");
  }
  if (jdSen.some((s) => s.toLowerCase().includes("senior")) && !cvSen.some((s) => s.toLowerCase().includes("senior"))) {
    weakSignals.push("Job emphasizes seniority signals that are not clearly reflected in the resume.");
  }
  weakSignals.sort((a, b) => a.localeCompare(b));

  const strengths: string[] = [];
  for (const k of matchedKeywords) {
    strengths.push(`Clear alignment on ${k} — mirrors the job description.`);
  }
  if (hits >= 10) {
    strengths.push("Solid overlap between job vocabulary and resume wording.");
  }
  if (cvSen.length > 0 && jdSen.length > 0) {
    const overlap = jdSen.filter((s) => cvSen.includes(s));
    for (const o of overlap.sort((a, b) => a.localeCompare(b))) {
      strengths.push(`Seniority framing includes “${o}” — consistent with the posting.`);
    }
  }
  strengths.sort((a, b) => a.localeCompare(b));

  const improvementSuggestions: string[] = [];
  for (const m of missingKeywords.slice(0, 6)) {
    improvementSuggestions.push(`Add a measurable bullet or project line that explicitly mentions ${m}.`);
  }
  if (missingKeywords.length === 0 && jdTech.length > 0) {
    improvementSuggestions.push("Tighten impact metrics next to each stack keyword to strengthen scanning.");
  }
  if (keywordCoverageScore < 65) {
    improvementSuggestions.push("Mirror 6–10 high-signal nouns and verbs from the job description in your summary and skills.");
  }
  improvementSuggestions.sort((a, b) => a.localeCompare(b));

  const baseReadiness =
    technicalScore * 0.42 + keywordCoverageScore * 0.38 + seniorityScore * 0.2;
  const penalty = Math.min(
    38,
    missingKeywords.length * 6 + weakSignals.length * 5 + Math.max(0, 12 - Math.floor(matchedKeywords.length)) * 2,
  );
  const interviewReadinessScore = clampScore(baseReadiness - penalty);

  const overallScore = clampScore(
    technicalScore * 0.28 + seniorityScore * 0.22 + keywordCoverageScore * 0.28 + interviewReadinessScore * 0.22,
  );

  const bullets = extractResumeBulletLines(resume);
  const rewrittenBullets = buildRewrittenBullets(bullets, missingKeywords.length ? missingKeywords : ["the role"]);
  const likelyInterviewQuestions = buildLikelyQuestions(
    missingKeywords,
    strengths,
    weakSignals,
    jobNorm,
  );

  const topGaps = [
    ...missingKeywords.map((k) => `Deepen ${k} with a shipped example, metrics, and failure modes.`),
    ...weakSignals.slice(0, 2),
  ].sort((a, b) => a.localeCompare(b));

  const strengthsToDefendBase = [
    ...new Set([
      ...matchedKeywords.map((k) => `Defend depth in ${k} with architecture and testing choices.`),
      ...strengths.slice(0, 4),
    ]),
  ]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 10);

  const gapsToPrepareBase = [
    ...new Set([...topGaps, ...improvementSuggestions.slice(0, 4)]),
  ]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 12);

  const strengthsToDefend =
    strengthsToDefendBase.length > 0
      ? strengthsToDefendBase
      : [
          "Anchor answers to verbs and metrics that already exist in your resume — avoid generic claims.",
        ];

  const gapsToPrepare =
    gapsToPrepareBase.length > 0
      ? gapsToPrepareBase
      : [
          "Mirror 6–10 high-signal nouns from the job description in your summary without fabricating experience.",
        ];

  const pitchSkills = matchedKeywords.slice(0, 3).join(", ") || "your strongest delivery themes";
  const suggestedPitch = `I match what you need on ${pitchSkills}: I ship iteratively, communicate trade-offs, and care about reliability — happy to dive into how that maps to this role.`;

  const practiceContext: AtsPracticeContext = {
    resumeSummary: summarize(resume, 420),
    jobSummary: summarize(job, 420),
    strengthsToDefend: [...new Set(strengthsToDefend)].sort((a, b) => a.localeCompare(b)).slice(0, 8),
    gapsToPrepare: [...new Set(gapsToPrepare)].sort((a, b) => a.localeCompare(b)).slice(0, 10),
    suggestedPitch,
  };

  return {
    overallScore,
    technicalScore,
    seniorityScore,
    keywordCoverageScore,
    interviewReadinessScore,
    matchedKeywords,
    missingKeywords,
    weakSignals,
    strengths,
    improvementSuggestions,
    rewrittenBullets,
    likelyInterviewQuestions,
    practiceContext,
  };
}

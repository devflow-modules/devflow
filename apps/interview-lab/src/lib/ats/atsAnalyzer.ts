import { analyzeAtsWithCareerAgents } from "@/lib/career-agents-adapter";
import type { AtsAnalysisResult } from "./atsTypes";

/**
 * Deterministic ATS-style resume ↔ job match analysis via {@link @devflow/career-agents}.
 * Heuristics only — not a certified ATS.
 */
export function analyzeAtsMatch(resumeText: string, jobDescriptionText: string): AtsAnalysisResult {
  return analyzeAtsWithCareerAgents(resumeText, jobDescriptionText);
}

import type { CandidateProfile } from "./profile-schema.js";
import { APPLYFLOW_SKILL_KEYS, resolveSkillCanonicalKey } from "./profile-schema.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";
import { decideJobMatchV1 } from "./job-match-thresholds.js";
import {
  JOB_MATCH_SCORING_VERSION,
  type ApplyFlowJobMatch,
  type NormalizedJobSkills,
} from "./job-match-types.js";

function skillIdentity(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "";
  const compact = trimmed.toLowerCase().replace(/[\s._-]+/g, "");
  const resolved = resolveSkillCanonicalKey(trimmed) ?? resolveSkillCanonicalKey(compact);
  if (resolved) return resolved.toLowerCase();
  return normalizeJobTextForIntel(trimmed).replace(/[^a-z0-9+]/g, "");
}

export function profileSkillLabels(profile: CandidateProfile): string[] {
  return APPLYFLOW_SKILL_KEYS.filter((key) => profile.skills[key] > 0);
}

function profileIdentities(profile: CandidateProfile | readonly string[]): Set<string> {
  const labels = Array.isArray(profile)
    ? profile
    : profileSkillLabels(profile as CandidateProfile);
  const set = new Set<string>();
  for (const label of labels) {
    const id = skillIdentity(label);
    if (id) set.add(id);
  }
  return set;
}

function uniqueJobSkills(skills: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of skills) {
    const label = raw.trim();
    const id = skillIdentity(label);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(label);
  }
  return out;
}

/**
 * Single deterministic job-match engine for dashboard, `calculateFitScore`, and `ats_analyst`.
 * Score is requirement coverage: matched job skills / job skills (0 when the job has none).
 */
export function evaluateJobMatch(
  profile: CandidateProfile | readonly string[],
  job: NormalizedJobSkills,
  options?: { now?: Date },
): ApplyFlowJobMatch {
  const evaluatedAt = (options?.now ?? new Date()).toISOString();
  const owned = profileIdentities(profile);
  const jobSkills = uniqueJobSkills(job.skills);

  if (jobSkills.length === 0) {
    return {
      score: 0,
      decision: "skip",
      matchedSkills: [],
      missingSkills: [],
      evaluatedAt,
      scoringVersion: JOB_MATCH_SCORING_VERSION,
    };
  }

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  for (const skill of jobSkills) {
    if (owned.has(skillIdentity(skill))) matchedSkills.push(skill);
    else missingSkills.push(skill);
  }

  const score = Math.max(0, Math.min(100, Math.round((matchedSkills.length / jobSkills.length) * 100)));

  return {
    score,
    decision: decideJobMatchV1(score),
    matchedSkills,
    missingSkills,
    evaluatedAt,
    scoringVersion: JOB_MATCH_SCORING_VERSION,
  };
}

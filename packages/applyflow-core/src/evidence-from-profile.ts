import { mergeEvidenceLibraries } from "./evidence-schema.js";
import type { Evidence } from "./evidence-types.js";
import {
  APPLYFLOW_SKILL_KEYS,
  declaredSkillYears,
  isSkillKnown,
  profileEnglishLevel,
  profileLocation,
  type CandidateProfile,
} from "./profile-schema.js";

function isoNow(now: Date): string {
  return now.toISOString();
}

function yearsConfidence(years: number): Evidence["confidence"] {
  if (years >= 4) return "strong";
  if (years >= 1) return "partial";
  return "partial";
}

/**
 * Projects a generic CandidateProfile into Evidence.
 * Does not invent architecture, production LLM, or seniority claims.
 */
export function evidenceFromProfile(profile: CandidateProfile, now: Date = new Date()): Evidence[] {
  const stamp = isoNow(now);
  const out: Evidence[] = [];

  for (const key of APPLYFLOW_SKILL_KEYS) {
    if (!isSkillKnown(profile.skills, key)) continue;
    const years = declaredSkillYears(profile.skills, key);
    const label = key === "Nextjs" ? "Next.js" : key === "Nodejs" ? "Node.js" : key === "CI_CD" ? "CI/CD" : key;
    if (typeof years === "number" && years <= 0) continue;
    out.push({
      id: `profile-skill-${key.toLowerCase()}`,
      subject: "skill",
      label,
      description:
        typeof years === "number"
          ? `${years} year${years === 1 ? "" : "s"} declared on the candidate profile. Qualifiers beyond the skill and duration are not implied.`
          : `${label} is listed on the candidate profile. Duration is not recorded.`,
      source: "candidate_input",
      sourceRef: `profile.skills.${key}`,
      technologies: [label],
      confidence: typeof years === "number" ? yearsConfidence(years) : "partial",
      usableForClaims: typeof years === "number" ? years >= 2 : false,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  const totalYears = profile.facts.totalYearsExperience;
  if (typeof totalYears === "number" && totalYears > 0) {
    out.push({
      id: "profile-experience-total-years",
      subject: "experience",
      label: "Total professional experience",
      description: `${totalYears} years of professional experience declared in candidate facts.`,
      source: "candidate_input",
      sourceRef: "profile.facts.totalYearsExperience",
      confidence: totalYears >= 4 ? "strong" : "partial",
      usableForClaims: true,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  const english = profileEnglishLevel(profile);
  if (english) {
    const comfort =
      profile.comfortableInEnglish === true ? "yes" : profile.comfortableInEnglish === false ? "no" : "unknown";
    out.push({
      id: "profile-language-english",
      subject: "language",
      label: `English (${english})`,
      description: `English level ${english}. Comfortable in English: ${comfort}.`,
      source: "candidate_input",
      sourceRef: "profile.englishLevel",
      confidence: profile.comfortableInEnglish === true ? "strong" : "partial",
      usableForClaims: profile.comfortableInEnglish === true,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  const location = profileLocation(profile);
  if (location) {
    out.push({
      id: "profile-location",
      subject: "experience",
      label: `Location: ${location.trim()}`,
      description: `Candidate location declared as ${location.trim()}.`,
      source: "candidate_input",
      sourceRef: "profile.location",
      confidence: "strong",
      usableForClaims: true,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  for (const role of profile.roles) {
    const trimmed = role.trim();
    if (!trimmed) continue;
    out.push({
      id: `profile-role-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
      subject: "experience",
      label: trimmed,
      description: `Role listed on the candidate profile: ${trimmed}.`,
      source: "resume",
      sourceRef: "profile.roles",
      confidence: "strong",
      usableForClaims: true,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  return out;
}

/** Profile-derived evidence plus optional extras (seed, answers). Engine rules stay generic. */
export function buildCandidateEvidence(
  profile: CandidateProfile,
  extras: readonly Evidence[] = [],
  now: Date = new Date(),
): Evidence[] {
  return mergeEvidenceLibraries(evidenceFromProfile(profile, now), profile.evidence ?? [], [...extras]);
}

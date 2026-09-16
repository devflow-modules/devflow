import type { Evidence } from "./evidence-types.js";
import {
  APPLYFLOW_SKILL_KEYS,
  CANDIDATE_SALARY_KEYS,
  declaredSkillYears,
  hasSkillKey,
  type ApplyflowSkillKey,
  type CandidateProfile,
  type CandidateSalary,
  type CandidateSkills,
  type EnglishLevel,
  validateSavableCandidateProfile,
} from "./profile-schema.js";

export type ProfileDraftSkill = {
  selected: boolean;
  years: string;
};

export type CandidateProfileDraft = {
  name: string;
  role: string;
  location: string;
  englishLevel: EnglishLevel | "";
  comfortableInEnglish: "" | "yes" | "no";
  skills: Record<ApplyflowSkillKey, ProfileDraftSkill>;
  salary: Record<(typeof CANDIDATE_SALARY_KEYS)[number], string>;
  evidence: Evidence[];
};

function emptySkills(): Record<ApplyflowSkillKey, ProfileDraftSkill> {
  return Object.fromEntries(APPLYFLOW_SKILL_KEYS.map((key) => [key, { selected: false, years: "" }])) as Record<
    ApplyflowSkillKey,
    ProfileDraftSkill
  >;
}

function emptySalary(): CandidateProfileDraft["salary"] {
  return {
    cltPleno: "",
    cltSenior: "",
    pjSenior: "",
    usdMonthly: "",
    usdHourly: "",
  };
}

export function emptyCandidateProfileDraft(): CandidateProfileDraft {
  return {
    name: "",
    role: "",
    location: "",
    englishLevel: "",
    comfortableInEnglish: "",
    skills: emptySkills(),
    salary: emptySalary(),
    evidence: [],
  };
}

export function draftFromCandidateProfile(profile: CandidateProfile): CandidateProfileDraft {
  const skills = emptySkills();
  for (const key of APPLYFLOW_SKILL_KEYS) {
    if (!hasSkillKey(profile.skills, key)) continue;
    const years = declaredSkillYears(profile.skills, key);
    skills[key] = {
      selected: true,
      years: years === undefined ? "" : String(years),
    };
  }
  const salary = emptySalary();
  for (const key of CANDIDATE_SALARY_KEYS) {
    salary[key] = profile.salary[key] ?? "";
  }
  return {
    name: profile.name,
    role: profile.roles[0] ?? "",
    location: profile.location ?? "",
    englishLevel: profile.englishLevel ?? "",
    comfortableInEnglish:
      profile.comfortableInEnglish === true ? "yes" : profile.comfortableInEnglish === false ? "no" : "",
    skills,
    salary,
    evidence: profile.evidence ? [...profile.evidence] : [],
  };
}

function skillsFromDraft(draft: CandidateProfileDraft): CandidateSkills {
  const skills: CandidateSkills = {};
  for (const key of APPLYFLOW_SKILL_KEYS) {
    const entry = draft.skills[key];
    if (!entry?.selected) continue;
    const raw = entry.years.trim();
    if (!raw) {
      skills[key] = null;
      continue;
    }
    const years = Number.parseInt(raw, 10);
    if (!Number.isFinite(years)) {
      skills[key] = null;
      continue;
    }
    skills[key] = years;
  }
  return skills;
}

function salaryFromDraft(draft: CandidateProfileDraft): CandidateSalary {
  const salary: CandidateSalary = {};
  for (const key of CANDIDATE_SALARY_KEYS) {
    const value = draft.salary[key].trim();
    if (value) salary[key] = value;
  }
  return salary;
}

/** Converte o rascunho da UI num perfil validado. Não preenche seeds. Preserva facts/answerBank existentes. */
export function candidateProfileFromDraft(
  draft: CandidateProfileDraft,
  existing?: CandidateProfile,
): CandidateProfile {
  const roles = draft.role
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return validateSavableCandidateProfile({
    name: draft.name,
    location: draft.location,
    englishLevel: draft.englishLevel || undefined,
    comfortableInEnglish:
      draft.comfortableInEnglish === "yes" ? true : draft.comfortableInEnglish === "no" ? false : undefined,
    roles,
    skills: skillsFromDraft(draft),
    salary: salaryFromDraft(draft),
    facts: existing?.facts,
    answerBank: existing?.answerBank,
    evidence: draft.evidence,
  });
}

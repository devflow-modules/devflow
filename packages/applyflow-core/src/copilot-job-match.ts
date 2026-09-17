import { evaluateJobMatch } from "./evaluate-job-match.js";
import { extractJobIntelligence, normalizeJobTextForIntel, type JobIntelligence } from "./job-intelligence.js";
import {
  declaredSkillYears,
  maxDeclaredYears,
  profileEnglishLevel,
  type ApplyflowSkillKey,
  type CandidateProfile,
} from "./profile-schema.js";

export const COPILOT_JOB_MATCH_VERSION = "copilot-v1" as const;
export type CopilotJobMatchVersion = typeof COPILOT_JOB_MATCH_VERSION;

export const COPILOT_MATCH_THRESHOLDS = {
  apply: 85,
  review: 70,
} as const;

export type CopilotJobMatchDecision = "apply" | "review" | "needs_info" | "skip";

export type CopilotRoleFit = {
  frontend: number;
  fullstack: number;
  productEngineer: number;
  automationRpa: number;
};

export type JobMatchResult = {
  score: number;
  decision: CopilotJobMatchDecision;
  strengths: string[];
  gaps: string[];
  matchedSkills: string[];
  missingSkills: string[];
  unknownSkills: string[];
  requiredMatched: string[];
  requiredMissing: string[];
  requiredUnknown: string[];
  preferredMatched: string[];
  preferredMissing: string[];
  preferredUnknown: string[];
  roleFit: CopilotRoleFit;
  explanation: string;
  scoringVersion: CopilotJobMatchVersion;
};

export type SplitJobSkills = {
  required: string[];
  preferred: string[];
  /** Skills whose own item uses explicit knockout language (must/required). Listed qualifications are not included. */
  knockout: string[];
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function decideCopilotJobMatch(score: number): CopilotJobMatchDecision {
  if (score >= COPILOT_MATCH_THRESHOLDS.apply) return "apply";
  if (score >= COPILOT_MATCH_THRESHOLDS.review) return "review";
  return "skip";
}

function uniqueLabels(labels: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = raw.trim();
    if (!label) continue;
    const key = normalizeJobTextForIntel(label).replace(/[^a-z0-9+]/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

const REQUIRED_SECTION_HEADER =
  /^(requirements?|qualifications?|must have|minimum qualifications?|requisitos|obrigat[oó]ri[oa]s?|exig[eê]ncias?)\s*:?\s*$/i;
const PREFERRED_SECTION_HEADER =
  /^(nice to have|preferred(?: qualifications?)?|plus|a plus|bonus|good to have|desej[aá]ve(?:is|l)?|diferenciais?|opcionais?)\s*:?\s*$/i;
const OTHER_SECTION_HEADER =
  /^(what we offer|benefits|about(?: the)?(?: role| company)?|job overview|key responsibilities|responsibilities|location|employment type|department)\s*:?\s*$/i;
const PREFERRED_HEADER_WITH_REST =
  /^(nice to have|preferred(?: qualifications?)?|plus|a plus|bonus|good to have|desej[aá]ve(?:is|l)?|diferenciais?|opcionais?)\s*:\s*(.*)$/i;
const REQUIRED_HEADER_WITH_REST =
  /^(requirements?|qualifications?|must have|minimum qualifications?|requisitos|obrigat[oó]ri[oa]s?|exig[eê]ncias?)\s*:\s*(.*)$/i;
const INLINE_KNOCKOUT = /\b(must have|must be|required|mandatory|obrigat[oó]ri[oa])\b/i;
const INLINE_PREFERRED = /\b(preferred|nice to have|good to have|a plus|is a plus|desej[aá]vel|opcional)\b/i;

type QualifierRole = "required" | "preferred" | "body";

export type ClassifiedJobItem = {
  text: string;
  role: QualifierRole;
  whollyPreferred: boolean;
  knockout: boolean;
};

function stripListMarker(line: string): string {
  return line.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
}

function withoutParentheticalQualifiers(text: string): string {
  return text.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function parentheticalSegments(text: string): string[] {
  return [...text.matchAll(/\(([^)]*)\)/g)].map((match) => match[1] ?? "");
}

export function itemIsWhollyPreferred(text: string): boolean {
  const outside = withoutParentheticalQualifiers(text);
  return INLINE_PREFERRED.test(outside);
}

export function itemHasKnockoutLanguage(text: string): boolean {
  return INLINE_KNOCKOUT.test(withoutParentheticalQualifiers(text));
}

/**
 * Splits posting text into list items / lines and classifies each locally.
 * Inline “(startup/product experience preferred)” does not open a preferred section.
 */
export function classifyJobTextItems(jobText: string): ClassifiedJobItem[] {
  const items: ClassifiedJobItem[] = [];
  let section: QualifierRole = "body";

  const push = (raw: string, role: QualifierRole) => {
    const text = raw.trim();
    if (!text) return;
    items.push({
      text,
      role,
      whollyPreferred: role === "preferred" || itemIsWhollyPreferred(text),
      knockout: role !== "preferred" && itemHasKnockoutLanguage(text),
    });
  };

  for (const rawLine of jobText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const content = stripListMarker(line);

    if (PREFERRED_SECTION_HEADER.test(content)) {
      section = "preferred";
      continue;
    }
    if (REQUIRED_SECTION_HEADER.test(content)) {
      section = "required";
      continue;
    }
    if (OTHER_SECTION_HEADER.test(content)) {
      section = "body";
      continue;
    }

    const preferredInline = PREFERRED_HEADER_WITH_REST.exec(content);
    if (preferredInline) {
      section = "preferred";
      push(preferredInline[2] ?? "", "preferred");
      continue;
    }
    const requiredInline = REQUIRED_HEADER_WITH_REST.exec(content);
    if (requiredInline) {
      section = "required";
      push(requiredInline[2] ?? "", "required");
      continue;
    }

    const role: QualifierRole = itemIsWhollyPreferred(content) ? "preferred" : section;
    push(content, role);
  }
  return items;
}

function itemMentionsToken(itemText: string, token: string): boolean {
  const folded = normalizeJobTextForIntel(itemText);
  const needle = normalizeJobTextForIntel(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!needle) return false;
  return new RegExp(`(?:^|[^a-z0-9])${needle}(?:[^a-z0-9]|$)`).test(folded);
}

function skillMentionIsPreferredOnly(item: ClassifiedJobItem, skill: string): boolean {
  if (!itemMentionsToken(item.text, skill)) return false;
  const outside = withoutParentheticalQualifiers(item.text);
  if (itemMentionsToken(outside, skill)) return item.whollyPreferred || item.role === "preferred";
  return parentheticalSegments(item.text).some(
    (segment) => itemMentionsToken(segment, skill) && INLINE_PREFERRED.test(segment),
  );
}

/**
 * Separa skills REQUIRED vs PREFERRED pelo item/oração, não pelo resto do documento.
 * Sem cabeçalhos, skills listadas continuam required. Qualificadores entre parênteses ficam no item.
 */
export function splitRequiredPreferredSkills(jobText: string, detectedSkills: readonly string[]): SplitJobSkills {
  const all = uniqueLabels(detectedSkills);
  if (all.length === 0) return { required: [], preferred: [], knockout: [] };

  const items = classifyJobTextItems(jobText);
  const required: string[] = [];
  const preferred: string[] = [];
  const knockout: string[] = [];

  for (const skill of all) {
    const hits = items.filter((item) => itemMentionsToken(item.text, skill));
    if (hits.length === 0) {
      required.push(skill);
      continue;
    }
    const requiredHits = hits.filter((item) => !skillMentionIsPreferredOnly(item, skill));
    if (requiredHits.length > 0) {
      required.push(skill);
      if (requiredHits.some((item) => item.knockout)) knockout.push(skill);
      continue;
    }
    preferred.push(skill);
  }

  return {
    required: uniqueLabels(required),
    preferred: uniqueLabels(preferred),
    knockout: uniqueLabels(knockout),
  };
}

function skillYears(profile: CandidateProfile, key: ApplyflowSkillKey): number | undefined {
  const facts = profile.facts;
  if (key === "React" && facts.reactYears !== undefined) return facts.reactYears;
  if (key === "Nextjs" && facts.nextYears !== undefined) return facts.nextYears;
  if (key === "Nodejs" && facts.nodeYears !== undefined) return facts.nodeYears;
  if (key === "TypeScript" && facts.typescriptYears !== undefined) return facts.typescriptYears;
  if (key === "Python" && facts.pythonYears !== undefined) return facts.pythonYears;
  return declaredSkillYears(profile.skills, key);
}

function maxDeclaredSkillYears(profile: CandidateProfile): number | undefined {
  return maxDeclaredYears(profile);
}

function yearsBand(years: number): number {
  if (years >= 8) return 4;
  if (years >= 5) return 3;
  if (years >= 3) return 2;
  if (years >= 1) return 1;
  return 0;
}

function jobSeniorityBand(intel: JobIntelligence): number {
  switch (intel.seniority) {
    case "lead":
      return 4;
    case "senior":
      return 3;
    case "mid":
      return 2;
    case "junior":
      return 1;
    default:
      return 3;
  }
}

function scoreSeniority(profile: CandidateProfile, intel: JobIntelligence): number {
  const years = maxDeclaredSkillYears(profile);
  if (years === undefined) return 55;
  if (years <= 0 && intel.seniority === "unknown") return 55;
  const delta = Math.abs(yearsBand(years) - jobSeniorityBand(intel));
  if (delta === 0) return 100;
  if (delta === 1) return 78;
  if (delta === 2) return 52;
  return 28;
}

function scoreWorkModel(profile: CandidateProfile, intel: JobIntelligence): number {
  const pref = profile.facts.remotePreference;
  if (!pref || intel.workModel === "unknown") return 72;
  if (pref === "flexible") return 88;
  if (pref === intel.workModel) return 100;
  if (pref === "remote" && intel.workModel === "hybrid") return 70;
  if (pref === "hybrid" && intel.workModel === "remote") return 82;
  if (pref === "remote" && intel.workModel === "onsite") return 28;
  if (pref === "onsite" && intel.workModel === "remote") return 45;
  return 50;
}

function scoreEnglish(profile: CandidateProfile, intel: JobIntelligence): number {
  if (!intel.englishRequired) return 82;
  const level = profileEnglishLevel(profile);
  switch (level) {
    case "Fluent":
      return 100;
    case "Advanced":
      return 92;
    case "Intermediate":
      return 68;
    case "Basic":
      return 32;
    default:
      return 50;
  }
}

function scoreContract(profile: CandidateProfile, intel: JobIntelligence): number {
  if (intel.contractType === "unknown") return 70;
  const years = maxDeclaredSkillYears(profile);
  if (intel.contractType === "internship" && years !== undefined && years >= 4) return 22;
  return 80;
}

function avgYears(profile: CandidateProfile, keys: ApplyflowSkillKey[]): number {
  const years = keys.map((k) => skillYears(profile, k)).filter((n): n is number => typeof n === "number" && n > 0);
  if (years.length === 0) return 0;
  return years.reduce((a, b) => a + b, 0) / years.length;
}

function hasText(folded: string, re: RegExp): boolean {
  return re.test(folded);
}

function computeRoleFit(profile: CandidateProfile, intel: JobIntelligence, jobText: string): CopilotRoleFit {
  const folded = normalizeJobTextForIntel(jobText);
  const fe = avgYears(profile, ["React", "Nextjs", "TypeScript", "HTML", "CSS", "Tailwind"]);
  const be = avgYears(profile, ["Nodejs", "PostgreSQL", "Prisma", "Python"]);
  const auto = avgYears(profile, ["Python", "Playwright", "Jest"]);
  const roles = profile.roles.join(" ").toLowerCase();
  const productRole =
    /product engineer|saas|ownership/i.test(roles) ||
    hasText(folded, /\bproduct engineer\b|\bownership\b|\bend[\s-]?to[\s-]?end\b|\bdiscovery\b|\bsaas\b/);

  const jobFrontend =
    intel.roleType === "frontend" ||
    hasText(folded, /\bfront(?:\s*[\-]?end)?\b|\breact\b|\bnext(?:\.|\s)?js\b|\bui\b|\bcss\b/);
  const jobFullstack = intel.roleType === "fullstack" || hasText(folded, /\bfull\s*[\-]?\s*stack\b/);
  const jobProduct = hasText(
    folded,
    /\bproduct engineer\b|\bproduct[- ]oriented\b|\bownership\b|\bdiscovery\b|\bend[\s-]?to[\s-]?end\b|\bsaas\b|\b0[\s-]?to[\s-]?1\b/,
  );
  const jobAuto = hasText(
    folded,
    /\brpa\b|\bselenium\b|\bplaywright\b|\bautomation\b|\bpython\b.*\bautomat|\bautomat.*\bpython\b/,
  );

  const frontendCapability = clamp(fe * 16 + (jobFrontend ? 18 : 0) + (intel.roleType === "frontend" ? 10 : 0));
  const fullstackCapability = clamp(
    Math.min(fe, be) * 14 +
      Math.max(fe, be) * 6 +
      (jobFullstack ? 16 : 0) +
      (fe >= 3 && be >= 3 ? 18 : fe >= 3 && be >= 1 ? 8 : 0),
  );
  const productCapability = clamp(
    (productRole ? 36 : 12) +
      (jobProduct ? 28 : 0) +
      Math.min(fe, be) * 8 +
      (/product/i.test(roles) ? 16 : 0),
  );
  const automationCapability = clamp(
    auto * 14 +
      (skillYears(profile, "Python") ?? 0) * 8 +
      (skillYears(profile, "Playwright") ?? 0) * 10 +
      (jobAuto ? 24 : 0) +
      (hasText(folded, /\brpa\b/) ? 16 : 0),
  );

  return {
    frontend: frontendCapability,
    fullstack: fullstackCapability,
    productEngineer: productCapability,
    automationRpa: automationCapability,
  };
}

function roleAlignment(intel: JobIntelligence, fit: CopilotRoleFit, jobText: string): number {
  const folded = normalizeJobTextForIntel(jobText);
  if (hasText(folded, /\brpa\b|\bselenium\b/) || intel.roleType === "unknown" && hasText(folded, /\bautomation\b/)) {
    return fit.automationRpa;
  }
  if (hasText(folded, /\bproduct engineer\b|\bownership\b|\bdiscovery\b/)) {
    return Math.max(fit.productEngineer, fit.fullstack);
  }
  switch (intel.roleType) {
    case "frontend":
      return fit.frontend;
    case "fullstack":
      return fit.fullstack;
    case "backend":
      return clamp(fit.fullstack * 0.7 + 18);
    default:
      return Math.max(fit.frontend, fit.fullstack);
  }
}

function feBeBalance(profile: CandidateProfile, intel: JobIntelligence): number {
  const fe = avgYears(profile, ["React", "Nextjs", "TypeScript"]);
  const be = avgYears(profile, ["Nodejs", "PostgreSQL", "Prisma"]);
  if (intel.roleType === "frontend") {
    if (fe >= 4 && be <= 2) return 92;
    if (fe >= 3) return 80;
    return 45;
  }
  if (intel.roleType === "backend") {
    if (be >= 3) return 78;
    return 40;
  }
  if (intel.roleType === "fullstack" || intel.roleType === "unknown") {
    if (fe >= 3 && be >= 3) return 96;
    if (fe >= 3 && be >= 1) return 74;
    if (fe >= 3) return 58;
    return 40;
  }
  return 70;
}

function coverageScore(profile: CandidateProfile, skills: readonly string[]): {
  score: number;
  matched: string[];
  missing: string[];
  unknown: string[];
} {
  if (skills.length === 0) {
    return { score: 55, matched: [], missing: [], unknown: [] };
  }
  const match = evaluateJobMatch(profile, { skills });
  return {
    score: match.score,
    matched: match.matchedSkills,
    missing: match.missingSkills,
    unknown: match.unknownSkills ?? [],
  };
}

function uniquePush(target: string[], value: string): void {
  if (!value.trim()) return;
  if (target.some((item) => item.toLowerCase() === value.toLowerCase())) return;
  target.push(value);
}

/**
 * Motor de matching do Application Copilot.
 * Determinístico, sem IA. Não substitui `evaluateJobMatch` (v1 / dashboard).
 */
export function computeCopilotJobMatch(
  profile: CandidateProfile,
  jobText: string,
  intelInput?: JobIntelligence,
): JobMatchResult {
  const text = jobText.trim();
  const intel = intelInput ?? extractJobIntelligence(text);
  const split = splitRequiredPreferredSkills(text, intel.detectedSkills);
  const required = coverageScore(profile, split.required);
  const preferred = coverageScore(profile, split.preferred);
  const roleFit = computeRoleFit(profile, intel, text);
  const alignment = roleAlignment(intel, roleFit, text);
  const seniority = scoreSeniority(profile, intel);
  const workModel = scoreWorkModel(profile, intel);
  const english = scoreEnglish(profile, intel);
  const contract = scoreContract(profile, intel);
  const balance = feBeBalance(profile, intel);
  const preferredWeight = split.preferred.length > 0 ? 0.08 : 0;

  let score = clamp(
    required.score * (0.38 + (split.preferred.length > 0 ? 0 : 0.08)) +
      preferred.score * preferredWeight +
      alignment * 0.16 +
      seniority * 0.1 +
      workModel * 0.06 +
      english * 0.05 +
      contract * 0.03 +
      balance * 0.06,
  );

  if (split.required.length >= 3 && required.score <= 34) {
    score = Math.min(score, 62);
  }
  if (split.required.length > 0 && required.matched.length === 0) {
    score = Math.min(score, 62);
  }
  if (split.required.length > 0 && required.unknown.length / split.required.length >= 0.5) {
    score = Math.min(score, 84);
  }
  if (required.score >= 50 && required.score < 85 && required.matched.length >= 2 && required.missing.length > 0) {
    score = Math.min(84, Math.max(score, 71));
  }
  if (required.score >= 90 && alignment >= 70 && seniority >= 70 && required.unknown.length === 0) {
    score = Math.max(score, 86);
  }
  const declaredYears = maxDeclaredSkillYears(profile);
  if (intel.contractType === "internship" && declaredYears !== undefined && declaredYears >= 4) {
    score = Math.min(score, 64);
  }

  const matchedSkills = uniqueLabels([...required.matched, ...preferred.matched]);
  const missingSkills = uniqueLabels([...required.missing, ...preferred.missing]);
  const unknownSkills = uniqueLabels([...required.unknown, ...preferred.unknown]);

  const strengths: string[] = [];
  for (const skill of required.matched) uniquePush(strengths, skill);
  for (const skill of preferred.matched) uniquePush(strengths, skill);
  if (alignment >= 75 && intel.roleType === "fullstack") uniquePush(strengths, "Perfil full stack alinhado ao papel");
  if (alignment >= 75 && intel.roleType === "frontend") uniquePush(strengths, "Perfil frontend alinhado ao papel");
  if (roleFit.productEngineer >= 70 && /product|ownership|saas/i.test(text)) {
    uniquePush(strengths, "Sinais de product engineering / ownership");
  }
  if (roleFit.automationRpa >= 70 && /rpa|selenium|playwright|automation/i.test(text)) {
    uniquePush(strengths, "Automação / RPA / Python");
  }
  if (workModel >= 90) uniquePush(strengths, "Modelo de trabalho compatível");
  if (english >= 90 && intel.englishRequired) uniquePush(strengths, "Inglês compatível com a vaga");

  const gaps: string[] = [];
  for (const skill of required.missing) uniquePush(gaps, `${skill} (required)`);
  for (const skill of preferred.missing) uniquePush(gaps, `${skill} (nice to have)`);
  if (workModel <= 40) uniquePush(gaps, "Modelo de trabalho pouco compatível");
  if (english <= 40 && intel.englishRequired) uniquePush(gaps, "Inglês abaixo do pedido na vaga");
  if (seniority <= 40) uniquePush(gaps, "Senioridade desalinhada");

  let decision = decideCopilotJobMatch(score);
  const unknownHeavy =
    required.missing.length === 0 &&
    required.unknown.length > 0 &&
    (required.matched.length === 0 ||
      required.unknown.length / Math.max(1, split.required.length) >= 0.5 ||
      decision === "skip");
  if (unknownHeavy) {
    decision = "needs_info";
  }
  const reqBit =
    split.required.length > 0
      ? `cobertura required ${required.score}% (${required.matched.length}/${split.required.length})`
      : "sem lista required explícita";
  const prefBit =
    split.preferred.length > 0
      ? `; nice-to-have ${preferred.score}%`
      : "";
  const unknownBit =
    required.unknown.length > 0
      ? `; ${required.unknown.length} required sem evidência (não é gap)`
      : "";
  const explanation = `Score ${score} (${decision.toUpperCase()}): ${reqBit}${prefBit}${unknownBit}; alinhamento de papel ${alignment}; senioridade ${seniority}; modelo ${workModel}; inglês ${english}. Skills não são o único factor.`;

  return {
    score,
    decision,
    strengths: strengths.slice(0, 10),
    gaps: gaps.slice(0, 10),
    matchedSkills,
    missingSkills,
    unknownSkills,
    requiredMatched: required.matched,
    requiredMissing: required.missing,
    requiredUnknown: required.unknown,
    preferredMatched: split.preferred.length ? preferred.matched : [],
    preferredMissing: split.preferred.length ? preferred.missing : [],
    preferredUnknown: split.preferred.length ? preferred.unknown : [],
    roleFit,
    explanation,
    scoringVersion: COPILOT_JOB_MATCH_VERSION,
  };
}

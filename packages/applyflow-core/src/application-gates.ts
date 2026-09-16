import {
  maxDeclaredYears,
  profileEnglishLevel,
  profileLocation,
  salaryField,
  type CandidateProfile,
} from "./profile-schema.js";
import { extractJobIntelligence, locationMentionsMatch, normalizeJobTextForIntel } from "./job-intelligence.js";
import { documentedYearsFromEvidence, yearsDeclaredInEvidence, type EvidenceMatch } from "./evidence-matching.js";

export const APPLICATION_GATE_TYPES = [
  "location",
  "work_authorization",
  "hours",
  "salary",
  "seniority",
  "years",
  "english",
  "mandatory_skill",
  "binary_knockout",
  "education",
] as const;

export type ApplicationGateType = (typeof APPLICATION_GATE_TYPES)[number];

export const APPLICATION_GATE_RESULTS = ["pass", "fail", "unknown", "not_applicable"] as const;
export type ApplicationGateResult = (typeof APPLICATION_GATE_RESULTS)[number];

export type ApplicationGate = {
  id: string;
  type: ApplicationGateType;
  label: string;
  required: boolean;
  candidateValue?: string;
  result: ApplicationGateResult;
  reason: string;
};

function folded(text: string): string {
  return normalizeJobTextForIntel(text);
}

function maxYears(profile: CandidateProfile): number | undefined {
  return maxDeclaredYears(profile);
}

export function evaluateApplicationGates(input: {
  jobText: string;
  profile?: CandidateProfile;
  matches: readonly EvidenceMatch[];
}): ApplicationGate[] {
  const intel = extractJobIntelligence(input.jobText);
  const text = folded(input.jobText);
  const profile = input.profile;
  const gates: ApplicationGate[] = [];

  const locationValue = profile ? profileLocation(profile) : undefined;
  const exclusiveLock = /\bunited states only\b|\bus only\b|\bmust be (?:located|based) in\b|\bno remote\b/.test(text);
  const locationMatch = input.matches.find((item) => item.requirement.requirementType === "location");
  let locationResult: ApplicationGateResult = "unknown";
  let locationReason = "Work location is not explicit.";
  if (exclusiveLock && locationValue && /\bbrazil\b|\bbrasil\b/.test(folded(locationValue)) && (/\bus only\b|\bunited states only\b|\bmust be (?:located|based) in the united states\b/.test(text) || intel.workModel === "onsite")) {
    locationResult = "fail";
    locationReason = "Posting is location-locked; candidate location does not match. Work authorization is evaluated separately.";
  } else if (locationMatch?.status === "proven") {
    locationResult = "pass";
    locationReason = locationMatch.reason;
  } else if (locationValue && intel.mentionedLocations.length > 0 && locationMentionsMatch(locationValue, intel.mentionedLocations)) {
    locationResult = "pass";
    locationReason = `Remote posting includes a location compatible with ${locationValue}. This is not a work-authorization decision.`;
  } else if (intel.workModel === "remote" && intel.mentionedLocations.length === 0 && !exclusiveLock) {
    locationResult = "pass";
    locationReason = "Remote work model; no country lock detected. Work authorization is evaluated separately.";
  } else if (locationMatch?.status === "unknown") {
    locationResult = "unknown";
    locationReason = locationMatch.reason;
  } else if (intel.workModel === "unknown" && intel.mentionedLocations.length === 0) {
    locationResult = "unknown";
    locationReason = "Work location is not explicit.";
  }
  gates.push({
    id: "gate-location",
    type: "location",
    label: "Location",
    required: exclusiveLock || intel.mentionedLocations.length > 0,
    candidateValue: locationValue,
    result: locationResult,
    reason: locationReason,
  });

  const authMention = /\bwork authorization\b|\bvisa\b|\bcitizenship\b|\bauthorized to work\b/.test(text);
  gates.push({
    id: "gate-work-auth",
    type: "work_authorization",
    label: "Work authorization",
    required: authMention,
    result: authMention ? "unknown" : "not_applicable",
    reason: authMention
      ? "Authorization is mentioned but no candidate authorization fact is recorded."
      : "The posting does not state a work-authorization requirement. This is not proof of authorization.",
  });

  const salaryMatch = input.matches.find((item) => item.requirement.requirementType === "salary");
  const pretension = profile
    ? [salaryField(profile, "usdMonthly"), salaryField(profile, "cltSenior")].filter(Boolean).join(" / ") || undefined
    : undefined;
  gates.push({
    id: "gate-salary",
    type: "salary",
    label: "Salary",
    required: false,
    candidateValue: pretension,
    result: intel.salaryMentioned ? "unknown" : "pass",
    reason: intel.salaryMentioned
      ? salaryMatch?.reason ??
        `Compensation is mentioned${intel.compensation ? ` as "${intel.compensation.extractedText}"` : ""}. Periodicity is ${
          intel.compensation?.periodicity === "unknown" || !intel.compensation ? "not stated" : intel.compensation.periodicity
        }. Financial compatibility stays pending and is not a technical knockout.`
      : "No salary knockout to evaluate.",
  });

  if (intel.schedule) {
    const hoursMatch = input.matches.find((item) => item.requirement.requirementType === "schedule");
    const hoursResult: ApplicationGateResult =
      hoursMatch?.status === "proven" ? "pass" : hoursMatch?.status === "gap" ? "fail" : "unknown";
    const scopedAvailability = (profile?.evidence ?? []).find(
      (item) => item.kind === "availability" && item.scheduleWindow?.label,
    );
    gates.push({
      id: "gate-hours",
      type: "hours",
      label: "Hours",
      required: true,
      candidateValue:
        scopedAvailability?.scheduleWindow?.label ||
        profile?.facts.availability ||
        profile?.answerBank.availability ||
        undefined,
      result: hoursResult,
      reason:
        hoursMatch?.reason ??
        `Posting asks for online presence ${intel.schedule.extractedText}. Daylight-saving / DST for ${
          intel.schedule.timezoneLabel ?? "the stated timezone"
        } is not specified. Availability is not recorded — confirm before treating as pass or fail.`,
    });
  }

  const years = profile ? maxYears(profile) : undefined;
  if (intel.seniority === "lead" && years === undefined) {
    gates.push({
      id: "gate-seniority",
      type: "seniority",
      label: "Seniority",
      required: true,
      result: "unknown",
      reason: "Lead/staff bar is stated but candidate years are not recorded.",
    });
  } else if (intel.seniority === "lead" && typeof years === "number" && years < 6) {
    gates.push({
      id: "gate-seniority",
      type: "seniority",
      label: "Seniority",
      required: true,
      candidateValue: years !== undefined ? `${years} years` : undefined,
      result: "fail",
      reason: "Lead/staff bar is above the recorded experience band.",
    });
  } else if (intel.seniority === "unknown") {
    gates.push({
      id: "gate-seniority",
      type: "seniority",
      label: "Seniority",
      required: false,
      candidateValue: years !== undefined ? `${years} years` : undefined,
      result: "unknown",
      reason: "Seniority is not explicit enough to pass or fail.",
    });
  } else if (years === undefined) {
    gates.push({
      id: "gate-seniority",
      type: "seniority",
      label: "Seniority",
      required: intel.seniority === "senior" || intel.seniority === "lead",
      result: "unknown",
      reason: "Posted seniority is explicit but candidate years are not recorded.",
    });
  } else {
    gates.push({
      id: "gate-seniority",
      type: "seniority",
      label: "Seniority",
      required: intel.seniority === "senior" || intel.seniority === "lead",
      candidateValue: `${years} years`,
      result: "pass",
      reason: "Recorded experience band is compatible with the posted seniority.",
    });
  }

  const yearReq =
    input.matches.find(
      (item) =>
        item.requirement.requirementType === "years" &&
        !item.requirement.skillHint &&
        typeof item.requirement.minYears === "number",
    ) ??
    input.matches.find(
      (item) => item.requirement.requirementType === "years" && !item.requirement.skillHint && item.requirement.importance === "fundamental",
    ) ??
    input.matches.find((item) => item.requirement.requirementType === "years" && item.requirement.importance === "fundamental") ??
    input.matches.find((item) => item.requirement.requirementType === "years" && item.requirement.mandatory);
  if (yearReq) {
    const requiredYears = Boolean(yearReq.requirement.mandatory);
    const minYears = yearReq.requirement.minYears;
    const evYears =
      documentedYearsFromEvidence(yearReq.matchedEvidence) ??
      (yearReq.matchedEvidence[0] ? yearsDeclaredInEvidence(yearReq.matchedEvidence[0]) : undefined);
    let yearsResult: ApplicationGateResult = "unknown";
    let yearsReason = yearReq.reason;
    if (typeof minYears === "number" && typeof evYears === "number" && evYears >= minYears) {
      yearsResult = "pass";
      yearsReason =
        yearReq.status === "partial"
          ? `The ${minYears}+ years bar is met (${evYears} recorded). Remaining partial status is about another aspect, not inferred career years.`
          : yearReq.reason;
    } else if (typeof minYears === "number" && typeof evYears === "number" && evYears < minYears) {
      yearsResult = requiredYears ? "fail" : "unknown";
      yearsReason = `Recorded ${evYears} year(s) is below the ${minYears}+ years bar.`;
    } else if (yearReq.status === "gap") {
      yearsResult = "fail";
    } else {
      yearsResult = "unknown";
      yearsReason =
        typeof minYears === "number"
          ? `Duration for ${yearReq.requirement.label} is not recorded. The ${minYears}+ years bar stays unknown.`
          : yearReq.reason;
    }
    gates.push({
      id: "gate-years",
      type: "years",
      label: yearReq.requirement.label,
      required: requiredYears,
      candidateValue: evYears !== undefined ? `${evYears}` : undefined,
      result: yearsResult,
      reason: yearsReason,
    });
  } else {
    gates.push({
      id: "gate-years",
      type: "years",
      label: "Years of experience",
      required: false,
      candidateValue: years !== undefined ? `${years}` : undefined,
      result: years === undefined ? "unknown" : "pass",
      reason: years === undefined ? "Total years are not recorded." : "No explicit years knockout beyond general experience.",
    });
  }

  if (intel.englishRequired) {
    const level = profile ? profileEnglishLevel(profile) : undefined;
    const englishMatch = input.matches.find((item) => item.requirement.requirementType === "language");
    let result: ApplicationGateResult = "unknown";
    let reason = englishMatch?.reason ?? "English is required but candidate English is unknown.";
    if (englishMatch?.status === "proven") {
      result = "pass";
      reason = englishMatch.reason;
    } else if (englishMatch?.status === "gap") {
      result = "fail";
      reason = englishMatch.reason;
    } else if (englishMatch?.status === "partial" || englishMatch?.status === "unknown") {
      result = "unknown";
      reason = englishMatch.reason;
    }
    gates.push({
      id: "gate-english",
      type: "english",
      label: "English",
      required: true,
      candidateValue: level,
      result,
      reason,
    });
  } else {
    gates.push({
      id: "gate-english",
      type: "english",
      label: "English",
      required: false,
      result: "pass",
      reason: "English is not an explicit knockout.",
    });
  }

  const mandatorySkills = input.matches.filter(
    (item) => item.requirement.mandatory && item.requirement.requirementType === "skill",
  );
  const mandatoryGaps = mandatorySkills.filter((item) => item.status === "gap");
  const mandatoryOpen = mandatorySkills.filter((item) => item.status === "unknown" || item.status === "partial");
  const unresolvedListed = input.matches.filter(
    (item) =>
      (item.requirement.requirementType === "skill" || item.requirement.requirementType === "experience") &&
      (item.status === "unknown" || item.status === "partial"),
  );
  let mandatoryResult: ApplicationGateResult = "not_applicable";
  let mandatoryReason =
    "No skill was marked as a binary knockout. This is not confirmation that listed skills are met.";
  if (mandatoryGaps.length > 0) {
    mandatoryResult = "fail";
    mandatoryReason = `Mandatory skill not evidenced: ${mandatoryGaps.map((item) => item.requirement.label).join(", ")}.`;
  } else if (mandatoryOpen.length > 0) {
    mandatoryResult = "unknown";
    mandatoryReason = `Mandatory skills remain unconfirmed: ${mandatoryOpen.map((item) => item.requirement.label).join(", ")}. This is not a pass.`;
  } else if (mandatorySkills.length > 0) {
    mandatoryResult = "pass";
    const evidenced = mandatorySkills.map((item) => item.requirement.label).join(", ");
    mandatoryReason = `Mandatory skills are evidenced: ${evidenced}.`;
    if (unresolvedListed.length > 0) {
      mandatoryReason += ` This is not confirmation of other listed skills. Still unknown or partial: ${unresolvedListed
        .map((item) => item.requirement.label)
        .join(", ")}.`;
    }
  } else if (unresolvedListed.length > 0) {
    mandatoryResult = "not_applicable";
    mandatoryReason = `No skill was marked as a binary knockout. This is not confirmation that listed skills are met. Still unknown or partial: ${unresolvedListed
      .map((item) => item.requirement.label)
      .join(", ")}.`;
  }
  gates.push({
    id: "gate-mandatory-skill",
    type: "mandatory_skill",
    label: "Mandatory skill",
    required: mandatoryGaps.length > 0,
    result: mandatoryResult,
    reason: mandatoryReason,
  });

  const educationMatch = input.matches.find(
    (item) =>
      (item.requirement.qualifiers ?? []).includes("education") ||
      (Boolean(item.requirement.mandatory) && /college degree|four-year|bachelor/i.test(item.requirement.label)),
  );
  if (educationMatch) {
    gates.push({
      id: "gate-education",
      type: "education",
      label: educationMatch.requirement.label,
      required: Boolean(educationMatch.requirement.mandatory),
      result:
        educationMatch.status === "proven" ? "pass" : educationMatch.status === "gap" ? "fail" : "unknown",
      reason: educationMatch.reason,
    });
  }

  const knockout = /\bmust be (?:a )?us citizen\b|\bno visa sponsorship\b|\bsecurity clearance required\b/.test(text);
  gates.push({
    id: "gate-binary-knockout",
    type: "binary_knockout",
    label: "Binary knockout",
    required: knockout,
    result: knockout ? "unknown" : "not_applicable",
    reason: knockout
      ? "A binary knockout is present; candidate eligibility is not recorded. This is not a pass."
      : "No binary knockout question was detected. This is not confirmation of eligibility.",
  });

  return gates;
}

export function hasFailingRequiredGate(gates: readonly ApplicationGate[]): boolean {
  return gates.some((gate) => gate.required && gate.result === "fail");
}

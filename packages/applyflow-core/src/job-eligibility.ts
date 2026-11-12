import { normalizeJobTextForIntel } from "./job-intelligence.js";
import { profileLocation, type CandidateProfile, type RemotePreference } from "./profile-schema.js";

/**
 * Geographic, work-mode and seniority eligibility.
 * Technical coverage stays in evaluateJobMatch. This module never writes the profile.
 */

export type EligibilityStatus = "eligible" | "ineligible" | "unknown";

export type EligibilityDimension = "location" | "work_mode" | "seniority";

export type EligibilityFinding = {
  dimension: EligibilityDimension;
  status: EligibilityStatus;
  reason: string;
  evidence?: string[];
  requiresConfirmation?: boolean;
};

export type JobEligibility = {
  status: EligibilityStatus;
  findings: EligibilityFinding[];
};

export type CanonicalCandidateLocation = {
  city?: string;
  state?: string;
  country?: string;
};

const BRAZIL_STATE_CODES = new Set([
  "ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt", "ms", "mg",
  "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "sp", "se", "to",
]);

const BRAZIL_STATE_NAMES: Record<string, string> = {
  "sao paulo": "SP",
  "rio de janeiro": "RJ",
  "minas gerais": "MG",
  "rio grande do sul": "RS",
  "santa catarina": "SC",
  parana: "PR",
  bahia: "BA",
  pernambuco: "PE",
  ceara: "CE",
  "distrito federal": "DF",
};

const LATAM = new Set([
  "Argentina",
  "Bolivia",
  "Brazil",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Ecuador",
  "Mexico",
  "Panama",
  "Paraguay",
  "Peru",
  "Uruguay",
  "Venezuela",
]);

const EUROPE = new Set([
  "France",
  "Germany",
  "Ireland",
  "Italy",
  "Netherlands",
  "Poland",
  "Portugal",
  "Spain",
  "Sweden",
  "United Kingdom",
]);

const COUNTRY_NAMES: { id: string; names: string[] }[] = [
  { id: "Brazil", names: ["brazil", "brasil"] },
  { id: "United States", names: ["united states", "united states of america", "usa", "u.s."] },
  { id: "Philippines", names: ["philippines"] },
  { id: "Germany", names: ["germany", "deutschland"] },
  { id: "Argentina", names: ["argentina"] },
  { id: "India", names: ["india"] },
  { id: "Mexico", names: ["mexico"] },
  { id: "Chile", names: ["chile"] },
  { id: "Colombia", names: ["colombia"] },
  { id: "Portugal", names: ["portugal"] },
  { id: "Spain", names: ["spain", "espana"] },
  { id: "France", names: ["france"] },
  { id: "United Kingdom", names: ["united kingdom", "uk"] },
  { id: "Ireland", names: ["ireland"] },
];

type GeoConstraint =
  | { kind: "worldwide" }
  | { kind: "region"; region: "LATAM" | "Europe" }
  | { kind: "countries"; countries: string[] }
  | { kind: "unstated" };

export function eligibilitySortRank(status: EligibilityStatus | undefined): number {
  if (status === "eligible") return 0;
  if (status === "ineligible") return 2;
  return 1;
}

export function canonicalizeCandidateLocation(raw: string | undefined): CanonicalCandidateLocation | undefined {
  const folded = fold(raw ?? "");
  if (!folded || folded.length > 80 || folded.split(" ").length > 6) return undefined;
  const tokens = folded.split(/[,/;|]+/).map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 8) return undefined;

  let city: string | undefined;
  let state: string | undefined;
  let country: string | undefined;

  for (const token of tokens) {
    const named = countryFromToken(token);
    if (named) {
      country = named;
      continue;
    }
    const stateName = BRAZIL_STATE_NAMES[token];
    if (stateName) {
      state = stateName;
      country ??= "Brazil";
      continue;
    }
    if (BRAZIL_STATE_CODES.has(token)) {
      state = token.toUpperCase();
      country ??= "Brazil";
      continue;
    }
    city ??= token;
  }

  if (!city && !state && !country) return undefined;
  return {
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(country ? { country } : {}),
  };
}

export function assessJobEligibility(profile: CandidateProfile, jobText: string): JobEligibility {
  const findings = [
    locationFinding(profile, jobText),
    workModeFinding(profile, jobText),
    ...seniorityFindings(profile, jobText),
  ].filter((item): item is EligibilityFinding => item !== undefined);

  return { status: aggregate(findings), findings };
}

function aggregate(findings: readonly EligibilityFinding[]): EligibilityStatus {
  if (findings.some((item) => item.status === "ineligible")) return "ineligible";
  if (findings.some((item) => item.status === "unknown")) return "unknown";
  if (findings.length === 0) return "unknown";
  return "eligible";
}

function locationFinding(profile: CandidateProfile, jobText: string): EligibilityFinding | undefined {
  const text = withoutEmployerLocation(fold(jobText));
  const place = canonicalizeCandidateLocation(profile.facts ? profileLocation(profile) : profile.location);
  const relocation = relocationRequirement(text);
  const geo = geographicConstraint(text);
  const geoFinding = geographicFinding(geo, place);
  if (geoFinding.status === "ineligible") return geoFinding;

  if (relocation === "required" && profile.facts?.relocation !== true) {
    if (profile.facts?.relocation === false) {
      return {
        dimension: "location",
        status: "ineligible",
        reason: "A vaga exige relocação e o perfil registra recusa de relocação.",
        evidence: ["relocation required"],
      };
    }
    return {
      dimension: "location",
      status: "unknown",
      reason: "A vaga exige relocação e a preferência de relocação não foi respondida. Confirmação necessária.",
      evidence: ["relocation required"],
      requiresConfirmation: true,
    };
  }

  return geoFinding;
}

function geographicFinding(
  geo: GeoConstraint,
  place: CanonicalCandidateLocation | undefined,
): EligibilityFinding {
  if (geo.kind === "unstated") {
    return {
      dimension: "location",
      status: "unknown",
      reason: "A vaga não informa uma restrição geográfica confiável.",
      requiresConfirmation: true,
    };
  }

  if (geo.kind === "worldwide") {
    return {
      dimension: "location",
      status: "eligible",
      reason: "A vaga aceita trabalho remoto mundial. A sede do empregador não foi tratada como restrição.",
      evidence: ["worldwide"],
    };
  }

  if (!place?.country) {
    return {
      dimension: "location",
      status: "unknown",
      reason: "A vaga tem restrição geográfica, mas o local do perfil não foi resolvido.",
      requiresConfirmation: true,
    };
  }

  if (geo.kind === "region") {
    const allowed = geo.region === "LATAM" ? LATAM : EUROPE;
    if (allowed.has(place.country)) {
      return {
        dimension: "location",
        status: "eligible",
        reason: `O local do perfil (${place.country}) está na região exigida (${geo.region}).`,
        evidence: [geo.region],
      };
    }
    return {
      dimension: "location",
      status: "ineligible",
      reason: `A vaga restringe candidatos a ${geo.region}. O local do perfil é ${place.country}.`,
      evidence: [geo.region, place.country],
    };
  }

  if (geo.countries.includes(place.country)) {
    return {
      dimension: "location",
      status: "eligible",
      reason: `O local do perfil (${place.country}) atende a restrição geográfica da vaga.`,
      evidence: geo.countries,
    };
  }
  return {
    dimension: "location",
    status: "ineligible",
    reason: `A vaga restringe o local a ${geo.countries.join(", ")}. O local do perfil é ${place.country}.`,
    evidence: [...geo.countries, place.country],
  };
}

function workModeFinding(profile: CandidateProfile, jobText: string): EligibilityFinding | undefined {
  const mode = detectWorkMode(fold(jobText));
  if (mode === "unspecified") {
    return {
      dimension: "work_mode",
      status: "unknown",
      reason: "O modelo de trabalho da vaga não foi informado.",
      requiresConfirmation: true,
    };
  }
  const preference = profile.facts?.remotePreference;
  if (!preference) return undefined;
  if (modeSatisfies(mode, preference)) {
    return {
      dimension: "work_mode",
      status: "eligible",
      reason: `O modelo ${mode} é compatível com a preferência registrada (${preference}).`,
      evidence: [mode, preference],
    };
  }
  return {
    dimension: "work_mode",
    status: "unknown",
    reason: `A preferência registrada é ${preference}. A vaga é ${mode}. Isso é conflito de preferência, não uma recusa registrada.`,
    evidence: [mode, preference],
    requiresConfirmation: true,
  };
}

function seniorityFindings(profile: CandidateProfile, jobText: string): EligibilityFinding[] {
  const text = fold(jobText);
  const findings: EligibilityFinding[] = [];
  const years = recordedCareerYears(profile);
  const minimum = professionalMinimumYears(text);
  const elevated = elevatedTitle(text);

  if (minimum !== undefined) {
    if (years === undefined) {
      findings.push({
        dimension: "seniority",
        status: "unknown",
        reason: `A vaga pede no mínimo ${minimum} anos e o perfil não registra anos totais.`,
        evidence: [`${minimum}+ years`],
        requiresConfirmation: true,
      });
    } else if (years < minimum) {
      findings.push({
        dimension: "seniority",
        status: "ineligible",
        reason: `A vaga pede no mínimo ${minimum} anos. O perfil registra ${years} anos.`,
        evidence: [`${minimum}+ years`, `${years} years`],
      });
    } else if (!elevated) {
      findings.push({
        dimension: "seniority",
        status: "eligible",
        reason: `O perfil registra ${years} anos e a vaga pede no mínimo ${minimum}.`,
        evidence: [`${minimum}+ years`, `${years} years`],
      });
    }
  }

  if (elevated && (minimum === undefined || (years !== undefined && years >= minimum))) {
    findings.push({
      dimension: "seniority",
      status: "unknown",
      reason: `O título ${elevated} não foi tratado como Senior. Não há evidência suficiente do escopo e nenhum mínimo de anos foi inventado.`,
      evidence: [elevated],
      requiresConfirmation: true,
    });
  }

  if (requiresPeopleManagement(text)) {
    const founder = (profile.roles ?? []).some((role) => /\b(founder|co-founder|cofounder)\b/i.test(role));
    findings.push({
      dimension: "seniority",
      status: "unknown",
      reason: founder
        ? "A vaga pede gestão formal de pessoas. Experiência de founder não comprova essa gestão."
        : "A vaga pede gestão formal de pessoas. O perfil não registra essa evidência.",
      evidence: ["people management"],
      requiresConfirmation: true,
    });
  }

  return findings;
}

/**
 * Remote + optional short role noun(s) + based/located in|within + place.
 * Deliberately narrow: does not match bare "remote … LATAM" marketing across the posting.
 */
const REMOTE_BASED_IN_PREFIX =
  String.raw`\bremote(?:ly)?(?:\s+(?:role|position|opportunity|job|opening|engineer(?:ing)?|developer)){0,2}\s+(?:based|located)\s+(?:in|within)\s+`;

function geographicConstraint(text: string): GeoConstraint {
  const exclusive = exclusiveConstraint(text);
  if (exclusive) return exclusive;
  const allowed = remoteAllowList(text);
  if (allowed.length > 0) return { kind: "countries", countries: allowed };
  if (/\b(worldwide|work from anywhere|anywhere in the world|globally remote)\b/.test(text)) {
    return { kind: "worldwide" };
  }
  if (
    /\bremote(?:ly)?\s+(?:in\s+|within\s+|- )?(?:latam|latin america|america latina)\b/.test(text) ||
    /\b(?:latam|latin america|america latina) only\b/.test(text) ||
    /\bmust (?:reside|live|be located|be based) (?:in|within) (?:latam|latin america|america latina)\b/.test(text) ||
    new RegExp(`${REMOTE_BASED_IN_PREFIX}(?:latam|latin america|america latina)\\b`).test(text)
  ) {
    return { kind: "region", region: "LATAM" };
  }
  if (
    new RegExp(`${REMOTE_BASED_IN_PREFIX}(?:europe|the european union|the eu|european union)\\b`).test(text)
  ) {
    return { kind: "region", region: "Europe" };
  }
  for (const country of COUNTRY_NAMES) {
    for (const name of country.names) {
      const escaped = escapeRegExp(name);
      if (
        new RegExp(`\\b(?:remoto|remote)(?:ly)?\\s+(?:in\\s+|within\\s+|- )?(?:the\\s+)?${escaped}\\b`).test(text) ||
        new RegExp(`${REMOTE_BASED_IN_PREFIX}(?:the\\s+)?${escaped}\\b`).test(text)
      ) {
        return { kind: "countries", countries: [country.id] };
      }
    }
  }
  return { kind: "unstated" };
}

function exclusiveConstraint(text: string): GeoConstraint | undefined {
  if (
    /\b(?:europe|european union|eu) only\b/.test(text) ||
    /\bmust (?:reside|live|be located|be based) (?:in|within) (?:europe|the european union|the eu)\b/.test(text)
  ) {
    return { kind: "region", region: "Europe" };
  }
  for (const country of COUNTRY_NAMES) {
    for (const name of country.names) {
      const escaped = escapeRegExp(name);
      const exclusive = [
        new RegExp(`\\b${escaped} only\\b`),
        new RegExp(`\\b${escaped}-only\\b`),
        new RegExp(`\\bmust (?:reside|live|be located|be based) (?:in|within) (?:the\\s+)?${escaped}\\b`),
        new RegExp(`\\b(?:only|exclusively) (?:for )?(?:candidates|applicants) (?:in|from|based in) (?:the\\s+)?${escaped}\\b`),
        new RegExp(`\\bremote(?:ly)? (?:in|within) (?:the\\s+)?${escaped}\\b`),
      ];
      if (name === "united states" || name === "usa" || name === "u.s.") {
        exclusive.push(/\bus only\b/, /\bus-only\b/);
      }
      if (exclusive.some((pattern) => pattern.test(text))) {
        return { kind: "countries", countries: [country.id] };
      }
    }
  }
  return undefined;
}

function remoteAllowList(text: string): string[] {
  const found: string[] = [];
  for (const country of COUNTRY_NAMES) {
    for (const name of country.names) {
      const escaped = escapeRegExp(name);
      const pattern = new RegExp(`\\b${escaped}\\s*\\(\\s*remote\\s*\\)|\\b${escaped}\\s*-\\s*remote\\b`);
      if (pattern.test(text)) found.push(country.id);
    }
  }
  return [...new Set(found)];
}

function relocationRequirement(text: string): "required" | "not_required" | "unstated" {
  if (/\brelocation (?:is )?not required\b|\bno relocation\b/.test(text)) return "not_required";
  if (/\brelocation (?:is )?required\b|\bmust relocate\b|\brelocation to\b|\bwilling to relocate\b/.test(text)) {
    return "required";
  }
  return "unstated";
}

function detectWorkMode(text: string): "remote" | "hybrid" | "onsite" | "flexible" | "unspecified" {
  const negativeRemote = /\bno remote\b|\bnot remote\b/.test(text);
  const remote = !negativeRemote && /\b(remote|remoto|home office|work from home)\b/.test(text);
  const hybrid = /\b(hybrid|hibrido)\b/.test(text);
  const onsite = /\b(onsite|on-site|on site|in-office|in office|presencial)\b/.test(text) || negativeRemote;
  const stated = [remote, hybrid, onsite].filter(Boolean).length;
  if (/\b(?:remote or hybrid|hybrid or remote|flexible work|work model is flexible)\b/.test(text) || stated > 1) {
    return "flexible";
  }
  if (remote) return "remote";
  if (hybrid) return "hybrid";
  if (onsite) return "onsite";
  return "unspecified";
}

function modeSatisfies(mode: "remote" | "hybrid" | "onsite" | "flexible", preference: RemotePreference): boolean {
  if (preference === "flexible" || mode === "flexible") return true;
  return mode === preference;
}

function professionalMinimumYears(text: string): number | undefined {
  const cleaned = text
    .replace(/\d+\s*\+\s*years?\s+of\s+(?:direct\s+)?(?:people management|managing (?:people|direct reports)|direct reports)\b/g, " ")
    .replace(/\bminimum(?:\s+of)?\s+\d+\s+years?\s+of\s+(?:direct\s+)?(?:people management|direct reports)\b/g, " ");
  const patterns = [
    /(\d+)\s*\+\s*years?\s+of\s+professional\s+experience\b/g,
    /(\d+)\s*\+\s*years?\s+of\s+experience\b/g,
    /\bminimum(?:\s+of)?\s+(\d+)\s+years?\s+of\s+experience\b/g,
    /\bminimum(?:\s+of)?\s+(\d+)\s+years?(?!\s+of\b)/g,
    /\bat least\s+(\d+)\s+years?\s+of\s+(?:professional\s+)?experience\b/g,
    /(\d+)\s*\+\s*years?\s+required\b/g,
  ];
  let minimum: number | undefined;
  for (const pattern of patterns) {
    for (const match of cleaned.matchAll(pattern)) {
      const value = Number(match[1]);
      if (!Number.isFinite(value)) continue;
      minimum = minimum === undefined ? value : Math.max(minimum, value);
    }
  }
  return minimum;
}

function elevatedTitle(text: string): string | undefined {
  if (/\bengineering manager\b/.test(text)) return "Engineering Manager";
  if (/\bprincipal engineer\b/.test(text)) return "Principal";
  if (/\bstaff engineer\b/.test(text)) return "Staff";
  if (/\bhead of (?:technology|engineering)\b/.test(text)) return "Head";
  if (/\b(?:tech lead|engineering lead|product engineering lead)\b/.test(text)) return "Lead";
  return undefined;
}

function requiresPeopleManagement(text: string): boolean {
  return /\b(?:people management|direct reports|managing people|managing direct reports)\b/.test(text);
}

function recordedCareerYears(profile: CandidateProfile): number | undefined {
  return typeof profile.facts?.totalYearsExperience === "number" ? profile.facts.totalYearsExperience : undefined;
}

function withoutEmployerLocation(text: string): string {
  return text
    .replace(/\b(?:company\s+)?headquartered in\b[^.]+/g, " ")
    .replace(/\bour (?:company|office|headquarters) (?:is )?in\b[^.]+/g, " ");
}

function countryFromToken(token: string): string | undefined {
  return COUNTRY_NAMES.find((country) => country.names.includes(token))?.id;
}

function fold(text: string): string {
  return normalizeJobTextForIntel(text).replace(/[—–]/g, "-");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import { normalizeJobDescriptionEncoding } from "./job-description-quality.js";
import { normalizeJobTextForIntel } from "./job-intelligence.js";
import { postingSeniority, type PostingSeniority, type RoleLevel } from "./job-seniority.js";
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
  "Finland",
  "France",
  "Germany",
  "Ireland",
  "Italy",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Spain",
  "Sweden",
  "United Kingdom",
]);

const SOUTH_AMERICA = new Set([
  "Argentina",
  "Bolivia",
  "Brazil",
  "Chile",
  "Colombia",
  "Ecuador",
  "Paraguay",
  "Peru",
  "Uruguay",
  "Venezuela",
]);

const NORTH_AMERICA = new Set(["United States", "Canada", "Mexico"]);

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
  { id: "Uruguay", names: ["uruguay"] },
  { id: "Peru", names: ["peru"] },
  { id: "Canada", names: ["canada"] },
  { id: "Portugal", names: ["portugal"] },
  { id: "Spain", names: ["spain", "espana"] },
  { id: "France", names: ["france"] },
  { id: "Netherlands", names: ["netherlands"] },
  { id: "Poland", names: ["poland"] },
  { id: "Romania", names: ["romania"] },
  { id: "Finland", names: ["finland"] },
  { id: "United Kingdom", names: ["united kingdom", "uk"] },
  { id: "Ireland", names: ["ireland"] },
];

/** Adjective and city forms that name exactly one country. */
const COUNTRY_ALIASES: { id: string; pattern: RegExp }[] = [
  { id: "Brazil", pattern: /\bbrazilian (?:city|state|resident|territory)\b|\bbrazil-based\b/ },
];

type Region = "LATAM" | "South America" | "North America" | "Europe";

const REGION_MEMBERS: Record<Region, Set<string>> = {
  LATAM,
  "South America": SOUTH_AMERICA,
  "North America": NORTH_AMERICA,
  Europe: EUROPE,
};

const REGION_NAMES: { id: Region; pattern: string }[] = [
  { id: "LATAM", pattern: "latam|latin america|america latina|latinoamerica" },
  { id: "South America", pattern: "south america|america do sul|sudamerica" },
  { id: "North America", pattern: "north america" },
  { id: "Europe", pattern: "europe|the european union|european union|the eu" },
];

type GeoConstraint =
  | { kind: "worldwide"; excluded: string[] }
  | { kind: "places"; countries: string[]; regions: Region[]; excluded: string[] }
  | { kind: "unstated"; excluded: string[] };

export type JobEligibilityOptions = {
  /** Posting title from a structured field. Preferred over titles quoted in the body. */
  title?: string;
  /** Posting location from a structured field (ATS metadata). */
  location?: string;
};

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

export function assessJobEligibility(
  profile: CandidateProfile,
  jobText: string,
  options: JobEligibilityOptions = {},
): JobEligibility {
  const text = normalizeJobDescriptionEncoding(jobText);
  const findings = [
    locationFinding(profile, text, options),
    workModeFinding(profile, text, options),
    ...seniorityFindings(profile, text, options),
  ].filter((item): item is EligibilityFinding => item !== undefined);

  return { status: aggregate(findings), findings };
}

function aggregate(findings: readonly EligibilityFinding[]): EligibilityStatus {
  if (findings.some((item) => item.status === "ineligible")) return "ineligible";
  if (findings.some((item) => item.status === "unknown")) return "unknown";
  if (findings.length === 0) return "unknown";
  return "eligible";
}

function locationFinding(
  profile: CandidateProfile,
  jobText: string,
  options: JobEligibilityOptions,
): EligibilityFinding | undefined {
  const text = withoutEmployerLocation(fold(jobText));
  const place = canonicalizeCandidateLocation(profile.facts ? profileLocation(profile) : profile.location);
  const relocation = relocationRequirement(text);
  const textGeo = geographicConstraint(text, locationLines(jobText));
  const metadata = options.location?.trim();
  const metadataGeo = metadata ? constraintFromLocationField(metadata) : undefined;
  const geoFinding = withTimezone(
    reconcileGeography(textGeo, metadataGeo, metadata, place, jobText),
    timezoneRequirement(text),
  );
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
  if (place?.country && geo.excluded.includes(place.country)) {
    return {
      dimension: "location",
      status: "ineligible",
      reason: `A vaga exclui explicitamente ${place.country}.`,
      evidence: [`excluded: ${geo.excluded.join(", ")}`],
    };
  }

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
      reason:
        geo.excluded.length > 0
          ? `A vaga aceita trabalho remoto mundial, exceto ${geo.excluded.join(", ")}.`
          : "A vaga aceita trabalho remoto mundial. A sede do empregador não foi tratada como restrição.",
      evidence: ["worldwide", ...geo.excluded.map((item) => `excluded: ${item}`)],
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

  const allowedLabels = [...geo.countries, ...geo.regions];
  const byCountry = geo.countries.includes(place.country);
  const byRegion = geo.regions.find((region) => REGION_MEMBERS[region].has(place.country as string));
  if (byCountry || byRegion) {
    return {
      dimension: "location",
      status: "eligible",
      reason: byCountry
        ? `O local do perfil (${place.country}) atende a restrição geográfica da vaga.`
        : `O local do perfil (${place.country}) está na região exigida (${byRegion}).`,
      evidence: allowedLabels,
    };
  }
  return {
    dimension: "location",
    status: "ineligible",
    reason:
      geo.countries.length === 0 && geo.regions.length === 1
        ? `A vaga restringe candidatos a ${geo.regions[0]}. O local do perfil é ${place.country}.`
        : `A vaga restringe o local a ${allowedLabels.join(", ")}. O local do perfil é ${place.country}.`,
    evidence: [...allowedLabels, place.country],
  };
}

/**
 * Text and ATS metadata are separate sources. Agreement keeps the result; a
 * disagreement, or remote metadata against an office requirement in the text,
 * stays unknown and asks for confirmation.
 */
function reconcileGeography(
  textGeo: GeoConstraint,
  metadataGeo: GeoConstraint | undefined,
  metadata: string | undefined,
  place: CanonicalCandidateLocation | undefined,
  jobText: string,
): EligibilityFinding {
  const fromText = geographicFinding(textGeo, place);
  if (!metadata || !metadataGeo) return fromText;

  const office = officeRequirement(fold(jobText));
  if (office && /\bremote\b/.test(fold(metadata)) && !/\bhybrid|on-?site|office\b/.test(fold(metadata))) {
    return {
      dimension: "location",
      status: "unknown",
      reason: `Os metadados indicam remoto (${metadata}), mas o texto exige presença em escritório (${office}). Confirmação necessária.`,
      evidence: [`metadata: ${metadata}`, `text: ${office}`],
      requiresConfirmation: true,
    };
  }

  const fromMetadata = geographicFinding(metadataGeo, place);
  if (textGeo.kind === "unstated" && textGeo.excluded.length === 0) {
    return {
      ...fromMetadata,
      reason: `${fromMetadata.reason} Fonte: localização estruturada da vaga (${metadata}).`,
      evidence: [...(fromMetadata.evidence ?? []), `metadata: ${metadata}`],
    };
  }
  if (metadataGeo.kind === "unstated" || fromText.status === fromMetadata.status) return fromText;
  if (fromText.status === "ineligible" && textGeo.excluded.length > 0) return fromText;
  return {
    dimension: "location",
    status: "unknown",
    reason: `Texto e metadados de localização divergem (texto: ${fromText.status}; metadados: ${metadata}). Confirmação necessária.`,
    evidence: [...(fromText.evidence ?? []), `metadata: ${metadata}`],
    requiresConfirmation: true,
  };
}

function withTimezone(finding: EligibilityFinding, timezone: string | undefined): EligibilityFinding {
  if (!timezone) return finding;
  return {
    ...finding,
    reason: `${finding.reason} Fuso exigido: ${timezone} (disponibilidade de horário é confirmada à parte).`,
    evidence: [...(finding.evidence ?? []), `timezone: ${timezone}`],
  };
}

function workModeFinding(
  profile: CandidateProfile,
  jobText: string,
  options: JobEligibilityOptions,
): EligibilityFinding | undefined {
  const textMode = detectWorkMode(fold(jobText));
  const mode = textMode === "unspecified" && options.location ? detectWorkMode(fold(options.location)) : textMode;
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

function seniorityFindings(
  profile: CandidateProfile,
  jobText: string,
  options: JobEligibilityOptions,
): EligibilityFinding[] {
  const text = fold(jobText);
  const findings: EligibilityFinding[] = [];
  const years = recordedCareerYears(profile);
  const minimum = professionalMinimumYears(text);
  const elevated = elevatedTitle(postingSeniority({ title: options.title, text: jobText }));

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

function places(countries: string[], regions: Region[] = []): GeoConstraint {
  return { kind: "places", countries: [...new Set(countries)], regions: [...new Set(regions)], excluded: [] };
}

function geographicConstraint(text: string, locationFields: readonly string[] = []): GeoConstraint {
  const excluded = excludedCountries(text);
  const stated = statedConstraint(text, locationFields);
  return { ...stated, excluded: [...new Set([...stated.excluded, ...excluded])] };
}

function statedConstraint(text: string, locationFields: readonly string[]): GeoConstraint {
  const exclusive = exclusiveConstraint(text);
  if (exclusive) return exclusive;
  const allowed = remoteAllowList(text);
  if (allowed.length > 0) return places(allowed);
  for (const field of locationFields) {
    const fromField = constraintFromLocationField(field);
    if (fromField.kind !== "unstated") return fromField;
  }
  if (/\b(worldwide|work from anywhere|anywhere in the world|globally remote)\b/.test(text)) {
    return { kind: "worldwide", excluded: [] };
  }
  const regions = REGION_NAMES.filter((region) => regionStated(text, region.pattern)).map((region) => region.id);
  const countries = COUNTRY_NAMES.filter((country) => country.names.some((name) => countryStated(text, name))).map(
    (country) => country.id,
  );
  for (const alias of COUNTRY_ALIASES) {
    if (alias.pattern.test(text)) countries.push(alias.id);
  }
  if (regions.length > 0 || countries.length > 0) return places(countries, regions);
  return { kind: "unstated", excluded: [] };
}

const PLACE_PREPOSITION = String.raw`(?:in\s+|within\s+|across\s+|from\s+|- |-|,\s*|\(\s*|:\s*|\|\s*)?(?:the\s+)?`;

function regionStated(text: string, pattern: string): boolean {
  const name = `(?:${pattern})`;
  return [
    new RegExp(`\\bremote(?:ly)?\\s*${PLACE_PREPOSITION}${name}\\b`),
    new RegExp(`\\b${name}\\s*(?:[,(|-]\\s*)?\\(?\\s*remote\\b`),
    new RegExp(`\\b${name} only\\b`),
    new RegExp(`\\bmust (?:reside|live|be located|be based) (?:in|within) (?:the\\s+)?${name}\\b`),
    new RegExp(`${REMOTE_BASED_IN_PREFIX}(?:the\\s+)?${name}\\b`),
    new RegExp(
      `\\b(?:candidates|applicants|engineers|people|talent)\\s+(?:based|located|living|residing)\\s+(?:in|within|across)\\s+(?:the\\s+)?${name}\\b`,
    ),
  ].some((rx) => rx.test(text));
}

function countryStated(text: string, name: string): boolean {
  const escaped = escapeRegExp(name);
  return [
    new RegExp(`\\b(?:remoto|remote)(?:ly)?\\s*${PLACE_PREPOSITION}${escaped}\\b`),
    new RegExp(`\\b${escaped}\\s*(?:[,(|-]\\s*)?\\(?\\s*(?:remote|remoto)\\b`),
    new RegExp(`${REMOTE_BASED_IN_PREFIX}(?:the\\s+)?${escaped}\\b`),
    new RegExp(
      `\\b(?:must be|candidates|applicants|you are|you're|you must be)\\s+(?:based|located|residing) in (?:the\\s+)?${escaped}\\b`,
    ),
  ].some((rx) => rx.test(text));
}

/** "Location: Remote (Brazil) · Reporting To: …" lines, read before whitespace folding. */
function locationLines(jobText: string): string[] {
  const out: string[] = [];
  for (const line of jobText.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:job\s+)?(?:location|localiza[cç][aã]o|local)\s*:\s*(.+)$/i);
    const value = match?.[1]?.split(/[·•]/)[0]?.trim();
    if (value) out.push(value);
  }
  return out;
}

/** Parses a structured location value such as "Remote - North America - South America" or "Recife, Brazil". */
function constraintFromLocationField(raw: string): GeoConstraint {
  const folded = fold(raw);
  if (!folded) return { kind: "unstated", excluded: [] };
  const excluded = excludedCountries(folded);
  const withoutExclusions = folded.replace(/\((?:excluding|except)[^)]*\)|\b(?:excluding|except)\b.*$/g, " ");
  if (/\b(worldwide|anywhere|global(?:ly)?)\b/.test(withoutExclusions)) return { kind: "worldwide", excluded };
  const regions = REGION_NAMES.filter((region) => new RegExp(`\\b(?:${region.pattern})\\b`).test(withoutExclusions)).map(
    (region) => region.id,
  );
  const countries = COUNTRY_NAMES.filter((country) =>
    country.names.some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(withoutExclusions)),
  ).map((country) => country.id);
  const tokens = withoutExclusions.split(/[,/;|()]|\s-\s/).map((token) => token.trim()).filter(Boolean);
  if (tokens.some((token) => BRAZIL_STATE_NAMES[token] || BRAZIL_STATE_CODES.has(token))) countries.push("Brazil");
  if (regions.length === 0 && countries.length === 0) return { kind: "unstated", excluded };
  return { ...places(countries, regions), excluded };
}

function excludedCountries(text: string): string[] {
  const out: string[] = [];
  const lists = text.matchAll(
    /\b(?:excluding|except(?:\s+for)?|other than|not (?:available|open|eligible) (?:in|to candidates in|for candidates in))\s+([a-z][a-z .,]{1,80}?)(?=[).;:]|$)/g,
  );
  for (const match of lists) {
    const list = match[1] ?? "";
    for (const country of COUNTRY_NAMES) {
      if (country.names.some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(list))) out.push(country.id);
    }
  }
  for (const country of COUNTRY_NAMES) {
    for (const name of country.names) {
      if (new RegExp(`\\b${escapeRegExp(name)} (?:is )?excluded\\b`).test(text)) out.push(country.id);
    }
  }
  return [...new Set(out)];
}

/** Office presence the text requires ("hybrid … in our Lisbon office"). */
function officeRequirement(text: string): string | undefined {
  if (!/\b(hybrid|hibrido|on-?site|in-office|presencial)\b/.test(text)) return undefined;
  const office = text.match(/\b(?:in|at|from) our ([a-z][a-z .]{1,40}?) (?:office|offices|hq|headquarters)\b|\boffices? in ([a-z][a-z .,]{1,40}?)(?=[.;]|$)/);
  return (office?.[1] ?? office?.[2])?.trim();
}

function timezoneRequirement(text: string): string | undefined {
  const match = text.match(
    /\b(?:us|u\.s\.|eastern|pacific|central european|cet|est|pst|brt)\s+(?:business hours|working hours|time ?zones?|hours)\b|\boverlap (?:with )?(?:the )?(?:us|u\.s\.|eastern|pacific)[a-z ]{0,30}\b/,
  );
  return match?.[0]?.trim();
}

function exclusiveConstraint(text: string): GeoConstraint | undefined {
  if (
    /\b(?:europe|european union|eu) only\b/.test(text) ||
    /\bmust (?:reside|live|be located|be based) (?:in|within) (?:europe|the european union|the eu)\b/.test(text)
  ) {
    return places([], ["Europe"]);
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
        return places([country.id]);
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

const ELEVATED_LABELS: Partial<Record<RoleLevel, string>> = {
  manager: "Engineering Manager",
  principal: "Principal",
  staff: "Staff",
  lead: "Lead",
};

/**
 * Elevated only when the posting's own title (or a title-like line) says so.
 * Managers named in responsibilities ("partner with the engineering manager") are ignored.
 * "Senior / Staff" accepts Senior, so it is not elevated.
 */
function elevatedTitle(posted: PostingSeniority): string | undefined {
  if (posted.level === "unknown") return undefined;
  return ELEVATED_LABELS[posted.level];
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

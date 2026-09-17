import {
  computeCopilotJobMatch,
  type CopilotRoleFit,
  type JobMatchResult,
} from "./copilot-job-match.js";
import { extractJobIntelligence, normalizeJobTextForIntel, type JobIntelligence } from "./job-intelligence.js";
import type { CandidateProfile } from "./profile-schema.js";

export const RESUME_TRACKS = [
  "ats_master",
  "fullstack",
  "frontend",
  "product_engineer",
  "automation_rpa",
] as const;

export type ResumeTrack = (typeof RESUME_TRACKS)[number];

export type ResumeTrackConfidence = "high" | "medium" | "low";

export type ResumeRecommendation = {
  track: ResumeTrack;
  confidence: ResumeTrackConfidence;
  reasons: string[];
};

export const RESUME_TRACK_LABELS_PT: Record<ResumeTrack, string> = {
  ats_master: "ATS Master",
  fullstack: "Full Stack",
  frontend: "Frontend",
  product_engineer: "Product Engineer",
  automation_rpa: "Automation / RPA",
};

function has(folded: string, re: RegExp): boolean {
  return re.test(folded);
}

function atsFormSignal(folded: string): boolean {
  return has(
    folded,
    /\bats\b|\bapplicant tracking\b|\bworkday\b|\bi-?cims\b|\btaleo\b|\bsuccessfactors\b|\bformul[aá]rio automat|\bautomated screening\b|\beasy apply\b/,
  );
}

function rankTracks(fit: CopilotRoleFit, folded: string, intel: JobIntelligence): { track: ResumeTrack; score: number }[] {
  const frontendDominant =
    intel.roleType === "frontend" ||
    (has(folded, /\bfront(?:\s*[\-]?end)?\b/) && !has(folded, /\bfull\s*[\-]?\s*stack\b|\bnode(?:\.|\s)?js\b|\bbackend\b/));
  const fullstackSignal =
    intel.roleType === "fullstack" ||
    (has(folded, /\breact\b/) && has(folded, /\bnode(?:\.|\s)?js\b|\bbackend\b|\bapi\b|\bpostgresql\b/)) ||
    has(folded, /\bfull\s*[\-]?\s*stack\b/);
  const productSignal = has(
    folded,
    /\bproduct engineer\b|\bownership\b|\bdiscovery\b|\bend[\s-]?to[\s-]?end\b|\bsaas\b|\b0[\s-]?to[\s-]?1\b/,
  );
  const autoSignal = has(folded, /\brpa\b|\bselenium\b|\bplaywright\b|\bautomation engineer\b|\bpython\b.*\brpa\b/);

  const ranked: { track: ResumeTrack; score: number }[] = [
    { track: "automation_rpa", score: fit.automationRpa + (autoSignal ? 18 : 0) },
    { track: "product_engineer", score: fit.productEngineer + (productSignal ? 16 : 0) },
    { track: "fullstack", score: fit.fullstack + (fullstackSignal ? 14 : 0) },
    { track: "frontend", score: fit.frontend + (frontendDominant ? 16 : 0) - (fullstackSignal ? 12 : 0) },
    { track: "ats_master", score: 48 + (atsFormSignal(folded) ? 22 : 0) + (intel.roleType === "unknown" ? 8 : 0) },
  ];

  return ranked.sort((a, b) => b.score - a.score || a.track.localeCompare(b.track));
}

function confidenceFromDelta(best: number, second: number): ResumeTrackConfidence {
  const delta = best - second;
  if (delta >= 14 && best >= 70) return "high";
  if (delta >= 7 || best >= 62) return "medium";
  return "low";
}

function reasonsFor(track: ResumeTrack, folded: string, fit: CopilotRoleFit): string[] {
  const out: string[] = [];
  if (track === "ats_master") {
    if (atsFormSignal(folded)) out.push("Formulário / ATS automatizado");
    else out.push("Vaga genérica — variante ATS é a mais segura");
  }
  if (track === "frontend") {
    if (has(folded, /\breact\b/)) out.push("React");
    if (has(folded, /\btypescript\b/)) out.push("TypeScript");
    if (has(folded, /\bnext(?:\.|\s)?js\b/)) out.push("Next.js");
    if (has(folded, /\bfront(?:\s*[\-]?end)?\b/)) out.push("Papel frontend dominante");
  }
  if (track === "fullstack") {
    if (has(folded, /\breact\b/)) out.push("React");
    if (has(folded, /\btypescript\b/)) out.push("TypeScript");
    if (has(folded, /\bnode(?:\.|\s)?js\b/)) out.push("Node.js");
    if (has(folded, /\bapi\b|\brest\b|\bgraphql\b/)) out.push("APIs");
    if (has(folded, /\bpostgresql\b/)) out.push("PostgreSQL");
    if (has(folded, /\bfull\s*[\-]?\s*stack\b/)) out.push("Papel full stack");
  }
  if (track === "product_engineer") {
    if (has(folded, /\bownership\b/)) out.push("Ownership");
    if (has(folded, /\bsaas\b/)) out.push("SaaS");
    if (has(folded, /\bproduct\b/)) out.push("Produto");
    if (has(folded, /\bdiscovery\b/)) out.push("Discovery");
    if (has(folded, /\bend[\s-]?to[\s-]?end\b/)) out.push("End-to-end");
  }
  if (track === "automation_rpa") {
    if (has(folded, /\bpython\b/)) out.push("Python");
    if (has(folded, /\brpa\b/)) out.push("RPA");
    if (has(folded, /\bselenium\b/)) out.push("Selenium");
    if (has(folded, /\bplaywright\b/)) out.push("Playwright");
    if (has(folded, /\bautomation\b/)) out.push("Automação");
  }
  if (out.length === 0) {
    out.push(`Maior aderência na trilha (${RESUME_TRACK_LABELS_PT[track]})`);
  }
  void fit;
  return out.slice(0, 6);
}

export function recommendResumeTrack(input: {
  profile: CandidateProfile;
  jobText: string;
  intel?: JobIntelligence;
  match?: JobMatchResult;
}): ResumeRecommendation {
  const intel = input.intel ?? extractJobIntelligence(input.jobText);
  const match = input.match ?? computeCopilotJobMatch(input.profile, input.jobText, intel);
  const folded = normalizeJobTextForIntel(input.jobText);
  const ranked = rankTracks(match.roleFit, folded, intel);
  const best = ranked[0]!;
  const second = ranked[1]!;

  let track = best.track;
  if (
    atsFormSignal(folded) &&
    !has(folded, /\brpa\b|\bselenium\b|\bproduct engineer\b|\bfull\s*[\-]?\s*stack\b|\bfront(?:\s*[\-]?end)?\b/)
  ) {
    track = "ats_master";
  } else if (has(folded, /\brpa\b|\bselenium\b/) && match.roleFit.automationRpa >= 48) {
    track = "automation_rpa";
  } else if (
    has(folded, /\bproduct engineer\b|\bownership\b/) &&
    has(folded, /\bsaas\b|\bdiscovery\b|\bend[\s-]?to[\s-]?end\b|\bproduct\b/) &&
    match.roleFit.productEngineer >= 50
  ) {
    track = "product_engineer";
  } else if (has(folded, /\breact\b/) && has(folded, /\bnode(?:\.|\s)?js\b/) && !has(folded, /\brpa\b|\bselenium\b/) && !has(folded, /\bproduct engineer\b/)) {
    track = "fullstack";
  } else if (
    (intel.roleType === "frontend" || has(folded, /\bfront(?:\s*[\-]?end)?\b/)) &&
    !has(folded, /\bnode(?:\.|\s)?js\b|\bfull\s*[\-]?\s*stack\b/)
  ) {
    track = "frontend";
  } else if (atsFormSignal(folded) && best.score < 70) {
    track = "ats_master";
  }

  const chosen = ranked.find((item) => item.track === track) ?? best;
  const runnerUp = ranked.find((item) => item.track !== track) ?? second;

  return {
    track,
    confidence: confidenceFromDelta(chosen.score, runnerUp.score),
    reasons: reasonsFor(track, folded, match.roleFit),
  };
}

import type { CareerSource } from "./career-analytics-types.js";
import { CAREER_SOURCES } from "./career-analytics-types.js";
import type { JobRequirementCategory } from "./job-requirement-types.js";

const SAFE_REQUIREMENT_ALIASES: Record<string, string> = {
  aws: "aws",
  "amazon web services": "aws",
  "amazon web service": "aws",
};

export function normalizeCareerSource(raw?: string | null): CareerSource {
  const text = (raw ?? "").trim().toLowerCase();
  if (!text) return "other";
  if (CAREER_SOURCES.includes(text as CareerSource)) return text as CareerSource;
  if (/\blinkedin\b/.test(text)) return "linkedin";
  if (/\bgupy\b/.test(text)) return "gupy";
  if (/\bjobgether\b/.test(text)) return "jobgether";
  if (/\breferral\b|\breferred\b|\bindica/.test(text)) return "referral";
  if (/\bdirect recruiter\b|\btalent partner\b|\binmail\b/.test(text)) return "direct_recruiter";
  if (/\bcareers?\b|\bgreenhouse\b|\blever\b|\bworkday\b/.test(text)) return "company_careers";
  if (/\bcommunity\b|\bdiscord\b|\bslack\b|\bmeetup\b/.test(text)) return "community";
  return "other";
}

export function normalizeRoleFamily(input: { title?: string; roleType?: string; specialization?: string }): string {
  const blob = [input.title, input.roleType, input.specialization].filter(Boolean).join(" ").toLowerCase();
  if (/\bproduct engineer\b|\bproduct engineering\b/.test(blob)) return "Product Engineer";
  if (/\bai engineer\b|\bml engineer\b/.test(blob)) return "AI Engineer";
  if (/\bpython backend\b|\bbackend python\b|\bsenior python\b/.test(blob)) return "Python Backend";
  if (/\bautomation\b|\brpa\b/.test(blob)) return "Automation";
  if (/\bfrontend\b.*\breact\b|\breact\b.*\bfrontend\b|\bfrontend react\b/.test(blob)) return "Frontend React";
  if (/\bbackend\b.*\bnode\b|\bnode\b.*\bbackend\b|\bbackend node\b/.test(blob)) return "Backend Node";
  if (/\bfull[\s-]?stack\b/.test(blob)) return /\bsenior\b/.test(blob) ? "Senior Full Stack" : "Full Stack";
  if (/\bfrontend\b/.test(blob)) return "Frontend React";
  if (/\bbackend\b/.test(blob)) return "Backend Node";
  return "Other";
}

export function normalizeRequirementKey(label: string, skillHint?: string): string {
  const raw = (skillHint ?? label).trim().toLowerCase().replace(/\s*\(\d+\+ years\)/i, "");
  const compact = raw.replace(/[^a-z0-9+# ]+/g, " ").replace(/\s+/g, " ").trim();
  if (SAFE_REQUIREMENT_ALIASES[compact]) return SAFE_REQUIREMENT_ALIASES[compact];
  if (/\bamazon web services\b/.test(compact) || compact === "aws") return "aws";
  return compact;
}

export function categoryFromKey(key: string, fallback?: JobRequirementCategory): JobRequirementCategory {
  if (key === "aws" || /\bcloud\b/.test(key)) return "cloud";
  if (/\bagent\b|\bllm\b|\bgenai\b/.test(key)) return "ai";
  return fallback ?? "other";
}

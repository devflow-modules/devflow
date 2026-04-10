import type { LeadData } from "@/modules/inbox/leadCrm";

export function parseLeadDataJson(raw: unknown): LeadData {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: LeadData = {};
  for (const k of ["name", "interest", "budget", "urgency"] as const) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

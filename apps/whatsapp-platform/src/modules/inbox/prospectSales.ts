/**
 * Prospecção comercial leve (DevFlow) — dados em `leadData.prospect` (JSON).
 * Sem migração de schema.
 */

export const SALES_STAGES = [
  "NEW",
  "CONTACTED",
  "REPLIED",
  "DIAGNOSIS_SCHEDULED",
  "DIAGNOSIS_DONE",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
  "NURTURE",
] as const;

export type SalesStage = (typeof SALES_STAGES)[number];

/** Legado (sprint anterior) → normalizado para `NEW` na leitura. */
const LEGACY_STAGE_MAP: Record<string, SalesStage> = {
  NEW_PROSPECT: "NEW",
};

export const PROSPECT_SOURCES = ["instagram", "maps", "linkedin", "referral", "website"] as const;

export type ProspectSource = (typeof PROSPECT_SOURCES)[number];

export const SOURCE_LABELS_PT: Record<ProspectSource, string> = {
  instagram: "Instagram",
  maps: "Google Maps",
  linkedin: "LinkedIn",
  referral: "Indicação",
  website: "Site",
};

/** Abreviatura para chip na lista do Inbox. */
export const SALES_STAGE_ABBREV: Record<SalesStage, string> = {
  NEW: "Novo",
  CONTACTED: "Contato",
  REPLIED: "Resposta",
  DIAGNOSIS_SCHEDULED: "Dx ag.",
  DIAGNOSIS_DONE: "Dx ok",
  PROPOSAL_SENT: "Proposta",
  WON: "Ganho",
  LOST: "Perdido",
  NURTURE: "Nutrir",
};

export const SALES_STAGE_LABELS_PT: Record<SalesStage, string> = {
  NEW: "Novo lead",
  CONTACTED: "Contato feito",
  REPLIED: "Respondeu",
  DIAGNOSIS_SCHEDULED: "Diagnóstico agendado",
  DIAGNOSIS_DONE: "Diagnóstico feito",
  PROPOSAL_SENT: "Proposta enviada",
  WON: "Fechado",
  LOST: "Perdido",
  NURTURE: "Nutrição",
};

/** Badge de etapa (cores pedidas). */
export const SALES_STAGE_BADGE_CLASS: Record<SalesStage, string> = {
  NEW: "bg-muted df-text-primary ring-1 ring-slate-300/90",
  CONTACTED: "bg-sky-200 text-sky-950 ring-1 ring-sky-300/80",
  REPLIED: "bg-violet-200 text-violet-950 ring-1 ring-violet-300/80",
  DIAGNOSIS_SCHEDULED: "bg-amber-200 text-amber-950 ring-1 ring-amber-300/80",
  DIAGNOSIS_DONE: "bg-amber-200 text-amber-950 ring-1 ring-amber-300/80",
  PROPOSAL_SENT: "bg-orange-200 text-orange-950 ring-1 ring-orange-300/80",
  WON: "bg-emerald-200 text-emerald-950 ring-1 ring-emerald-300/80",
  LOST: "bg-red-200 text-red-950 ring-1 ring-red-300/80",
  NURTURE: "bg-muted df-text-primary ring-1 ring-slate-300/80",
};

export type ProspectData = {
  companyName?: string;
  niche?: string;
  city?: string;
  source?: ProspectSource;
  salesStage?: SalesStage;
  nextFollowUpAt?: string;
  nextStep?: string;
  pain?: string;
  attendantsCount?: string;
  estimatedVolume?: string;
  proposalValue?: number;
};

function trimStr(v: unknown, max = 500): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

function parseProposalValue(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const normalized = v.replace(/\s/g, "").replace(",", ".");
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function attendantsNumericForScore(p: ProspectData | undefined): number | undefined {
  if (!p?.attendantsCount?.trim()) return undefined;
  const n = parseInt(p.attendantsCount.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

export function isSalesStage(v: unknown): v is SalesStage {
  return typeof v === "string" && (SALES_STAGES as readonly string[]).includes(v);
}

export function normalizeSalesStage(raw: unknown): SalesStage | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const s = raw.trim();
  if ((SALES_STAGES as readonly string[]).includes(s)) return s as SalesStage;
  const legacy = LEGACY_STAGE_MAP[s];
  return legacy;
}

export function isProspectSource(v: unknown): v is ProspectSource {
  return typeof v === "string" && (PROSPECT_SOURCES as readonly string[]).includes(v);
}

/** Interpreta `prospect` vindo de JSON genérico (leadData). */
export function parseProspectFromUnknown(raw: unknown): ProspectData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const companyName = trimStr(o.companyName, 200);
  const niche = trimStr(o.niche, 200);
  const city = trimStr(o.city, 120);
  const rawSource = trimStr(o.source, 64)?.toLowerCase();
  const source = rawSource && isProspectSource(rawSource) ? (rawSource as ProspectSource) : undefined;
  const pain = trimStr(o.pain, 800);
  const estimatedVolume = trimStr(o.estimatedVolume, 200);
  const nextStep = trimStr(o.nextStep, 500);
  const nextFollowUpAt = trimStr(o.nextFollowUpAt, 48);
  const attendantsCount = trimStr(o.attendantsCount, 80);
  const proposalValue = parseProposalValue(o.proposalValue);
  const salesStage = normalizeSalesStage(o.salesStage);

  const out: ProspectData = {};
  if (companyName) out.companyName = companyName;
  if (niche) out.niche = niche;
  if (city) out.city = city;
  if (source) out.source = source;
  if (pain) out.pain = pain;
  if (estimatedVolume) out.estimatedVolume = estimatedVolume;
  if (nextStep) out.nextStep = nextStep;
  if (nextFollowUpAt) out.nextFollowUpAt = nextFollowUpAt;
  if (attendantsCount) out.attendantsCount = attendantsCount;
  if (proposalValue != null) out.proposalValue = proposalValue;
  if (salesStage) out.salesStage = salesStage;

  return Object.keys(out).length ? out : undefined;
}

type ProspectStringKey =
  | "companyName"
  | "niche"
  | "city"
  | "pain"
  | "estimatedVolume"
  | "nextStep"
  | "nextFollowUpAt"
  | "attendantsCount";

const PROSPECT_STRING_KEYS: ProspectStringKey[] = [
  "companyName",
  "niche",
  "city",
  "pain",
  "estimatedVolume",
  "nextStep",
  "nextFollowUpAt",
  "attendantsCount",
];

/** Merge profundo de prospect (PATCH / inbound preserva existente). */
export function mergeProspectData(
  existing: ProspectData | undefined,
  patch: Partial<ProspectData>
): ProspectData {
  const base: ProspectData = { ...(existing ?? {}) };

  for (const k of PROSPECT_STRING_KEYS) {
    if (!(k in patch)) continue;
    const raw = patch[k];
    if (raw === undefined) continue;
    const t = typeof raw === "string" ? raw.trim() : "";
    if (!t) {
      delete base[k];
    } else {
      const val = k === "attendantsCount" ? t.slice(0, 80) : t.length > 800 ? t.slice(0, 800) : t;
      if (k === "companyName") base.companyName = val;
      else if (k === "niche") base.niche = val;
      else if (k === "city") base.city = val;
      else if (k === "pain") base.pain = val;
      else if (k === "estimatedVolume") base.estimatedVolume = val;
      else if (k === "nextStep") base.nextStep = val;
      else if (k === "nextFollowUpAt") base.nextFollowUpAt = val;
      else if (k === "attendantsCount") base.attendantsCount = val;
    }
  }

  if ("source" in patch) {
    const s = patch.source;
    if (s === undefined) {
      /* skip */
    } else if (!s || !isProspectSource(s)) {
      delete base.source;
    } else {
      base.source = s;
    }
  }

  if ("salesStage" in patch) {
    const s = patch.salesStage;
    if (s === undefined) {
      /* skip */
    } else if (!s || !isSalesStage(s)) {
      delete base.salesStage;
    } else {
      base.salesStage = s;
    }
  }

  if ("proposalValue" in patch && patch.proposalValue !== undefined) {
    const v = patch.proposalValue;
    if (v === null || (typeof v === "number" && !Number.isFinite(v))) {
      delete base.proposalValue;
    } else if (typeof v === "number") {
      base.proposalValue = v;
    }
  }

  return base;
}

function lowerBlob(p: ProspectData | undefined, extra?: string): string {
  const parts = [p?.companyName, p?.niche, p?.source, p?.pain, p?.estimatedVolume, p?.nextStep, extra]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return parts;
}

/**
 * Score auxiliar de prospecção (não substitui `leadScore` da heurística de mensagens).
 */
export function computeProspectScore(p: ProspectData | undefined, messageHints?: string): number {
  if (!p && !messageHints?.trim()) return 0;
  const text = lowerBlob(p, messageHints ?? "");
  let score = 0;

  if (
    /\b(?:todo\s+(?:o\s+)?dia|todos\s+os\s+dias|diariamente|volume\s+alto|muitos\s+leads|chega\s+lead\s+todo\s+(?:o\s+)?dia)\b/i.test(
      text
    )
  ) {
    score += 30;
  }
  if (/\b(mais\s+de\s+um|2\s+atendentes|dois\s+atendentes|vários\s+atendentes|equipe\s+de\s+atendimento)\b/i.test(text)) {
    score += 25;
  }
  const ac = attendantsNumericForScore(p);
  if (ac != null && ac > 1) score += 25;

  if (
    /\b(?:perdi|perdemos|perdeu)\s+(?:um\s+)?cliente\b|\bperdeu\s+cliente\b|\bpor\s+causa\s+da\s+demora\b|\bperdeu\s+por\s+demora\b|\bdemora\s+no\s+atendimento\b/i.test(
      text
    )
  ) {
    score += 20;
  }

  if (/\b(?:tráfego\s+pago|trafego\s+pago|anúncios?\s+pagos|facebook\s+ads|google\s+ads|meta\s+ads)\b|\bads\b/i.test(text)) {
    score += 15;
  }

  if (
    /\b(?:whatsapp\s+(?:como\s+)?(?:é\s+)?(?:o\s+)?canal\s+principal|principal\s+canal\s+é\s+o\s+whatsapp|atendemos\s+só\s+no\s+whatsapp|whatsapp[^\n.]{0,40}canal\s+principal)\b/i.test(
      text
    )
  ) {
    score += 10;
  }

  if (/\b(autônomo|autonomo|só\s+eu|so\s+eu|trabalho\s+sozinho|sou\s+solo|sem\s+equipe)\b/i.test(text)) {
    score -= 20;
  }
  if (ac === 1 && !/\b(mais\s+de|vários|\d+\s+atendentes)\b/i.test(text)) {
    score -= 10;
  }

  if (/\b(só\s+quer|so\s+quer|apenas\s+testar|só\s+testar|testar\s+a\s+ferramenta|teste\s+de\s+ferramenta)\b/i.test(text)) {
    score -= 30;
  }

  return score;
}

/**
 * Follow-up em atraso ou agendado até ao fim do dia civil local (<= hoje 23:59:59).
 */
export function isFollowUpDueOrOverdue(iso: string | undefined): boolean {
  if (!iso?.trim()) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return d.getTime() <= endOfToday.getTime();
}

/** @deprecated usar `isFollowUpDueOrOverdue` */
export function isFollowUpDueToday(iso: string | undefined): boolean {
  return isFollowUpDueOrOverdue(iso);
}

export function prospectBadges(args: { prospect?: ProspectData }): { id: string; label: string; className: string }[] {
  const { prospect } = args;
  const badges: { id: string; label: string; className: string }[] = [];
  if (isFollowUpDueOrOverdue(prospect?.nextFollowUpAt)) {
    badges.push({
      id: "fu-due",
      label: "Follow-up hoje",
      className: "bg-red-100 text-red-950 ring-1 ring-red-300/90",
    });
  }
  return badges;
}

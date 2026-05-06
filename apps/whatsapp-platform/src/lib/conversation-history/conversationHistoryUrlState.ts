import type { HistoryPeriodPreset, HistoryPhaseFilter } from "./historyFetch";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Query params canónicos na página `/conversations`. */
export const HISTORY_URL_KEYS = {
  phase: "phase",
  /** Alias legível aceite na leitura (mesmos valores que `phase`). */
  phaseAlias: "status",
  preset: "preset",
  startDate: "startDate",
  endDate: "endDate",
  search: "search",
  line: "businessPhoneNumberId",
} as const;

const PHASE_VALUES = new Set<HistoryPhaseFilter>(["closed", "all", "awaiting_customer", "in_attendance"]);

const PRESET_TO_URL: Record<HistoryPeriodPreset, string> = {
  today: "TODAY",
  "7d": "LAST_7_DAYS",
  "30d": "LAST_30_DAYS",
  all: "ALL",
  custom: "CUSTOM",
};

const URL_TO_PRESET: Record<string, HistoryPeriodPreset> = {
  TODAY: "today",
  LAST_7_DAYS: "7d",
  LAST_30_DAYS: "30d",
  ALL: "all",
  CUSTOM: "custom",
};

export type ConversationHistoryUrlState = {
  phase: HistoryPhaseFilter;
  preset: HistoryPeriodPreset;
  customFrom: string;
  customTo: string;
  search: string;
  businessPhoneNumberId: string | null;
};

export const DEFAULT_HISTORY_URL_STATE: ConversationHistoryUrlState = {
  phase: "closed",
  preset: "all",
  customFrom: "",
  customTo: "",
  search: "",
  businessPhoneNumberId: null,
};

function normalizePhase(raw: string | null | undefined): HistoryPhaseFilter {
  const v = raw?.trim().toLowerCase();
  if (v && PHASE_VALUES.has(v as HistoryPhaseFilter)) return v as HistoryPhaseFilter;
  return "closed";
}

function normalizePresetToken(raw: string | null | undefined): HistoryPeriodPreset | null {
  const u = raw?.trim().toUpperCase();
  if (!u) return null;
  return URL_TO_PRESET[u] ?? null;
}

function validDate(d: string | undefined | null): string {
  const t = d?.trim() ?? "";
  return DATE_RE.test(t) ? t : "";
}

/**
 * Lê o estado de filtros a partir da query string da página de histórico.
 * Valores inválidos caem nos defaults seguros.
 */
export function parseConversationHistoryFiltersFromSearchParams(
  searchParams: URLSearchParams
): ConversationHistoryUrlState {
  const phaseRaw = searchParams.get(HISTORY_URL_KEYS.phase) ?? searchParams.get(HISTORY_URL_KEYS.phaseAlias);
  const phase = normalizePhase(phaseRaw);

  let preset = normalizePresetToken(searchParams.get(HISTORY_URL_KEYS.preset));
  const startRaw = validDate(searchParams.get(HISTORY_URL_KEYS.startDate));
  const endRaw = validDate(searchParams.get(HISTORY_URL_KEYS.endDate));

  if (!preset && (startRaw || endRaw)) {
    preset = "custom";
  }
  if (!preset) {
    preset = "all";
  }

  let customFrom = "";
  let customTo = "";
  if (preset === "custom") {
    customFrom = startRaw;
    customTo = endRaw;
  }

  const search = (searchParams.get(HISTORY_URL_KEYS.search) ?? "").trim().slice(0, 120);
  const line = (searchParams.get(HISTORY_URL_KEYS.line) ?? "").trim() || null;

  return {
    phase,
    preset,
    customFrom,
    customTo,
    search,
    businessPhoneNumberId: line,
  };
}

/**
 * Serializa o estado mínimo para a URL (omite defaults e strings vazias).
 */
export function buildConversationHistorySearchParams(state: ConversationHistoryUrlState): URLSearchParams {
  const p = new URLSearchParams();

  if (state.phase !== DEFAULT_HISTORY_URL_STATE.phase) {
    p.set(HISTORY_URL_KEYS.phase, state.phase);
  }

  if (state.preset !== DEFAULT_HISTORY_URL_STATE.preset) {
    p.set(HISTORY_URL_KEYS.preset, PRESET_TO_URL[state.preset]);
  }

  if (state.preset === "custom") {
    if (state.customFrom.trim()) p.set(HISTORY_URL_KEYS.startDate, state.customFrom.trim());
    if (state.customTo.trim()) p.set(HISTORY_URL_KEYS.endDate, state.customTo.trim());
  }

  if (state.search.trim()) {
    p.set(HISTORY_URL_KEYS.search, state.search.trim());
  }

  if (state.businessPhoneNumberId?.trim()) {
    p.set(HISTORY_URL_KEYS.line, state.businessPhoneNumberId.trim());
  }

  return p;
}

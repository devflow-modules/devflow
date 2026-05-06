import {
  fetchProtected,
  protectedApiUserMessage,
} from "@/lib/protected-fetch";
import type { WaInboxThreadRow } from "@/components/inbox/inboxTypes";

export type HistoryPhaseFilter = "closed" | "all" | "awaiting_customer" | "in_attendance";

async function historyFailMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    code?: string;
  };
  return protectedApiUserMessage(res.status, data);
}

export function buildHistoryConversationsUrl(opts: {
  phase: HistoryPhaseFilter;
  from?: string;
  to?: string;
  q?: string;
  /** Meta `phone_number_id` da linha; omitir = todas as linhas. */
  businessPhoneNumberId?: string;
  limit?: number;
  offset?: number;
}): string {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(Math.max(opts.limit ?? 80, 1), 200)));
  if (opts.offset) params.set("offset", String(opts.offset));
  params.set("phase", opts.phase);
  if (opts.from?.trim()) params.set("from", opts.from.trim());
  if (opts.to?.trim()) params.set("to", opts.to.trim());
  if (opts.q?.trim()) params.set("q", opts.q.trim().slice(0, 120));
  const lineId = opts.businessPhoneNumberId?.trim();
  if (lineId) params.set("businessPhoneNumberId", lineId);
  return `/api/inbox/conversations?${params.toString()}`;
}

export async function fetchConversationHistory(opts: {
  phase: HistoryPhaseFilter;
  from?: string;
  to?: string;
  q?: string;
  businessPhoneNumberId?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  threads: WaInboxThreadRow[];
  pagination: { limit: number; offset: number; total: number };
}> {
  const res = await fetchProtected(buildHistoryConversationsUrl(opts));
  if (!res.ok) throw new Error(await historyFailMessage(res));
  const json = (await res.json()) as {
    success: boolean;
    data: {
      threads: WaInboxThreadRow[];
      pagination: { limit: number; offset: number; total: number };
    };
  };
  return json.data;
}

export type HistoryPeriodPreset = "today" | "7d" | "30d" | "all" | "custom";

export function periodPresetToRange(preset: HistoryPeriodPreset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const end = new Date();
  const to = end.toISOString().slice(0, 10);
  if (preset === "today") return { from: to, to };
  const start = new Date(end);
  if (preset === "7d") start.setUTCDate(start.getUTCDate() - 7);
  if (preset === "30d") start.setUTCDate(start.getUTCDate() - 30);
  const from = start.toISOString().slice(0, 10);
  return { from, to };
}

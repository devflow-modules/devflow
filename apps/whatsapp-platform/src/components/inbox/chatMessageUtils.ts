import type { WaInboxMessageRow } from "./inboxTypes";

/** Chave estável do dia (timezone local) para agrupar a timeline. */
export function calendarDayKey(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return iso;
  }
}

export function daySeparatorLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Índice onde inserir o separador "não lidas" (aproximação: últimas N mensagens = unreadCount).
 */
export function firstUnreadSeparatorIndex(
  messages: WaInboxMessageRow[],
  unreadCount: number | undefined
): number | null {
  const n = unreadCount ?? 0;
  if (n <= 0 || messages.length === 0) return null;
  const idx = Math.max(0, messages.length - n);
  return idx >= messages.length ? null : idx;
}

export type DayGroup = { dayKey: string; label: string; messages: WaInboxMessageRow[] };

export function groupMessagesByCalendarDay(messages: WaInboxMessageRow[]): DayGroup[] {
  const out: DayGroup[] = [];
  let currentKey = "";
  let bucket: WaInboxMessageRow[] = [];
  for (const m of messages) {
    const key = calendarDayKey(m.ts);
    if (key !== currentKey) {
      if (bucket.length) {
        const firstTs = bucket[0].ts;
        out.push({
          dayKey: currentKey,
          label: daySeparatorLabel(firstTs),
          messages: bucket,
        });
      }
      currentKey = key;
      bucket = [m];
    } else {
      bucket.push(m);
    }
  }
  if (bucket.length) {
    const firstTs = bucket[0].ts;
    out.push({
      dayKey: currentKey,
      label: daySeparatorLabel(firstTs),
      messages: bucket,
    });
  }
  return out;
}

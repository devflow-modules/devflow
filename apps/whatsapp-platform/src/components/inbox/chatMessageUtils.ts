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

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Separador de dia na timeline — “Hoje”, “Ontem” ou data curta (timezone local). */
export function daySeparatorLabel(iso: string): string {
  try {
    const msg = new Date(iso);
    const todayStart = startOfLocalDay(new Date());
    const msgStart = startOfLocalDay(msg);
    const diffDays = Math.round((todayStart - msgStart) / 86_400_000);
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    return msg.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "short",
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

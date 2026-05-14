import type { SessionRecord } from "./types";

export type PracticeInsights = {
  totalSessions: number;
  topFreezeReason: { label: string; count: number } | null;
  avgConfidenceAfter: number | null;
  /** Sessões com reflexão “usei Keyboard Rescue”. */
  keyboardRescueYesCount: number;
};

/**
 * Agrega métricas simples para a home (sem gráficos).
 * `avgConfidenceAfter` só conta sessões com valor definido.
 */
export function computePracticeInsights(sessions: SessionRecord[]): PracticeInsights {
  const totalSessions = sessions.length;
  if (totalSessions === 0) {
    return { totalSessions: 0, topFreezeReason: null, avgConfidenceAfter: null, keyboardRescueYesCount: 0 };
  }

  const counts = new Map<string, number>();
  for (const s of sessions) {
    for (const r of s.freezeReasons ?? []) {
      const key = r.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  let topFreezeReason: { label: string; count: number } | null = null;
  for (const [label, count] of counts) {
    if (!topFreezeReason || count > topFreezeReason.count) {
      topFreezeReason = { label, count };
    } else if (topFreezeReason && count === topFreezeReason.count && label < topFreezeReason.label) {
      topFreezeReason = { label, count };
    }
  }

  const afterVals = sessions.map((s) => s.confidenceAfter).filter((n): n is number => typeof n === "number");
  const avgConfidenceAfter =
    afterVals.length > 0 ? Math.round((afterVals.reduce((a, b) => a + b, 0) / afterVals.length) * 10) / 10 : null;

  const keyboardRescueYesCount = sessions.filter((s) => s.keyboardRescueUsed === true).length;

  return { totalSessions, topFreezeReason, avgConfidenceAfter, keyboardRescueYesCount };
}

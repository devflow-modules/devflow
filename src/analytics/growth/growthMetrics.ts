/**
 * Métricas em memória para Growth Analytics (funil DevFlow).
 * Registra contadores devflow.*; preparado para integração com PostHog, Amplitude.
 */

const counters: Record<string, number> = {};

export function increment(metricName: string, delta = 1): void {
  counters[metricName] = (counters[metricName] ?? 0) + delta;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.debug("[growth.metrics]", "increment", metricName, "->", counters[metricName]);
  }
}

export function getCounters(): Record<string, number> {
  return { ...counters };
}

export function resetGrowthMetrics(): void {
  Object.keys(counters).forEach((k) => delete counters[k]);
}

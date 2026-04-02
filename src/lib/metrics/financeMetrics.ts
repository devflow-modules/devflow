/**
 * Contadores em memória para o dashboard admin (`/admin/metrics`, `/api/admin/metrics`).
 * Não faz parte do domínio Financeiro — ownership da plataforma (portal).
 */

const counters: Record<string, number> = {};
const gauges: Record<string, number> = {};
const values: Record<string, number[]> = {};

export function increment(metricName: string, delta = 1): void {
  counters[metricName] = (counters[metricName] ?? 0) + delta;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.debug("[admin.metrics]", "increment", metricName, "->", counters[metricName]);
  }
}

export function record(metricName: string, value: number): void {
  if (!values[metricName]) values[metricName] = [];
  values[metricName].push(value);
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.debug("[admin.metrics]", "record", metricName, value);
  }
}

export function gauge(metricName: string, value: number): void {
  gauges[metricName] = value;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.debug("[admin.metrics]", "gauge", metricName, value);
  }
}

export function getCounters(): Record<string, number> {
  return { ...counters };
}

export function getGauges(): Record<string, number> {
  return { ...gauges };
}

export function resetMetrics(): void {
  Object.keys(counters).forEach((k) => delete counters[k]);
  Object.keys(gauges).forEach((k) => delete gauges[k]);
  Object.keys(values).forEach((k) => delete values[k]);
}

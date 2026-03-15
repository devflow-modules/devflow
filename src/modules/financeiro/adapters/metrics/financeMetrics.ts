/**
 * Camada de métricas do módulo financeiro.
 * Inicialmente em memória/console; preparada para Prometheus, Datadog ou OpenTelemetry.
 */

const counters: Record<string, number> = {};
const gauges: Record<string, number> = {};
const values: Record<string, number[]> = {};

export function increment(metricName: string, delta = 1): void {
  counters[metricName] = (counters[metricName] ?? 0) + delta;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.debug("[finance.metrics]", "increment", metricName, "->", counters[metricName]);
  }
}

export function record(metricName: string, value: number): void {
  if (!values[metricName]) values[metricName] = [];
  values[metricName].push(value);
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.debug("[finance.metrics]", "record", metricName, value);
  }
}

export function gauge(metricName: string, value: number): void {
  gauges[metricName] = value;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.debug("[finance.metrics]", "gauge", metricName, value);
  }
}

/** Retorna contadores atuais (útil para testes e futura exportação). */
export function getCounters(): Record<string, number> {
  return { ...counters };
}

/** Retorna gauges atuais. */
export function getGauges(): Record<string, number> {
  return { ...gauges };
}

/** Reseta métricas (apenas para testes). */
export function resetMetrics(): void {
  Object.keys(counters).forEach((k) => delete counters[k]);
  Object.keys(gauges).forEach((k) => delete gauges[k]);
  Object.keys(values).forEach((k) => delete values[k]);
}

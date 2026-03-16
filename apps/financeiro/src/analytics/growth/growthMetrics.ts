/**
 * Re-export from shared analytics-core. Product-specific growth logic stays here.
 */
export { increment, getCounters, resetMetrics as resetGrowthMetrics } from "@devflow/analytics-core";

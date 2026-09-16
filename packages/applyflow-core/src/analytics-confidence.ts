import type { Confidence } from "./types.js";

export function confidenceFromSampleSize(n: number): Confidence {
  if (n < 5) return "low";
  if (n < 15) return "medium";
  return "high";
}

export function comparisonConfidence(left: number, right: number): Confidence {
  return confidenceFromSampleSize(Math.min(left, right));
}

export function safeRate(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : 0;
}

export function median(values: readonly number[]): number | undefined {
  const finite = values.filter((item) => Number.isFinite(item)).sort((a, b) => a - b);
  if (finite.length === 0) return undefined;
  const mid = Math.floor(finite.length / 2);
  return finite.length % 2 === 1 ? finite[mid] : (finite[mid - 1]! + finite[mid]!) / 2;
}

export function fitBandFor(score: number | undefined): "0-49" | "50-59" | "60-69" | "70-79" | "80-89" | "90-100" | undefined {
  if (typeof score !== "number" || !Number.isFinite(score)) return undefined;
  if (score < 50) return "0-49";
  if (score < 60) return "50-59";
  if (score < 70) return "60-69";
  if (score < 80) return "70-79";
  if (score < 90) return "80-89";
  return "90-100";
}

export function priorityBandFor(priority: number | undefined): "high" | "medium" | "low" | undefined {
  if (typeof priority !== "number" || !Number.isFinite(priority)) return undefined;
  if (priority >= 70) return "high";
  if (priority >= 40) return "medium";
  return "low";
}

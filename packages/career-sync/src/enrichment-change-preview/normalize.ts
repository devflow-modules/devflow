import type { SyncConfidence } from "../shared/types.js";
import {
  ENRICHMENT_CHANGE_PREVIEW_MAX_LIST_ITEMS,
  ENRICHMENT_CHANGE_PREVIEW_MAX_STRING_LENGTH,
  ENRICHMENT_CHANGE_PREVIEW_MIN_CONFIDENCE,
  type SafeDisplayValue,
} from "./types.js";

const CONFIDENCE_RANK: Record<SyncConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function normalizeCompanyHints(values: readonly string[]): string[] {
  const normalized = values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
}

export function normalizeSummaryText(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, ENRICHMENT_CHANGE_PREVIEW_MAX_STRING_LENGTH);
}

export function truncateSafeList(values: readonly string[]): string[] {
  return [...values]
    .map((value) => value.trim().slice(0, ENRICHMENT_CHANGE_PREVIEW_MAX_STRING_LENGTH))
    .filter((value) => value.length > 0)
    .sort((left, right) => left.localeCompare(right))
    .slice(0, ENRICHMENT_CHANGE_PREVIEW_MAX_LIST_ITEMS);
}

export function toSafeNumber(value: number | undefined | null): SafeDisplayValue {
  if (value == null || !Number.isFinite(value)) {
    return { kind: "empty" };
  }

  return { kind: "number", value };
}

export function toSafeString(value: string | undefined | null): SafeDisplayValue {
  if (value == null || value.trim().length === 0) {
    return { kind: "empty" };
  }

  return { kind: "string", value: normalizeSummaryText(value) };
}

export function toSafeList(values: readonly string[] | undefined | null): SafeDisplayValue {
  if (values == null || values.length === 0) {
    return { kind: "empty" };
  }

  const list = truncateSafeList(values);
  return list.length > 0 ? { kind: "list", value: list } : { kind: "empty" };
}

export function isEmptyDisplayValue(value: SafeDisplayValue): boolean {
  return value.kind === "empty";
}

export function displayValuesEqual(left: SafeDisplayValue, right: SafeDisplayValue): boolean {
  if (left.kind === "empty" && right.kind === "empty") {
    return true;
  }

  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "number" && right.kind === "number") {
    return left.value === right.value;
  }

  if (left.kind === "string" && right.kind === "string") {
    return left.value === right.value;
  }

  if (left.kind === "list" && right.kind === "list") {
    return (
      left.value.length === right.value.length &&
      left.value.every((entry, index) => entry === right.value[index])
    );
  }

  return false;
}

export function isListSuperset(
  current: readonly string[],
  suggested: readonly string[],
): boolean {
  if (current.length === 0 || suggested.length <= current.length) {
    return false;
  }

  const suggestedSet = new Set(suggested);
  return current.every((entry) => suggestedSet.has(entry));
}

export function areListsDisjointNonEmpty(
  current: readonly string[],
  suggested: readonly string[],
): boolean {
  if (current.length === 0 || suggested.length === 0) {
    return false;
  }

  const suggestedSet = new Set(suggested);
  return !current.some((entry) => suggestedSet.has(entry));
}

export function resolveLowestConfidence(
  values: readonly SyncConfidence[],
): SyncConfidence | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((lowest, current) =>
    CONFIDENCE_RANK[current] < CONFIDENCE_RANK[lowest] ? current : lowest,
  );
}

export function isConfidenceInsufficient(confidence: SyncConfidence | undefined): boolean {
  if (confidence == null) {
    return false;
  }

  return CONFIDENCE_RANK[confidence] < CONFIDENCE_RANK[ENRICHMENT_CHANGE_PREVIEW_MIN_CONFIDENCE];
}

export function serializeSafeDisplayValue(value: SafeDisplayValue): string | number | string[] | null {
  switch (value.kind) {
    case "empty":
      return null;
    case "number":
      return value.value;
    case "string":
      return value.value;
    case "list":
      return value.value;
  }
}
